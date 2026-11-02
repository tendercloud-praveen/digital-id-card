import { CreditCard, MailWarning } from 'lucide-react';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import AuthShell from '@/components/auth/AuthShell';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import { TextField } from '@/components/ui/Field';
import { useAuth } from '@/hooks/useAuth';
import { ApiError, errorMessage } from '@/lib/api';
import { authApi } from '@/lib/authApi';
import { safeNextPath } from '@/lib/flows';
import { isValidEmail, isValidPassword, isValidPhone, suggestEmail } from '@/lib/validation';

type Mode = 'register' | 'login';
type Form = { name: string; email: string; phone: string; password: string; confirm: string };
type FormErrors = Partial<Record<keyof Form, string>>;

const EMPTY_FORM: Form = { name: '', email: '', phone: '', password: '', confirm: '' };

// Backend field names mapped to this form's field names.
const SERVER_FIELDS: Record<string, keyof Form> = {
  full_name: 'name',
  email: 'email',
  phone: 'phone',
  password: 'password',
  confirm_password: 'confirm',
};

const COPY = {
  register: {
    title: 'Create your account',
    subtitle: 'Enter your details. We will email you a six-digit code to verify your address.',
    submit: 'Create account',
    loading: 'Creating account',
    switchText: 'Already have an account?',
    switchTo: '/login',
    switchLabel: 'Log in',
  },
  login: {
    title: 'Welcome back',
    subtitle: 'Log in to manage your digital card.',
    submit: 'Log in',
    loading: 'Logging in',
    switchText: 'New to TapCard?',
    switchTo: '/register',
    switchLabel: 'Create an account',
  },
};

export type LoginNotice = { notice?: string; email?: string };

function validate(form: Form, mode: Mode): FormErrors {
  const errors: FormErrors = {};
  const isRegister = mode === 'register';
  if (isRegister && form.name.trim().length < 2) errors.name = 'Enter your full name.';
  if (!isValidEmail(form.email)) errors.email = 'Enter a valid email address.';
  if (isRegister && !isValidPhone(form.phone)) errors.phone = 'Enter a valid phone number.';
  if (isRegister && !isValidPassword(form.password)) {
    errors.password = 'Use at least 8 characters, including a letter and a number.';
  } else if (!isRegister && !form.password) {
    errors.password = 'Enter your password.';
  }
  if (isRegister && form.confirm !== form.password) errors.confirm = 'Passwords do not match.';
  return errors;
}

function verifyPath(email: string, next: string | null) {
  return `/verify-email?email=${encodeURIComponent(email)}${next ? `&next=${encodeURIComponent(next)}` : ''}`;
}

export default function AuthPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { status, startSession } = useAuth();
  const isRegister = mode === 'register';
  const copy = COPY[mode];
  // Where to go after signing in, e.g. back into the "Already Have a Card?" flow.
  const next = safeNextPath(useSearchParams()[0].get('next'));
  const incoming = (location.state ?? {}) as LoginNotice;

  const [form, setForm] = useState<Form>({ ...EMPTY_FORM, email: incoming.email ?? '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [sendingCode, setSendingCode] = useState(false);

  if (status === 'authenticated' && !submitting) return <Navigate to={next ?? '/dashboard'} replace />;

  const update = (key: keyof Form) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const applyServerError = (error: unknown) => {
    if (error instanceof ApiError) {
      const fieldErrors: FormErrors = {};
      for (const [field, message] of Object.entries(error.fields)) {
        const key = SERVER_FIELDS[field];
        if (key) fieldErrors[key] = message;
      }
      const conflictField = typeof error.data.field === 'string' ? SERVER_FIELDS[error.data.field] : undefined;
      if (conflictField) fieldErrors[conflictField] = error.message;
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        return;
      }
    }
    setFormError(errorMessage(error));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validate(form, mode);
    setErrors(nextErrors);
    setFormError('');
    setUnverifiedEmail(null);
    if (Object.keys(nextErrors).length > 0) return;

    const email = form.email.trim().toLowerCase();
    setSubmitting(true);
    try {
      if (isRegister) {
        const result = await authApi.register({
          full_name: form.name.trim(),
          email,
          phone: form.phone.trim(),
          password: form.password,
          confirm_password: form.confirm,
        });
        navigate(verifyPath(result.email, next), {
          state: { resendIn: result.resend_available_in, otpSent: result.otp_sent },
        });
      } else {
        startSession(await authApi.login(email, form.password));
        navigate(next ?? '/dashboard', { replace: true });
      }
    } catch (error) {
      setSubmitting(false);
      if (error instanceof ApiError && error.code === 'email_not_verified') {
        setUnverifiedEmail(email);
        return;
      }
      applyServerError(error);
    }
  };

  const handleSendVerification = async () => {
    if (!unverifiedEmail) return;
    setSendingCode(true);
    let resendIn = 0;
    try {
      resendIn = (await authApi.resendOtp(unverifiedEmail, 'verify_email')).resend_available_in ?? 0;
    } catch (error) {
      // A code sent moments ago is still valid, so continue to the verify page.
      if (!(error instanceof ApiError && error.code === 'otp_cooldown')) {
        setSendingCode(false);
        setFormError(errorMessage(error));
        return;
      }
      resendIn = Number(error.data.retry_after) || 0;
    }
    navigate(verifyPath(unverifiedEmail, next), { state: { resendIn, otpSent: true } });
  };

  const emailSuggestion = isRegister ? suggestEmail(form.email) : null;
  const switchTo = next ? `${copy.switchTo}?next=${encodeURIComponent(next)}` : copy.switchTo;

  return (
    <AuthShell>
      <form noValidate onSubmit={handleSubmit}>
        <h1 className="text-2xl font-bold text-navy-900">{copy.title}</h1>
        <p className="mt-1 text-sm text-navy-600">{copy.subtitle}</p>
        {next?.startsWith('/activate') && (
          <Notice tone="info" icon={CreditCard} className="mt-5">
            After this step you will continue activating your printed card.
          </Notice>
        )}
        {incoming.notice && (
          <Notice tone="success" className="mt-5">
            {incoming.notice}
          </Notice>
        )}

        <div className="mt-6 space-y-4">
          {isRegister && (
            <TextField
              id="name"
              label="Full name"
              autoComplete="name"
              required
              placeholder="Praveen Kumar"
              value={form.name}
              onChange={update('name')}
              error={errors.name}
            />
          )}
          <TextField
            id="email"
            type="email"
            label="Email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={form.email}
            onChange={update('email')}
            error={errors.email}
          />
          {emailSuggestion && (
            <p className="-mt-2 text-sm text-amber-800" role="status">
              Did you mean{' '}
              <button
                type="button"
                onClick={() => {
                  setForm(prev => ({ ...prev, email: emailSuggestion }));
                  setErrors(prev => ({ ...prev, email: undefined }));
                }}
                className="font-semibold text-blue-700 underline-offset-2 hover:underline"
              >
                {emailSuggestion}
              </button>
              ?
            </p>
          )}
          {isRegister && (
            <TextField
              id="phone"
              type="tel"
              label="Phone"
              autoComplete="tel"
              required
              placeholder="+1 555 123 4567"
              value={form.phone}
              onChange={update('phone')}
              error={errors.phone}
            />
          )}
          <TextField
            id="password"
            type="password"
            label="Password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            required
            value={form.password}
            onChange={update('password')}
            error={errors.password}
            hint={isRegister ? 'At least 8 characters, including a letter and a number.' : undefined}
          />
          {isRegister && (
            <TextField
              id="confirm"
              type="password"
              label="Confirm password"
              autoComplete="new-password"
              required
              value={form.confirm}
              onChange={update('confirm')}
              error={errors.confirm}
            />
          )}
          {!isRegister && (
            <p className="text-right text-sm">
              <Link to="/forgot-password" className="font-semibold text-blue-700 hover:underline">
                Forgot password?
              </Link>
            </p>
          )}
        </div>

        {formError && (
          <Notice tone="error" className="mt-5">
            {formError}
          </Notice>
        )}
        {unverifiedEmail && (
          <Notice tone="info" icon={MailWarning} className="mt-5">
            <p>Your email is not verified yet. We can send a new code to {unverifiedEmail}.</p>
            <Button
              variant="secondary"
              loading={sendingCode}
              onClick={handleSendVerification}
              className="mt-3 w-full"
            >
              {sendingCode ? 'Sending code' : 'Send verification code'}
            </Button>
          </Notice>
        )}

        <Button type="submit" loading={submitting} className="mt-6 w-full">
          {submitting ? copy.loading : copy.submit}
        </Button>

        <p className="mt-6 text-center text-sm text-navy-600">
          {copy.switchText}{' '}
          <Link to={switchTo} className="font-semibold text-blue-700 hover:underline">
            {copy.switchLabel}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
