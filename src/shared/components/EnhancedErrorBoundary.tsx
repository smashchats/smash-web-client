import { logger } from '@shared/utils/logger';
import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

import Button from './Button';

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
    errorId: string | null;
}

interface EnhancedErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
    enableRetry?: boolean;
    showErrorDetails?: boolean;
}

export class EnhancedErrorBoundary extends Component<
    EnhancedErrorBoundaryProps,
    ErrorBoundaryState
> {
    private retryCount = 0;
    private readonly maxRetries = 3;

    constructor(props: EnhancedErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            errorId: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        const errorId = `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        return {
            hasError: true,
            error,
            errorId,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        const errorId = this.state.errorId || 'unknown';

        // Log the error
        logger.error('Error Boundary caught an error', {
            error: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            errorId,
            retryCount: this.retryCount,
        });

        // Update state with error info
        this.setState({ errorInfo });

        // Call custom error handler if provided
        this.props.onError?.(error, errorInfo, errorId);

        // Send error to monitoring service (if available)
        this.reportError(error, errorInfo, errorId);
    }

    private reportError = (
        error: Error,
        errorInfo: ErrorInfo,
        errorId: string,
    ) => {
        // This would typically send to a service like Sentry, LogRocket, etc.
        if (typeof window !== 'undefined' && window.console) {
            console.group(`🚨 Error Boundary Report [${errorId}]`);
            console.error('Error:', error);
            console.error('Component Stack:', errorInfo.componentStack);
            console.error('Error Stack:', error.stack);
            console.groupEnd();
        }
    };

    private handleRetry = () => {
        if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            logger.info('Retrying after error', {
                retryCount: this.retryCount,
                errorId: this.state.errorId,
            });

            this.setState({
                hasError: false,
                error: null,
                errorInfo: null,
                errorId: null,
            });
        }
    };

    private handleRefresh = () => {
        logger.info('Refreshing page after error', {
            errorId: this.state.errorId,
        });
        window.location.reload();
    };

    private handleReport = () => {
        const { error, errorInfo, errorId } = this.state;
        if (!error || !errorInfo) return;

        // Create a simplified error report
        const report = {
            errorId,
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
        };

        // Copy to clipboard for easy reporting
        navigator.clipboard
            ?.writeText(JSON.stringify(report, null, 2))
            .then(() => {
                alert(
                    'Error report copied to clipboard. Please paste it when reporting the issue.',
                );
            })
            .catch(() => {
                // Fallback: show report in console
                console.log('Error Report:', report);
                alert(
                    'Error report logged to console. Please check the console and include it when reporting.',
                );
            });
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            const { error, errorId } = this.state;
            const canRetry =
                this.props.enableRetry && this.retryCount < this.maxRetries;

            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
                        <div className="text-center">
                            <div className="text-red-500 text-6xl mb-4">⚠️</div>
                            <h1 className="text-xl font-semibold text-gray-900 mb-2">
                                Something went wrong
                            </h1>
                            <p className="text-gray-600 mb-6">
                                We encountered an unexpected error. Please try
                                again or contact support if the problem
                                persists.
                            </p>

                            {this.props.showErrorDetails && error && (
                                <div className="bg-gray-100 rounded p-3 mb-4 text-left">
                                    <p className="text-xs font-mono text-gray-700 mb-1">
                                        Error ID: {errorId}
                                    </p>
                                    <p className="text-sm text-red-600 font-medium">
                                        {error.message}
                                    </p>
                                </div>
                            )}

                            <div className="space-y-3">
                                {canRetry && (
                                    <Button
                                        variant="primary"
                                        isFullWidth
                                        onClick={this.handleRetry}
                                    >
                                        Try Again (
                                        {this.maxRetries - this.retryCount}{' '}
                                        attempts left)
                                    </Button>
                                )}

                                <Button
                                    variant="secondary"
                                    isFullWidth
                                    onClick={this.handleRefresh}
                                >
                                    Refresh Page
                                </Button>

                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={this.handleReport}
                                        className="flex-1"
                                    >
                                        Copy Error Report
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => window.history.back()}
                                        className="flex-1"
                                    >
                                        Go Back
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// Functional wrapper for easier usage
interface ErrorBoundaryWrapperProps {
    children: ReactNode;
    message?: string;
    enableRetry?: boolean;
    showErrorDetails?: boolean;
}

export function ErrorBoundaryWrapper({
    children,
    message,
    enableRetry = true,
    showErrorDetails = process.env.NODE_ENV === 'development',
}: Readonly<ErrorBoundaryWrapperProps>) {
    return (
        <EnhancedErrorBoundary
            enableRetry={enableRetry}
            showErrorDetails={showErrorDetails}
            onError={(error, errorInfo, errorId) => {
                // Custom error reporting logic can go here
                logger.error('Component error', {
                    message: message || 'Component error',
                    error: error.message,
                    errorId,
                });
            }}
        >
            {children}
        </EnhancedErrorBoundary>
    );
}
