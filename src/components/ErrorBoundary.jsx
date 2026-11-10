import { Component } from 'react';

/**
 * ErrorBoundary — atrapa cualquier error de renderizado de React en el árbol
 * descendiente y muestra un panel de diagnóstico con el mensaje y stack exacto
 * en lugar de la pantalla negra / en blanco.
 *
 * Uso:
 *   <ErrorBoundary>
 *     <ComponenteQuePuedeFallar />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Render crash capturado:', error, info);
    this.setState({ info });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, info: null });
  };

  render() {
    const { hasError, error, info } = this.state;

    if (hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            backgroundColor: '#1a0a0a',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: '2rem',
            fontFamily: 'monospace',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              maxWidth: '860px',
              width: '100%',
              background: '#2d0f0f',
              border: '1px solid #7f1d1d',
              borderRadius: '12px',
              padding: '2rem',
            }}
          >
            {/* Cabecera */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '1.75rem' }}>💥</span>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#fca5a5' }}>
                  Error de Renderizado — React Crash
                </h1>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#f87171' }}>
                  Un componente falló al renderizar. Revisa el mensaje y stack a continuación.
                </p>
              </div>
            </div>

            {/* Mensaje */}
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ margin: '0 0 0.4rem', fontSize: '0.75rem', color: '#fca5a5', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Error.message
              </p>
              <pre
                style={{
                  margin: 0,
                  padding: '0.75rem 1rem',
                  background: '#3b0d0d',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  color: '#fecaca',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  border: '1px solid #7f1d1d',
                }}
              >
                {error?.message || 'Error desconocido'}
              </pre>
            </div>

            {/* Stack trace */}
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ margin: '0 0 0.4rem', fontSize: '0.75rem', color: '#fca5a5', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Error.stack
              </p>
              <pre
                style={{
                  margin: 0,
                  padding: '0.75rem 1rem',
                  background: '#3b0d0d',
                  borderRadius: '8px',
                  fontSize: '0.72rem',
                  color: '#fda4af',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  border: '1px solid #7f1d1d',
                  maxHeight: '260px',
                  overflowY: 'auto',
                }}
              >
                {error?.stack || 'Stack no disponible'}
              </pre>
            </div>

            {/* Component stack */}
            {info?.componentStack && (
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ margin: '0 0 0.4rem', fontSize: '0.75rem', color: '#fca5a5', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Component Stack (árbol de componentes)
                </p>
                <pre
                  style={{
                    margin: 0,
                    padding: '0.75rem 1rem',
                    background: '#3b0d0d',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    color: '#fda4af',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    border: '1px solid #7f1d1d',
                    maxHeight: '200px',
                    overflowY: 'auto',
                  }}
                >
                  {info.componentStack}
                </pre>
              </div>
            )}

            {/* Acciones */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                }}
              >
                Reintentar
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '8px',
                  border: '1px solid #7f1d1d',
                  background: 'transparent',
                  color: '#fca5a5',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                }}
              >
                Recargar página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

