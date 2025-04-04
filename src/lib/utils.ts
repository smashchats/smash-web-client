export function cn(...classNames: (string | undefined | null | false)[]) {
    return classNames.filter(Boolean).join(' ');
}

export const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

// Error types to help users understand clipboard issues
export enum ClipboardErrorType {
    PermissionDenied = 'PERMISSION_DENIED',
    NotSupported = 'NOT_SUPPORTED',
    PermissionNotGranted = 'PERMISSION_NOT_GRANTED',
    Unknown = 'UNKNOWN',
}

export interface ClipboardResult {
    success: boolean;
    errorType?: ClipboardErrorType;
    errorMessage?: string;
}

/**
 * Detects if the current browser is Chromium-based
 */
function isChromium(): boolean {
    return navigator.userAgent.indexOf('Chrome') !== -1;
}

/**
 * Detects if the current browser is Safari
 */
function isSafari(): boolean {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

/**
 * Request clipboard write permission (for Chromium browsers)
 * Firefox and Safari don't support the Permissions API for clipboard
 */
async function requestClipboardWritePermission(): Promise<boolean> {
    // Only Chromium supports clipboard permissions
    if (!isChromium() || !navigator.permissions) {
        return true; // Skip for non-Chromium browsers
    }

    try {
        const permissionStatus = await navigator.permissions.query({
            name: 'clipboard-write' as PermissionName,
        });

        return permissionStatus.state === 'granted';
    } catch (error) {
        console.warn('Could not query clipboard write permission:', error);
        return false;
    }
}

/**
 * Legacy fallback method for copying text to clipboard using document.execCommand
 * This is used as a last resort for Safari when the Clipboard API fails
 */
function legacyCopyToClipboard(text: string): boolean {
    try {
        // Create a temporary textarea element
        const textarea = document.createElement('textarea');

        // Set its value to the text we want to copy
        textarea.value = text;

        // Make it invisible but ensure it's part of the document
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.top = '0';
        textarea.style.left = '0';
        textarea.style.pointerEvents = 'none';

        // Add it to the DOM
        document.body.appendChild(textarea);

        // Focus and select all text
        textarea.focus();
        textarea.select();

        // For iOS Safari
        textarea.setSelectionRange(0, textarea.value.length);

        // Execute the copy command
        const success = document.execCommand('copy');

        // Remove the textarea from the DOM
        document.body.removeChild(textarea);

        console.log(
            'Legacy clipboard copy attempt:',
            success ? 'successful' : 'failed',
        );

        return success;
    } catch (error) {
        console.error('Legacy clipboard method failed:', error);
        return false;
    }
}

/**
 * Copy text to the clipboard using the appropriate method for the browser
 *
 * Security considerations by browser:
 * - Chromium: Requires clipboard-write permission or transient activation
 * - Firefox/Safari: Requires transient activation (direct user interaction)
 *
 * This function should be called directly from a user-initiated event handler
 * to ensure proper permissions in all browsers.
 */
export async function copyToClipboard(text: string): Promise<ClipboardResult> {
    // Check if clipboard API is available
    if (!navigator.clipboard) {
        // Try legacy approach if modern API is not available
        const success = legacyCopyToClipboard(text);
        if (success) {
            return { success: true };
        }

        return {
            success: false,
            errorType: ClipboardErrorType.NotSupported,
            errorMessage: 'Clipboard API is not supported in this browser',
        };
    }

    // For Chromium browsers, we can check permission first
    if (isChromium()) {
        const hasPermission = await requestClipboardWritePermission();
        if (!hasPermission) {
            return {
                success: false,
                errorType: ClipboardErrorType.PermissionNotGranted,
                errorMessage:
                    'Clipboard write permission not granted. Try again with a direct user action.',
            };
        }
    }

    try {
        // Special handling for Safari which works better with ClipboardItem
        if (isSafari()) {
            try {
                // Safari-specific workaround using Promise-based ClipboardItem
                // This approach has better compatibility with Safari's security model
                const clipboardItem = new ClipboardItem({
                    'text/plain': Promise.resolve(
                        new Blob([text], { type: 'text/plain' }),
                    ),
                });

                // Write using the clipboard.write API
                await navigator.clipboard.write([clipboardItem]);
                return { success: true };
            } catch (safariError) {
                console.warn(
                    'Safari clipboard.write approach failed:',
                    safariError,
                );

                try {
                    // Second attempt: direct writeText
                    await navigator.clipboard.writeText(text);
                    return { success: true };
                } catch (fallbackError) {
                    console.warn('Safari fallback also failed:', fallbackError);

                    // Third attempt: legacy document.execCommand approach
                    console.log('Trying legacy clipboard method for Safari...');
                    const success = legacyCopyToClipboard(text);
                    if (success) {
                        return { success: true };
                    }

                    throw fallbackError; // Rethrow if all attempts fail
                }
            }
        } else {
            // Standard approach for Chrome/Firefox
            await navigator.clipboard.writeText(text);
            return { success: true };
        }
    } catch (error) {
        console.warn('Clipboard write failed:', error);

        // Detailed error handling
        if (error instanceof Error) {
            // Permission denied or not allowed error
            if (
                error.name === 'NotAllowedError' ||
                error.message.includes('permission') ||
                error.message.includes('denied')
            ) {
                const errorMessage =
                    'Permission to access clipboard was denied. You may need to grant clipboard permission in your browser settings.';
                return {
                    success: false,
                    errorType: ClipboardErrorType.PermissionDenied,
                    errorMessage,
                };
            }

            // Other error types
            return {
                success: false,
                errorType: ClipboardErrorType.Unknown,
                errorMessage: error.message || 'Unknown clipboard error',
            };
        }

        return {
            success: false,
            errorType: ClipboardErrorType.Unknown,
            errorMessage: 'Failed to copy to clipboard',
        };
    }
}
