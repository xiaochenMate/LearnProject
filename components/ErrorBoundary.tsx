
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
        <div className="min-h-screen bg-morandi-oatmeal dark:bg-dark-bg flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-white dark:bg-dark-card rounded-[2.5rem] p-10 shadow-2xl border border-morandi-border dark:border-white/5 text-center">
            <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
              <AlertCircle className="w-10 h-10 text-rose-500" />
            </div>
            <h2 className="text-2xl font-black text-morandi-charcoal dark:text-white serif-font italic mb-4">
              Oops! Something went wrong
            </h2>
            <p className="text-sm text-morandi-taupe dark:text-slate-400 mb-10 leading-relaxed">
              The module encountered an unexpected error. Don't worry, your progress is safe.
            </p>
            <div className="flex flex-col gap-4">
              <button
                onClick={this.handleReset}
                className="w-full py-4 bg-brand-orange text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <RefreshCcw size={18} />
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full py-4 bg-morandi-charcoal dark:bg-slate-200 text-white dark:text-dark-bg rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <Home size={18} />
                Back to Home
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
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
