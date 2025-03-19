import * as dotenv from 'dotenv';
import { Server as HttpServer, createServer } from 'node:http';
import { Socket, Server as SocketServer } from 'socket.io';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// SME Server Configuration
const PORT = 12345;
const WEBSOCKET_PATH = 'socket.io';
const VALID_PATH = 'valid';

const subtle = globalThis.crypto.subtle;

// SME Crypto Configuration
const ENCODING = 'base64' as const;
const EXPORTABLE = 'spki' as const;

// Get SME keys from environment variables
export const SME_PUBLIC_KEY = process.env.VITE_SME_PUBLIC_KEY!;
const SME_PRIVATE_KEY = process.env.VITE_SME_PRIVATE_KEY!;

if (!SME_PUBLIC_KEY || !SME_PRIVATE_KEY) {
    throw new Error('SME keys not found in environment variables');
}

const KEY_ALGORITHM = {
    name: 'ECDH',
    namedCurve: 'P-256',
} as const;

export const SME_CONFIG = {
    keyAlgorithm: KEY_ALGORITHM,
    encryptionAlgorithm: { name: 'AES-GCM', length: 256 },
    challengeEncoding: ENCODING,
} as const;

const KEY_USAGES = ['deriveBits', 'deriveKey'] as never;

const exportKey = async (key: CryptoKey, encoding = ENCODING) => {
    const exported = Buffer.from(
        await subtle.exportKey(EXPORTABLE, key),
    ).toString(encoding);
    return exported;
};

const importKey = async (
    keyEncoded: string,
    keyAlgorithm: KeyAlgorithm,
    exportable = true,
    usages: KeyUsage[] = [],
    encoding: BufferEncoding = ENCODING,
    format: Exclude<KeyFormat, 'jwk'> = EXPORTABLE,
) => {
    const imported = await subtle.importKey(
        format,
        Buffer.from(keyEncoded, encoding),
        keyAlgorithm,
        exportable,
        usages,
    );
    return imported;
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
                KEY_USAGES,
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

        socketClient.on('register', async (_: unknown, ack: () => void) => {
            ack();
        });

        socketClient.emit('challenge', {
            iv: ivBuf.toString(SME_CONFIG.challengeEncoding),
            challenge: encryptedChallengeBuf.toString(
                SME_CONFIG.challengeEncoding,
            ),
        });
    } catch (error) {
        console.error(
            `Error in initChallengeEndpoint for socket ID ${socketClient.id}:`,
            error,
        );
    }
};

// Type for global augmentation
declare global {
    // eslint-disable-next-line no-var
    var __smeServer: HttpServer;
    // eslint-disable-next-line no-var
    var __socketServer: SocketServer;
}

async function globalSetup() {
    const activeSockets: Record<string, Socket> = {};

    const initDataEndpoint = async (
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
                if (!activeSockets[peerId]) {
                    return;
                }
                activeSockets[peerId].emit('data', sessionId, data);
                acknowledge();
            },
        );
    };

    const httpServer = createServer((req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        res.writeHead(404);
        res.end('Not found');
    });

    const socketServer = new SocketServer(httpServer, {
        path: `/${WEBSOCKET_PATH}`,
        cors: {
            origin: '*',
            methods: ['GET', 'POST', 'DELETE'],
        },
    });

    const mainNamespace = socketServer.of('/' + VALID_PATH);

    mainNamespace.on('connection', async (client) => {
        const auth = !!client.handshake.auth.key;
        const clientPublicKey = auth
            ? await importClientPublicKey(client)
            : undefined;

        await initDataEndpoint(clientPublicKey, client);

        if (clientPublicKey) {
            await initChallengeEndpoint(clientPublicKey, client);
        }
    });

    await new Promise<void>((resolve) => {
        httpServer.listen(PORT, () => {
            console.log(`Mock SME server listening on port ${PORT}`);
            globalThis.__smeServer = httpServer;
            globalThis.__socketServer = socketServer;
            resolve();
        });
    });
}

export default globalSetup;
