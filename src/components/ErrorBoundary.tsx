import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex items-center justify-center min-h-screen p-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
                        <h2 className="text-red-800 font-semibold mb-2">
                            Something went wrong
                        </h2>
                        <p className="text-red-600 text-sm">
                            {this.state.error?.message ||
                                'An unknown error occurred'}
                        </p>
                        <p className="text-red-600 text-sm mt-2">
                            Please refresh the page to try again.
                        </p>
                        <pre className="mt-4 text-xs bg-red-100 p-2 rounded overflow-auto max-h-40">
                            {this.state.error?.stack}
                        </pre>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
