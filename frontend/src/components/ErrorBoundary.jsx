import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // eslint-disable-next-line no-console
    console.error('App crashed:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <span className="text-2xl text-red-600">!</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
            <p className="text-gray-600 mt-2">An unexpected error occurred. Please try reloading the page.</p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button onClick={this.handleReload} className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Reload</button>
              <a href="/" className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg">Go Home</a>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre className="text-left text-xs bg-gray-50 mt-4 p-3 rounded overflow-auto max-h-48">{String(this.state.error?.stack || this.state.error)}</pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
