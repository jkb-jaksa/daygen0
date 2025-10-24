import React, { Component, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Home, RotateCcw, Bug } from 'lucide-react';
import { buttons, glass } from '../styles/designSystem';

type Props = {
  children: ReactNode;
  fallbackRoute?: string; // Default: "/"
  context?: string; // E.g., "authentication", "creation"
};

type State = {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
};

class AuthErrorBoundary extends Component<Props, State> {
  private maxErrorCount = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('AuthErrorBoundary caught an error:', error, errorInfo);
    }

    // Increment error count
    this.setState(prevState => ({
      errorCount: prevState.errorCount + 1,
    }));

    // If too many errors, prevent infinite loops
    if (this.state.errorCount >= this.maxErrorCount) {
      console.error('Too many errors in AuthErrorBoundary, preventing infinite loop');
    }
  }

  handleTryAgain = () => {
    if (this.state.errorCount < this.maxErrorCount) {
      this.setState({
        hasError: false,
        error: null,
      });
    }
  };

  handleGoHome = () => {
    // Use navigate hook through a wrapper component
    const navigate = (window as Window & { __navigate?: (path: string) => void }).__navigate;
    if (navigate) {
      navigate(this.props.fallbackRoute || '/');
    } else {
      window.location.href = this.props.fallbackRoute || '/';
    }
  };

  handleReportIssue = () => {
    const errorDetails = {
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      context: this.props.context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };

    // In a real app, you'd send this to your error reporting service
    console.log('Error report:', errorDetails);
    
    // For now, copy to clipboard
    navigator.clipboard?.writeText(JSON.stringify(errorDetails, null, 2))
      .then(() => {
        alert('Error details copied to clipboard. Please share this with support.');
      })
      .catch(() => {
        alert('Error details logged to console. Please check developer tools.');
      });
  };

  render() {
    if (this.state.hasError) {
      const { context = 'authentication' } = this.props;
      const canRetry = this.state.errorCount < this.maxErrorCount;

      return (
        <div className="min-h-screen bg-theme-black-subtle text-theme-text flex items-center justify-center p-6">
          <div className={`${glass.promptDark} rounded-[28px] p-8 max-w-md w-full text-center`}>
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
            </div>
            
            <h1 className="text-2xl font-raleway font-light text-theme-text mb-3">
              Something went wrong
            </h1>
            
            <p className="text-theme-white/80 font-raleway mb-6">
              We encountered an error while loading the {context} page. 
              {canRetry ? ' You can try again or return to the home page.' : ' Please return to the home page.'}
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm text-theme-white/60 hover:text-theme-text transition-colors">
                  Error details (development only)
                </summary>
                <pre className="mt-2 p-3 bg-theme-black/40 rounded text-xs text-red-300 overflow-auto max-h-32">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <div className="flex flex-col gap-3">
              {canRetry && (
                <button
                  onClick={this.handleTryAgain}
                  className={`${buttons.blockPrimary} flex items-center justify-center gap-2`}
                >
                  <RotateCcw className="w-4 h-4" />
                  Try Again
                </button>
              )}
              
              <button
                onClick={this.handleGoHome}
                className={`${buttons.ghost} flex items-center justify-center gap-2`}
              >
                <Home className="w-4 h-4" />
                Return to Home
              </button>

              <button
                onClick={this.handleReportIssue}
                className="flex items-center justify-center gap-2 text-sm text-theme-white/60 hover:text-theme-text transition-colors py-2"
              >
                <Bug className="w-4 h-4" />
                Report Issue
              </button>
            </div>

            {this.state.errorCount >= this.maxErrorCount && (
              <p className="mt-4 text-xs text-red-400 font-raleway">
                Too many errors occurred. Please refresh the page or contact support.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapper component to provide navigate function to class component
export function AuthErrorBoundaryWrapper(props: Props) {
  const navigate = useNavigate();
  
  // Store navigate function globally so the class component can access it
  React.useEffect(() => {
    (window as Window & { __navigate?: (path: string) => void }).__navigate = navigate;
    return () => {
      delete (window as Window & { __navigate?: (path: string) => void }).__navigate;
    };
  }, [navigate]);

  return <AuthErrorBoundary {...props} />;
}

export default AuthErrorBoundaryWrapper;
