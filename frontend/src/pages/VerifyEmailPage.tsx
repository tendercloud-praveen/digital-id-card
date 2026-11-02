import { MailCheck } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import AuthShell from '@/components/auth/AuthShell';
import OtpForm from '@/components/auth/OtpForm';
import Notice from '@/components/ui/Notice';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/lib/authApi';
import { safeNextPath } from '@/lib/flows';
import { isValidEmail } from '@/lib/validation';

type IncomingState = { resendIn?: number; otpSent?: boolean };

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { startSession } = useAuth();
  const email = (params.get('email') ?? '').trim().toLowerCase();
  const next = safeNextPath(params.get('next'));
  const { resendIn = 0, otpSent = true } = (location.state ?? {}) as IncomingState;

  if (!isValidEmail(email)) return <Navigate to="/register" replace />;

  const handleVerify = async (code: string) => {
    const session = await authApi.verifyEmail(email, code);
    startSession(session);
    navigate(next ?? '/dashboard', { replace: true });
  };

  const handleResend = async () => (await authApi.resendOtp(email, 'verify_email')).resend_available_in ?? 60;

  return (
    <AuthShell>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
        <MailCheck className="h-6 w-6" />
      </span>
      <h1 className="mt-5 text-2xl font-bold text-navy-900">Verify your email</h1>
      <p className="mt-1 text-sm leading-relaxed text-navy-600">
        {otpSent ? 'We sent a six-digit code to' : 'Your six-digit code will be sent to'}{' '}
        <span className="font-semibold text-navy-900">{email}</span>. It expires in 5 minutes.
      </p>
      {!otpSent && (
        <Notice tone="error" className="mt-5">
          Your account was created, but we could not send the email. Use “Resend code” below.
        </Notice>
      )}
      <div className="mt-6">
        <OtpForm initialCooldown={resendIn} submitLabel="Verify email" onVerify={handleVerify} onResend={handleResend} />
      </div>
      <p className="mt-6 text-center text-sm text-navy-600">
        Wrong email?{' '}
        <Link to="/register" className="font-semibold text-blue-700 hover:underline">
          Register again
        </Link>
      </p>
    </AuthShell>
  );
}
