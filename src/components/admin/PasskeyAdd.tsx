import { useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';

export default function PasskeyAdd() {
  const [status, setStatus] = useState<'idle' | 'working' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  async function add() {
    setStatus('working');
    setMessage('');
    try {
      const optsRes = await fetch('/api/auth/passkey/add-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!optsRes.ok) throw new Error(await optsRes.text());
      const options = await optsRes.json();

      const attResp = await startRegistration({ optionsJSON: options });

      const verifyRes = await fetch('/api/auth/passkey/add-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attResp),
      });
      if (!verifyRes.ok) throw new Error(await verifyRes.text());

      // Refresh so the new passkey shows up in the list.
      window.location.reload();
    } catch (err) {
      console.error(err);
      setStatus('error');
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={add}
        disabled={status === 'working'}
        className="rounded bg-electric-500 px-3 py-2 text-sm font-medium text-ink-950 shadow-[0_0_0_1px_theme(colors.electric.400),0_0_12px_-4px_theme(colors.electric.500)] hover:bg-electric-400 disabled:opacity-60"
      >
        {status === 'working' ? 'Waiting for passkey…' : 'Add a passkey'}
      </button>
      {status === 'error' && (
        <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
      )}
    </div>
  );
}
