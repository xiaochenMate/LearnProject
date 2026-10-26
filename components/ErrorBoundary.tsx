
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="h-full min-h-[300px] bg-[#101416] text-[#dce7df] flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full p-8 border border-white/10 rounded-lg text-center">
            <div className="w-12 h-12 flex items-center justify-center mx-auto mb-6 text-[#a0e7cc]">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-medium mb-4">
              这次探索暂时中断了
            </h2>
            <p className="text-sm text-[#a2afa6] mb-8 leading-relaxed">
              场景未能正常载入。可以返回探索页，或重新载入后再试。
            </p>
            <div className="flex flex-col gap-4">
              <button
                onClick={this.handleReset}
                className="ex-button ex-button-primary"
              >
                <RefreshCcw size={18} />
                返回探索
              </button>
              <button
                onClick={() => window.location.reload()}
                className="ex-button ex-button-secondary"
              >
                <Home size={18} />
                重新载入
              </button>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <div className="mt-8 p-4 bg-slate-100 dark:bg-black/20 rounded-xl text-left overflow-auto max-h-40">
                <code className="text-[10px] text-rose-500 font-mono">
                  {this.state.error.toString()}
                </code>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
