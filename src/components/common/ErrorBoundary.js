import React from "react";
import BrandLogo from "./BrandLogo";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("[Plannify ErrorBoundary Caught]:", error, errorInfo);
  }

  handleReload = () => {
    // Clear any stale chunk markers from session storage
    try {
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith("chunk_retry_")) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (e) {
      // ignore
    }
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      const isChunkError =
        this.state.error?.name === "ChunkLoadError" ||
        /loading chunk/i.test(this.state.error?.message || "") ||
        /dynamically imported module/i.test(this.state.error?.message || "");

      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 relative overflow-hidden font-sans">
          {/* Background Ambient Glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-lg w-full bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-3xl p-8 shadow-2xl text-center animate-fade-in">
            <div className="flex justify-center mb-6">
              <BrandLogo size="md" isWarm={false} />
            </div>

            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              {isChunkError ? (
                <svg className="w-8 h-8 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 16h5v5" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">
              {isChunkError ? "Module Asset Updated" : "Workspace Exception Occurred"}
            </h2>

            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              {isChunkError
                ? "The application was updated or the development server recompiled this module. Reloading will fetch the latest assets seamlessly."
                : "An unexpected error occurred while rendering this module. You can reload the page or return to the main dashboard."}
            </p>

            {this.state.error?.message && (
              <div className="text-left bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 mb-6 text-xs font-mono text-slate-300 max-h-28 overflow-y-auto">
                <span className="text-red-400 font-bold block mb-1">Details:</span>
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-violet-500/25 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                  <path d="M8 16H3v5" />
                </svg>
                Reload & Refresh
              </button>

              <button
                onClick={this.handleGoHome}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm transition-all border border-slate-700"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
