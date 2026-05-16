'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    // Only catch critical React errors
    const errorMessage = error.message || ''
    if (
      errorMessage.includes('facebook') ||
      errorMessage.includes('FB')
    ) {
      return { hasError: false }
    }
    
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log all errors for debugging
    console.error('ErrorBoundary caught an error:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    })
  }



  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              خطایی رخ داده است
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              متاسفانه مشکلی در بارگذاری صفحه پیش آمده است.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              تلاش مجدد
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}