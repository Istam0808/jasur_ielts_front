'use client';

import React from 'react';
import { BsExclamationCircle } from 'react-icons/bs';

/**
 * Error Boundary component for catching and handling React errors
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <BsExclamationCircle size={48} className="error-icon" />
          <h2>
            {this.props.title || 'Something went wrong'}
          </h2>
          <p>
            {this.props.message || 'An error occurred. Please try refreshing the page.'}
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{
              textAlign: 'left',
              marginTop: '1rem',
              padding: '1rem',
              background: '#f8f9fa',
              borderRadius: '8px',
              fontSize: '0.875rem',
              maxWidth: '600px',
              margin: '1rem auto'
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                Error Details (Development Only)
              </summary>
              <pre style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                color: '#d32f2f',
                overflow: 'auto'
              }}>
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
          {this.props.showReset && (
            <button className="btn btn-primary" onClick={this.handleReset}>
              {this.props.resetText || 'Try Again'}
            </button>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}