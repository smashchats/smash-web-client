import { DISABLE_SW } from './config/sme';

if ('serviceWorker' in navigator && !DISABLE_SW) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(console.error);
    });
}
