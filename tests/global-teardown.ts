import { Server } from 'http';
import { Server as SocketServer } from 'socket.io';

async function globalTeardown() {
    const server = (globalThis as any).__smeServer as Server;
    const socketServer = (globalThis as any).__socketServer as SocketServer;

    if (socketServer) {
        await new Promise<void>((resolve) => {
            socketServer.close(() => {
                console.log('Socket.IO server closed');
                resolve();
            });
        });
    }

    if (server) {
        await new Promise<void>((resolve) => {
            server.close(() => {
                console.log('HTTP server closed');
                resolve();
            });
        });
    }
}

export default globalTeardown;
