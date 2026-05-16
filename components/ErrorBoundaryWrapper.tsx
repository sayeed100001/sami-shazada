'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

class ErrorBoundaryClass extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Log to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // Add your error reporting service here
      console.error('Production error:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      })
    }
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error!} retry={this.retry} />
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-lg text-red-800">خطا در سیستم</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center text-sm text-gray-600">
                <p>متأسفانه خطایی در سیستم رخ داده است.</p>
                <p>لطفاً صفحه را مجدداً بارگذاری کنید.</p>
              </div>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-xs">
                  <details>
                    <summary className="cursor-pointer font-medium text-red-800">
                      جزئیات خطا (فقط در حالت توسعه)
                    </summary>
                    <div className="mt-2 text-red-700">
                      <p><strong>پیام:</strong> {this.state.error.message}</p>
                      {this.state.error.stack && (
                        <pre className="mt-2 text-xs overflow-auto">
                          {this.state.error.stack}
                        </pre>
                      )}
                    </div>
                  </details>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={this.retry} 
                  className="flex-1 text-sm"
                  variant="default"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  تلاش مجدد
                </Button>
                <Button 
                  onClick={() => window.location.href = '/'} 
                  className="flex-1 text-sm"
                  variant="outline"
                >
                  <Home className="w-4 h-4 mr-2" />
                  صفحه اصلی
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Functional wrapper component
export function ErrorBoundaryWrapper({ children, ...props }: ErrorBoundaryProps) {
  return (
    <ErrorBoundaryClass {...props}>
      {children}
    </ErrorBoundaryClass>
  )
}

// Specialized error boundaries for different sections
export function AdminErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundaryWrapper
      onError={(error, errorInfo) => {
        console.error('Admin panel error:', error, errorInfo)
      }}
      fallback={({ error, retry }) => (
        <div className="p-4">
          <Card>
            <CardContent className="p-6 text-center">
              <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">خطا در پنل مدیریت</h3>
              <p className="text-sm text-gray-600 mb-4">
                مشکلی در بارگذاری پنل مدیریت رخ داده است.
              </p>
              <Button onClick={retry} size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                تلاش مجدد
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    >
      {children}
    </ErrorBoundaryWrapper>
  )
}

export function ChartErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundaryWrapper
      fallback={({ error, retry }) => (
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border">
          <div className="text-center">
            <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-3">خطا در بارگذاری نمودار</p>
            <Button onClick={retry} size="sm" variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              تلاش مجدد
            </Button>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundaryWrapper>
  )
}

export function ContentErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundaryWrapper
      fallback={({ error, retry }) => (
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-orange-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-3">خطا در بارگذاری محتوا</p>
            <Button onClick={retry} size="sm" variant="outline">
              بارگذاری مجدد
            </Button>
          </CardContent>
        </Card>
      )}
    >
      {children}
    </ErrorBoundaryWrapper>
  )
}

export default ErrorBoundaryWrapper