/**
 * Sleep for a specified number of milliseconds
 * @param ms - Number of milliseconds to sleep
 * @returns Promise that resolves after the specified time
 */
export const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Create a debounced function that delays execution until after wait milliseconds have elapsed
 * since the last time it was invoked
 * @param func - Function to debounce
 * @param wait - Number of milliseconds to delay
 * @returns Debounced function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number,
): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout | undefined;

    return (...args: Parameters<T>) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            func(...args);
        }, wait);
    };
}

/**
 * Create a throttled function that executes at most once per wait milliseconds
 * @param func - Function to throttle
 * @param wait - Number of milliseconds to wait between executions
 * @returns Throttled function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number,
): (...args: Parameters<T>) => void {
    let lastExecuted = 0;
    let timeoutId: NodeJS.Timeout | undefined;

    return (...args: Parameters<T>) => {
        const now = Date.now();

        if (now - lastExecuted >= wait) {
            lastExecuted = now;
            func(...args);
        } else if (!timeoutId) {
            timeoutId = setTimeout(
                () => {
                    lastExecuted = Date.now();
                    timeoutId = undefined;
                    func(...args);
                },
                wait - (now - lastExecuted),
            );
        }
    };
}
