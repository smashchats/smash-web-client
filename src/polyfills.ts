import { Buffer } from 'buffer';
import process from 'process';

if (typeof window !== 'undefined') {
    // Ensure Buffer is available globally
    window.Buffer = Buffer;

    // Ensure process is available globally
    window.process = process;

    // Ensure global is defined
    if (typeof global === 'undefined') {
        (window as any).global = window;
    }
}

export {};
