import { KeyRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '@/components/auth/AuthShell';
import OtpForm from '@/components/auth/OtpForm';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import { TextField } from '@/components/ui/Field';
import { ApiError, errorMessage } from '@/lib/api';
import { authApi } from '@/lib/authApi';
import { isValidEmail, isValidPassword } from '@/lib/validation';
import type { LoginNotice } from '@/pages/AuthPage';

type Step = 'email' | 'code' | 'password';

const STEP_TEXT: Record<Step, { title: string; subtitle: string }> = {
  email: { title: 'Forgot your password?', subtitle: 'Enter your registered email and we will send you a six-digit code.' },
  code: { title: 'Check your email', subtitle: 'Enter the code we sent. It expires in 5 minutes.' },
  password: { title: 'Choose a new password', subtitle: 'Use at least 8 characters, including a letter and a number.' },
};

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmail = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    const normalized = email.trim().toLowerCase();
    if (!isValidEmail(normalized)) {
      setErrors({ email: 'Enter a valid email address.' });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const result = await authApi.forgotPassword(normalized);
      setEmail(normalized);
      setResendIn(result.resend_available_in ?? 60);
      setStep('code');
    } catch (error) {
      // A recent code is still valid: let the user enter it.
      if (error instanceof ApiError && error.code === 'otp_cooldown') {
        setEmail(normalized);
        setResendIn(Number(error.data.retry_after) || 60);
        setStep('code');
      } else {
        setFormError(errorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (code: string) => {
    const { reset_token } = await authApi.verifyResetOtp(email, code);
    setResetToken(reset_token);
    setStep('password');
  };

  const handleResend = async () => (await authApi.resendOtp(email, 'password_reset')).resend_available_in ?? 60;

  const handlePassword = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    const nextErrors: typeof errors = {};
    if (!isValidPassword(password)) nextErrors.password = 'Use at least 8 characters, including a letter and a number.';
    if (confirm !== password) nextErrors.confirm = 'Passwords do not match.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      await authApi.resetPassword(resetToken, password, confirm);
      const state: LoginNotice = { notice: 'Your password has been updated. Log in with your new password.', email };
      navigate('/login', { replace: true, state });
    } catch (error) {
      setLoading(false);
      if (error instanceof ApiError && error.code === 'reset_token_invalid') {
        setStep('email');
        setResetToken('');
      }
      setFormError(errorMessage(error));
    }
  };

  const text = STEP_TEXT[step];

  return (
    <AuthShell>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
        <KeyRound className="h-6 w-6" />
      </span>
      <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-blue-700">
        Step {step === 'email' ? 1 : step === 'code' ? 2 : 3} of 3
      </p>
      <h1 className="mt-1 text-2xl font-bold text-navy-900">{text.title}</h1>
      <p className="mt-1 text-sm leading-relaxed text-navy-600">
        {text.subtitle}
        {step === 'code' && (
          <>
            {' '}
            If an account exists for <span className="font-semibold text-navy-900">{email}</span>, the code is on its way.
          </>
        )}
      </p>

      {formError && (
        <Notice tone="error" className="mt-5">
          {formError}
        </Notice>
      )}

      <div className="mt-6">
        {step === 'email' && (
          <form onSubmit={handleEmail} noValidate className="space-y-6">
            <TextField
              id="email"
              type="email"
              label="Email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={event => setEmail(event.target.value)}
              error={errors.email}
            />
            <Button type="submit" loading={loading} className="w-full">
              {loading ? 'Sending code' : 'Send code'}
            </Button>
          </form>
        )}

        {step === 'code' && (
          <OtpForm initialCooldown={resendIn} submitLabel="Verify code" onVerify={handleVerify} onResend={handleResend} />
        )}

        {step === 'password' && (
          <form onSubmit={handlePassword} noValidate className="space-y-4">
            <TextField
              id="new-password"
              type="password"
              label="New password"
              autoComplete="new-password"
              required
              value={password}
              onChange={event => setPassword(event.target.value)}
              error={errors.password}
            />
            <TextField
              id="confirm-password"
              type="password"
              label="Confirm new password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={event => setConfirm(event.target.value)}
              error={errors.confirm}
            />
            <Button type="submit" loading={loading} className="mt-2 w-full">
              {loading ? 'Updating password' : 'Update password'}
            </Button>
          </form>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-navy-600">
        Remembered it?{' '}
        <Link to="/login" className="font-semibold text-blue-700 hover:underline">
          Back to log in
        </Link>
      </p>
    </AuthShell>
  );
}
