import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;
  public readonly props: Readonly<ErrorBoundaryProps>;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4 text-slate-200 font-sans">
          <div className="bg-slate-900 border border-red-500/50 rounded-xl p-8 max-w-md w-full shadow-2xl text-center">
            <div className="bg-red-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} className="text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">System Crash Detected</h1>
            <p className="text-slate-400 text-sm mb-6">
              The application encountered a critical error while loading your data.
            </p>
            
            <div className="bg-black/40 rounded p-3 mb-6 text-left overflow-auto max-h-32 border border-slate-800">
              <code className="text-xs font-mono text-red-400 break-all">
                {this.state.error?.message || "Unknown Error"}
              </code>
            </div>

            <button 
              onClick={() => {
                localStorage.clear(); // Clear local storage to reset corrupted session
                window.location.reload();
              }}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw size={18} />
              <span>Reset & Reload</span>
            </button>
            <p className="text-[10px] text-slate-500 mt-4">
              Note: This will log you out to clear corrupted cache.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;