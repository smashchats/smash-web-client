import { createServer } from 'node:http';

const HOSTNAME = 'localhost';
const PORT = 12346;

export const nabServerUrl = `http://${HOSTNAME}:${PORT}`;

let httpServer: ReturnType<typeof createServer>;

// Simple in-memory store for NAB data
const nabStore = {
    members: new Map<string, any>(),
    profiles: new Map<string, any>(),
    relationships: new Map<string, Map<string, string>>(),
};

export function startMockNabServer() {
    if (httpServer) {
        return {
            server: httpServer,
            port: PORT,
        };
    }
    
    httpServer = createServer((req, res) => {
        console.log('[Mock NAB] HTTP request', {
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
        if (req.method === 'GET' && req.url === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                status: 'ok',
                members: nabStore.members.size,
                profiles: nabStore.profiles.size 
            }));
            return;
        }
        
        // Join endpoint - simplified
        if (req.method === 'POST' && req.url === '/join') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    nabStore.members.set(data.did, data);
                    console.log('[Mock NAB] Member joined:', data.did);
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, memberCount: nabStore.members.size }));
                } catch (error) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid JSON' }));
                }
            });
            return;
        }
        
        // Discover endpoint - return list of members
        if (req.method === 'GET' && req.url === '/discover') {
            const members = Array.from(nabStore.members.values());
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ members }));
            return;
        }
        
        // Profile endpoint
        if (req.method === 'POST' && req.url === '/profile') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    nabStore.profiles.set(data.did, data.profile);
                    console.log('[Mock NAB] Profile updated:', data.did);
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (error) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid JSON' }));
                }
            });
            return;
        }
        
        // Relationship endpoint
        if (req.method === 'POST' && req.url === '/relationship') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    const { from, to, relationship } = data;
                    
                    if (!nabStore.relationships.has(from)) {
                        nabStore.relationships.set(from, new Map());
                    }
                    
                    if (relationship === 'clear') {
                        nabStore.relationships.get(from)?.delete(to);
                    } else {
                        nabStore.relationships.get(from)?.set(to, relationship);
                    }
                    
                    console.log('[Mock NAB] Relationship updated:', { from, to, relationship });
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (error) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid JSON' }));
                }
            });
            return;
        }
        
        res.writeHead(404);
        res.end('Not found');
    });
    
    httpServer.listen(PORT, HOSTNAME, () => {
        console.log(`[Mock NAB] Server started on http://${HOSTNAME}:${PORT}`);
    });
    
    return {
        server: httpServer,
        port: PORT,
    };
}

export async function stopMockNabServer() {
    console.log('[Mock NAB] Stopping server...');
    
    if (httpServer) {
        await new Promise<void>((resolve) => {
            httpServer.close(() => resolve());
        });
    }
    
    // Clear state
    nabStore.members.clear();
    nabStore.profiles.clear();
    nabStore.relationships.clear();
    
    console.log('[Mock NAB] Server stopped');
}

export { PORT as NAB_PORT, HOSTNAME as NAB_HOSTNAME };