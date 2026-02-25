import React, { Component, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // 更新状态，以便下次渲染显示回退UI
    return {
      hasError: true,
      error: error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // 可以将错误日志上报给服务器
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // 自定义回退UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 my-4">
          <div className="flex items-center gap-2 text-red-600 mb-3">
            <AlertCircle className="w-6 h-6" />
            <h3 className="text-lg font-semibold">渲染错误</h3>
          </div>
          <p className="text-red-500 mb-4">抱歉，渲染内容时出现了错误。</p>
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-white rounded-lg p-4 border border-red-100">
              <h4 className="text-sm font-semibold text-red-700 mb-2">错误详情：</h4>
              <pre className="text-xs text-red-600 whitespace-pre-wrap">
                {this.state.error?.toString()}
              </pre>
              {this.state.errorInfo && (
                <div className="mt-3">
                  <h4 className="text-sm font-semibold text-red-700 mb-2">错误堆栈：</h4>
                  <pre className="text-xs text-red-600 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // 正常渲染子组件
    return this.props.children;
  }
}

export default ErrorBoundary;