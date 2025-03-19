import { Server } from 'http';
import { Server as SocketServer } from 'socket.io';

interface GlobalWithServers {
    __smeServer: Server;
    __socketServer: SocketServer;
}

async function globalTeardown() {
    const server = (globalThis as GlobalWithServers).__smeServer;
    const socketServer = (globalThis as GlobalWithServers).__socketServer;

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
