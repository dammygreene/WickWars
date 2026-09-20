'use client';

/**
 * Root error boundary — last resort when the root layout itself throws.
 * It renders its own <html>/<body> (Tailwind may not be available here), so
 * styling is inline and the retry is a plain reload.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const msg = error?.digest ? `REF ${error.digest}` : 'CHECK YOUR CONNECTION AND RETRY';

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#070B09',
          color: '#F2F5F3',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          textAlign: 'center',
          padding: 24,
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: 12, letterSpacing: '0.18em', color: '#35E58B' }}>WICK WARS</p>
          <h1 style={{ margin: '12px 0 6px', fontSize: 28, fontWeight: 700 }}>SOMETHING BROKE.</h1>
          <p style={{ margin: '0 0 24px', fontSize: 13, color: '#8B948E' }}>{msg}</p>
          <button
            onClick={reset}
            style={{
              background: '#F2F5F3',
              color: '#070B09',
              border: 'none',
              borderRadius: 8,
              padding: '12px 28px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            TRY AGAIN
          </button>
        </div>
      </body>
    </html>
  );
}
