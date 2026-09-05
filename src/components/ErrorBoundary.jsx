import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 rounded-2xl bg-[#121216] border border-red-500/30 text-white space-y-4 my-4">
          <div className="flex items-center gap-3 text-red-400">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <h3 className="font-display font-bold text-base">Đã xảy ra lỗi khi hiển thị mục này</h3>
          </div>
          <p className="text-xs font-mono text-white/60">
            {this.state.error?.message || 'Lỗi không xác định'}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 rounded-xl bg-[#C3EA39] text-black font-mono font-bold text-xs flex items-center gap-2 hover:bg-[#d4f854] cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Thử lại</span>
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-white/10 text-white font-mono text-xs hover:bg-white/20 cursor-pointer"
            >
              Tải lại trang (F5)
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
