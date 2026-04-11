import { useState } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';

export default function PasskeyLogin() {
  const [status, setStatus] = useState<'idle' | 'working' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  async function login() {
    setStatus('working');
    setMessage('');
    try {
      const optsRes = await fetch('/api/auth/passkey/login-options', { method: 'POST' });
      if (!optsRes.ok) throw new Error(await optsRes.text());
      const options = await optsRes.json();

      const authResp = await startAuthentication({ optionsJSON: options });

      const verifyRes = await fetch('/api/auth/passkey/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authResp),
      });
      if (!verifyRes.ok) throw new Error(await verifyRes.text());

      window.location.href = '/admin';
    } catch (err) {
      console.error(err);
      setStatus('error');
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={login}
        disabled={status === 'working'}
        className="w-full rounded-lg bg-electric-500 px-4 py-3 text-base font-semibold text-ink-950 shadow-[0_0_0_1px_theme(colors.electric.400),0_0_18px_-4px_theme(colors.electric.500)] hover:bg-electric-400 disabled:opacity-60"
      >
        {status === 'working' ? 'Waiting for passkey…' : 'Sign in with passkey'}
      </button>
      {status === 'error' && (
        <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
      )}
    </div>
  );
}
