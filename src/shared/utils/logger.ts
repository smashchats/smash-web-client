type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    data?: unknown;
}

class Logger {
    private static instance: Logger;
    private logs: LogEntry[] = [];
    private readonly maxLogs = 1000;

    private constructor() {}

    static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    private formatMessage(
        level: LogLevel,
        message: string,
        data?: unknown,
    ): LogEntry {
        return {
            timestamp: new Date().toISOString(),
            level,
            message,
            data,
        };
    }

    private addLog(entry: LogEntry): void {
        this.logs.push(entry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
    }

    debug(message: string, data?: unknown): void {
        const entry = this.formatMessage('debug', message, data);
        this.addLog(entry);
        console.debug(`[${entry.timestamp}] ${message}`, data || '');
    }

    info(message: string, data?: unknown): void {
        const entry = this.formatMessage('info', message, data);
        this.addLog(entry);
        console.info(`[${entry.timestamp}] ${message}`, data || '');
    }

    warn(message: string, data?: unknown): void {
        const entry = this.formatMessage('warn', message, data);
        this.addLog(entry);
        console.warn(`[${entry.timestamp}] ${message}`, data || '');
    }

    error(message: string, error?: unknown): void {
        const entry = this.formatMessage('error', message, error);
        this.addLog(entry);
        console.error(`[${entry.timestamp}] ${message}`, error || '');
    }

    getLogs(): LogEntry[] {
        return [...this.logs];
    }

    clearLogs(): void {
        this.logs = [];
    }
}

export const logger = Logger.getInstance();
