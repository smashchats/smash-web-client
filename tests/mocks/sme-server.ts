import { createServer } from 'node:http';
import { URL as NodeURL } from 'node:url';
import { Server, Socket } from 'socket.io';

const HOSTNAME = 'localhost';
const PORT = 12345;

const API_PATH = 'api';
const WEBSOCKET_PATH = 'socket.io';
const VALID_PATH = 'valid';

export const apiServerUrl = `http://${HOSTNAME}:${PORT}/${API_PATH}`;
export const socketServerUrl = `http://${HOSTNAME}:${PORT}/${VALID_PATH}`;

// Mock SME configuration - matches the one used in smash-node-lib tests
export const SME_PUBLIC_KEY =
    'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEg6rwXUOg3N18rZlQRS8sCmKGuB4opGtTXvYi7DkXltVzK0rEVd91HgM7L9YEyTsM9ntJ8Ye+rHey0LiUZwFwAw==';

const SME_PRIVATE_KEY =
    'MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgeDOtDxdjN36dlxG7Z2Rh3E41crFpQEse0xaxBlaVRRWhRANCAASDqvBdQ6Dc3XytmVBFLywKYoa4Hiika1Ne9iLsOReW1XMrSsRV33UeAzsv1gTJOwz2e0nxh76sd7LQuJRnAXAD';

const KEY_ALGORITHM = {
    name: 'ECDH',
    namedCurve: 'P-256',
} as const;

export const SME_CONFIG = {
    keyAlgorithm: KEY_ALGORITHM,
    encryptionAlgorithm: { name: 'AES-GCM', length: 256 },
    challengeEncoding: 'base64' as const,
};

let httpServer: ReturnType<typeof createServer>;
let socketServer: Server;
const activeSockets: Record<string, Socket> = {};
const dataEvents: {
    peerId: string;
    sessionId: string;
    data: unknown;
    endpoint: string;
}[] = [];

const subtle = globalThis.crypto.subtle;

const exportKey = async (key: CryptoKey, encoding = 'base64') => {
    return Buffer.from(await subtle.exportKey('spki', key)).toString(encoding);
};

const importKey = async (
    keyEncoded: string,
    keyAlgorithm: KeyAlgorithm,
    exportable = true,
    usages: KeyUsage[] = [],
    encoding: BufferEncoding = 'base64',
    format: Exclude<KeyFormat, 'jwk'> = 'spki',
) => {
    return await subtle.importKey(
        format,
        Buffer.from(keyEncoded, encoding),
        keyAlgorithm,
        exportable,
        usages,
    );
};

const importClientPublicKey = async (socket: Socket) => {
    return await importKey(
        socket.handshake.auth.key,
        socket.handshake.auth.keyAlgorithm,
    );
};

const initChallengeEndpoint = async (
    clientPublicKey: CryptoKey,
    socketClient: Socket,
) => {
    try {
        const symKey = await subtle.deriveKey(
            {
                ...socketClient.handshake.auth.keyAlgorithm,
                public: clientPublicKey,
            },
            await importKey(
                SME_PRIVATE_KEY,
                KEY_ALGORITHM,
                true,
                ['deriveBits', 'deriveKey'],
                'base64',
                'pkcs8',
            ),
            SME_CONFIG.encryptionAlgorithm,
            false,
            ['encrypt', 'decrypt'],
        );
        
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const challenge = crypto.getRandomValues(new Uint8Array(12));
        const ivBuf = Buffer.from(iv);
        const challengeBuf = Buffer.from(challenge);
        
        const encryptedChallenge = await subtle.encrypt(
            {
                ...SME_CONFIG.encryptionAlgorithm,
                iv: iv,
            },
            symKey,
            challengeBuf,
        );
        
        const encryptedChallengeBuf = Buffer.from(encryptedChallenge);
        
        socketClient.on('register', async (_: unknown, ack: () => void | undefined) => {
            if (ack) ack();
        });
        
        socketClient.emit('challenge', {
            iv: ivBuf.toString(SME_CONFIG.challengeEncoding),
            challenge: encryptedChallengeBuf.toString(SME_CONFIG.challengeEncoding),
        });
    } catch (error) {
        console.error(
            `[Mock SME] Error in initChallengeEndpoint for socket ID ${socketClient.id}:`,
            error,
        );
    }
};

const initDataEndpoint = async (
    endpoint: string,
    clientPublicKey: CryptoKey | undefined,
    client: Socket,
) => {
    const clientKeyId = clientPublicKey
        ? await exportKey(clientPublicKey)
        : 'ANONYMOUS';
        
    if (clientPublicKey) {
        activeSockets[clientKeyId] = client;
        client.on('disconnect', async () => {
            delete activeSockets[clientKeyId];
        });
    }
    
    client.on(
        'data',
        async (
            peerId: string,
            sessionId: string,
            data: unknown,
            acknowledge: () => void,
        ) => {
            console.log('[Mock SME] Received data', { peerId, sessionId });
            
            if (!activeSockets[peerId]) {
                console.log('[Mock SME] No active socket for peer', peerId);
                return;
            }
            
            dataEvents.push({
                peerId,
                sessionId,
                data,
                endpoint,
            });
            
            // Forward the data to the target peer
            activeSockets[peerId].emit('data', sessionId, data);
            
            // Acknowledge receipt
            acknowledge();
        },
    );
};

export function startMockSmeServer() {
    if (httpServer) {
        return {
            server: httpServer,
            io: socketServer,
            port: PORT,
        };
    }
    
    httpServer = createServer((req, res) => {
        console.log('[Mock SME] HTTP request', {
            method: req.method,
            url: req.url,
        });
        
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }
        
        // Health check endpoint
        if (req.method === 'GET' && req.url === `/${API_PATH}/health`) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                status: 'ok', 
                activeConnections: Object.keys(activeSockets).length,
                dataEvents: dataEvents.length 
            }));
            return;
        }
        
        // Server info endpoint
        if (req.method === 'GET' && req.url === `/${API_PATH}/server-info`) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                activeSocketsCount: Object.keys(activeSockets).length,
                dataEventsCount: dataEvents.length,
            }));
            return;
        }
        
        res.writeHead(404);
        res.end('Not found');
    });
    
    socketServer = new Server(httpServer, {
        path: `/${WEBSOCKET_PATH}`,
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });
    
    // Set up the main namespace for SME communication
    const mainNamespace = socketServer.of('/' + VALID_PATH);
    
    mainNamespace.on('connection', async (client) => {
        console.log('[Mock SME] New connection', { socketId: client.id });
        
        const auth = !!client.handshake.auth.key;
        const clientPublicKey = auth
            ? await importClientPublicKey(client)
            : undefined;
            
        await initDataEndpoint(socketServerUrl, clientPublicKey, client);
        
        if (clientPublicKey) {
            await initChallengeEndpoint(clientPublicKey, client);
        }
    });
    
    httpServer.listen(PORT, HOSTNAME, () => {
        console.log(`[Mock SME] Server started on http://${HOSTNAME}:${PORT}`);
    });
    
    return {
        server: httpServer,
        io: socketServer,
        port: PORT,
    };
}

export async function stopMockSmeServer() {
    console.log('[Mock SME] Stopping server...');
    
    if (socketServer) {
        await new Promise<void>((resolve) => {
            socketServer.close(() => resolve());
        });
    }
    
    if (httpServer) {
        await new Promise<void>((resolve) => {
            httpServer.close(() => resolve());
        });
    }
    
    // Clear state
    Object.keys(activeSockets).forEach(key => delete activeSockets[key]);
    dataEvents.length = 0;
    
    console.log('[Mock SME] Server stopped');
}

export { PORT as SME_PORT, HOSTNAME as SME_HOSTNAME };