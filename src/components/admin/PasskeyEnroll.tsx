import { useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';

export default function PasskeyEnroll() {
  const [status, setStatus] = useState<'idle' | 'working' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  async function enroll() {
    setStatus('working');
    setMessage('');
    try {
      const optsRes = await fetch('/api/auth/passkey/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!optsRes.ok) throw new Error(await optsRes.text());
      const options = await optsRes.json();

      const attResp = await startRegistration({ optionsJSON: options });

      const verifyRes = await fetch('/api/auth/passkey/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attResp),
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
        onClick={enroll}
        disabled={status === 'working'}
        className="w-full rounded-lg bg-neutral-900 px-4 py-3 text-base font-semibold text-white hover:bg-neutral-700 disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {status === 'working' ? 'Waiting for passkey…' : 'Create passkey'}
      </button>
      {status === 'error' && (
        <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
      )}
    </div>
  );
}
