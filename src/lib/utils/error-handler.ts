/**
 * Global error handler for unhandled errors and promise rejections
 */

export interface ErrorReport {
  message: string;
  stack?: string;
  timestamp: string;
  type: 'error' | 'unhandledRejection';
  userAgent: string;
  url: string;
}

class GlobalErrorHandler {
  private errorListeners: Set<(error: ErrorReport) => void> = new Set();
  private maxErrorsStored = 50;
  private recentErrors: ErrorReport[] = [];
  
  initialize(): void {
    if (typeof window === 'undefined') return;
    
    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error || new Error(event.message), 'error');
      // Prevent default browser error handling in production
      if (!import.meta.env.DEV) {
        event.preventDefault();
      }
    });
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        'unhandledRejection'
      );
      // Prevent default browser error handling in production
      if (!import.meta.env.DEV) {
        event.preventDefault();
      }
    });
  }
  
  private handleError(error: Error, type: ErrorReport['type']): void {
    const errorReport: ErrorReport = {
      message: error.message || 'Unknown error',
      stack: error.stack,
      timestamp: new Date().toISOString(),
      type,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
    
    // Store error (FIFO)
    this.recentErrors.push(errorReport);
    if (this.recentErrors.length > this.maxErrorsStored) {
      this.recentErrors.shift();
    }
    
    // Log error in development
    if (import.meta.env.DEV) {
      console.error(`[${type}]`, error);
    }
    
    // Notify listeners
    this.errorListeners.forEach(listener => {
      try {
        listener(errorReport);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });
    
    // Special handling for specific error types
    this.handleSpecificErrors(error);
  }
  
  private handleSpecificErrors(error: Error): void {
    // Handle quota exceeded errors
    if (error.name === 'QuotaExceededError') {
      this.showUserNotification(
        'Storage quota exceeded. Please clear some data or export your entries.',
        'error'
      );
    }
    
    // Handle network errors
    if (error.message.toLowerCase().includes('network') || 
        error.message.toLowerCase().includes('fetch')) {
      this.showUserNotification(
        'Network error. Please check your connection.',
        'warning'
      );
    }
    
    // Handle authentication errors
    if (error.message.includes('AUTH_ERROR') || 
        error.message.includes('not authenticated')) {
      // Don't show notification for auth errors as they're handled by the auth flow
      return;
    }
  }
  
  private showUserNotification(message: string, type: 'error' | 'warning'): void {
    // This would integrate with your notification system
    // For now, we'll use console
    if (import.meta.env.DEV) {
      console.warn(`[User Notification - ${type}]:`, message);
    }
  }
  
  /**
   * Subscribe to error events
   */
  onError(listener: (error: ErrorReport) => void): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }
  
  /**
   * Get recent errors (for debugging)
   */
  getRecentErrors(): ErrorReport[] {
    return [...this.recentErrors];
  }
  
  /**
   * Clear error history
   */
  clearErrors(): void {
    this.recentErrors = [];
  }
  
  /**
   * Report error manually
   */
  reportError(error: Error, context?: Record<string, any>): void {
    if (context) {
      // Enhance error with context
      const enhancedError = new Error(error.message);
      enhancedError.stack = error.stack;
      (enhancedError as any).context = context;
      this.handleError(enhancedError, 'error');
    } else {
      this.handleError(error, 'error');
    }
  }
}

// Export singleton instance
export const errorHandler = new GlobalErrorHandler();

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  errorHandler.initialize();
}