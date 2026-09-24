import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Rendered instead of the crashed subtree. Defaults to a small reload card. */
  fallback?: React.ReactNode;
  /** Change this value to reset the boundary (e.g. on navigation). */
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Keeps one broken widget from blanking the whole app. */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback !== undefined) return this.props.fallback;

    return (
      <div className="max-w-md mx-auto my-10 p-6 rounded-2xl bg-[#fffcef] border border-[#25385b] text-center text-[#25385b] shadow-recess-card">
        <h3 className="font-bold text-base mb-1">Có lỗi khi hiển thị trang</h3>
        <p className="text-xs text-[#84849c] mb-4">Nhạc vẫn đang chạy trên máy DJ. Bấm tải lại để tiếp tục.</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary px-4 py-2 text-xs font-bold rounded-full cursor-pointer"
        >
          Tải lại trang
        </button>
      </div>
    );
  }
}
