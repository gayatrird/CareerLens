import React from 'react';

/**
 * Local Error Boundary for Mock Interview section.
 * Catches any render or runtime exceptions inside the Mock Interview component tree,
 * preventing the entire application from going blank.
 */
export default class MockInterviewErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('MockInterviewErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-[#171A20] border border-red-500/30 rounded-2xl p-8 max-w-xl mx-auto my-12 text-center animate-fade-in-up">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4 text-red-400">
            <span className="material-symbols-outlined text-2xl">error_outline</span>
          </div>
          <h3 className="text-base font-semibold text-[#FAFAFA] mb-2 font-headline-md">
            Mock Interview Encountered an Issue
          </h3>
          <p className="text-xs text-[#A1A1AA] mb-6 leading-relaxed">
            {this.state.error?.message || 'An unexpected rendering error occurred while loading Mock Interview.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 rounded-xl bg-[#4F7DF3] hover:bg-[#4069D0] text-white text-xs font-semibold transition-all cursor-pointer shadow-[0_2px_10px_rgba(79,125,243,0.3)]"
            >
              Reload Mock Interview
            </button>
            {this.props.onViewKit && (
              <button
                type="button"
                onClick={this.props.onViewKit}
                className="px-4 py-2 rounded-xl border border-[#27272A] bg-[#111318] text-[#A1A1AA] hover:text-[#FAFAFA] text-xs font-semibold transition-all cursor-pointer"
              >
                Go to Question Kit
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
