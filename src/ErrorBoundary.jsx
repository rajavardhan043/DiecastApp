import { Component } from 'react'

export class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: '2rem',
          background: '#1a1a2e',
          color: '#e94560',
          minHeight: '100vh',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <h1>Something went wrong</h1>
          <pre style={{ 
            background: '#0d0d12', 
            padding: '1rem', 
            overflow: 'auto',
            color: '#f0f0f5',
            fontSize: '14px',
          }}>
            {this.state.error.toString()}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}
