import { ArrowRight } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import { TextField } from '@/components/ui/Field';
import { ApiError, errorMessage } from '@/lib/api';

type Props = {
  initialCooldown: number;
  submitLabel: string;
  onVerify: (code: string) => Promise<void>;
  // Requests a new code and resolves with the cooldown in seconds.
  onResend: () => Promise<number>;
};

const RESTART_CODES = ['otp_locked', 'otp_expired', 'otp_invalid'];

function formatSeconds(total: number) {
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export default function OtpForm({ initialCooldown, submitLabel, onVerify, onResend }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(initialCooldown);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setInfo('');
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the six-digit code from the email.');
      return;
    }
    setError('');
    setVerifying(true);
    try {
      await onVerify(code);
    } catch (err) {
      setError(errorMessage(err));
      if (err instanceof ApiError && RESTART_CODES.includes(err.code)) setCode('');
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setInfo('');
    setResending(true);
    try {
      setCooldown(await onResend());
      setCode('');
      setInfo('A new code is on its way. Check your inbox and spam folder.');
    } catch (err) {
      setError(errorMessage(err));
      const retry = err instanceof ApiError ? Number(err.data.retry_after) : NaN;
      if (Number.isFinite(retry) && retry > 0) setCooldown(retry);
    } finally {
      setResending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <TextField
        id="otp"
        label="Six-digit code"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="000000"
        value={code}
        onChange={event => setCode(event.target.value.replace(/\D/g, ''))}
        error={error}
        className="text-center font-mono text-lg tracking-[0.4em]"
      />

      {info && (
        <Notice tone="success" className="mt-4">
          {info}
        </Notice>
      )}

      <Button type="submit" loading={verifying} className="mt-6 w-full">
        {verifying ? 'Verifying' : submitLabel}
        {!verifying && <ArrowRight className="h-4 w-4" />}
      </Button>

      <p className="mt-5 text-center text-sm text-navy-600">
        Didn&apos;t get it?{' '}
        {cooldown > 0 ? (
          <span aria-live="polite">Resend available in {formatSeconds(cooldown)}</span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="font-semibold text-blue-700 hover:underline disabled:opacity-60"
          >
            {resending ? 'Sending' : 'Resend code'}
          </button>
        )}
      </p>
    </form>
  );
}
