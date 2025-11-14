import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, Button } from '@/components/ui';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('💀 Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-cursed-black flex items-center justify-center p-4">
          <Card variant="elevated" className="max-w-2xl w-full">
            <CardContent className="space-y-6 py-12">
              <div className="text-center">
                <div className="text-8xl mb-6 animate-pulse">💀</div>
                <h1 className="text-4xl font-bold text-blood-red mb-4">
                  The Spirits Have Cursed This Page!
                </h1>
                <p className="text-ghostly-white/70 text-lg mb-6">
                  A dark force has corrupted the application. The demonic oracle is displeased.
                </p>
              </div>

              {this.state.error && (
                <div className="bg-graveyard-gray rounded-lg p-4 border-2 border-blood-red/30">
                  <h3 className="text-blood-red font-bold mb-2 flex items-center gap-2">
                    <span>🔥</span>
                    <span>Error Details:</span>
                  </h3>
                  <p className="text-ghostly-white/80 font-mono text-sm break-all">
                    {this.state.error.toString()}
                  </p>
                </div>
              )}

              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="bg-graveyard-gray rounded-lg p-4 border-2 border-phantom-purple/30">
                  <summary className="text-phantom-purple font-bold cursor-pointer mb-2">
                    🔍 Stack Trace (Development Only)
                  </summary>
                  <pre className="text-ghostly-white/60 text-xs overflow-auto max-h-64">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}

              <div className="flex gap-4 justify-center">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={this.handleReset}
                >
                  <span className="flex items-center gap-2">
                    <span>🔄</span>
                    <span>Try Again</span>
                  </span>
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => window.location.href = '/'}
                >
                  <span className="flex items-center gap-2">
                    <span>🏠</span>
                    <span>Return to Crypt</span>
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
