"use client";

import React from 'react';
import { FaExclamationTriangle, FaRedo } from 'react-icons/fa';

class ShadowingErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Shadowing Error Boundary caught an error:', error, errorInfo);
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
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          maxWidth: '600px',
          margin: '0 auto',
          background: '#fff',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          border: '2px solid #ff4757'
        }}>
          <FaExclamationTriangle 
            size={48} 
            color="#ff4757" 
            style={{ marginBottom: '1rem' }}
          />
          <h2 style={{ color: '#333', marginBottom: '0.5rem' }}>
            Something went wrong
          </h2>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>
            {this.props.fallbackMessage || 'An error occurred while loading the shadowing exercise.'}
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{
              textAlign: 'left',
              marginBottom: '1rem',
              padding: '1rem',
              background: '#f8f9fa',
              borderRadius: '8px',
              fontSize: '0.875rem'
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                Error Details (Development Only)
              </summary>
              <pre style={{ 
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                color: '#d32f2f'
              }}>
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
          <button
            onClick={this.handleReset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: '#ff4757',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.target.style.background = '#ff3838'}
            onMouseOut={(e) => e.target.style.background = '#ff4757'}
          >
            <FaRedo />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ShadowingErrorBoundary;
