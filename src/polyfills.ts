import { Buffer } from 'buffer';
import process from 'process';

declare global {
    interface Window {
        Buffer: typeof Buffer;
        process: typeof process;
        global: Window;
    }
}

if (typeof window !== 'undefined') {
    // Ensure Buffer is available globally
    window.Buffer = Buffer;

    // Ensure process is available globally
    window.process = process;

    // Ensure global is defined
    if (typeof global === 'undefined') {
        window.global = window;
    }
}

export {};
