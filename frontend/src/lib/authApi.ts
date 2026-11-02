import { apiRequest } from '@/lib/api';

export type User = { id: number; full_name: string; email: string; phone: string; is_verified: boolean };
export type OtpPurpose = 'verify_email' | 'password_reset';

export type TokenResponse = { access_token: string; token_type: 'bearer'; user: User };
export type RegisterResponse = { message: string; email: string; otp_sent: boolean; resend_available_in: number };
export type MessageResponse = { message: string; resend_available_in: number | null };

export type RegisterInput = {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  confirm_password: string;
};

const post = <T>(path: string, body: unknown) => apiRequest<T>(`/api/auth${path}`, { method: 'POST', body });

export const authApi = {
  register: (input: RegisterInput) => post<RegisterResponse>('/register', input),
  verifyEmail: (email: string, code: string) => post<TokenResponse>('/verify-email', { email, code }),
  resendOtp: (email: string, purpose: OtpPurpose) => post<MessageResponse>('/resend-otp', { email, purpose }),
  login: (email: string, password: string) => post<TokenResponse>('/login', { email, password }),
  me: () => apiRequest<User>('/api/auth/me', { auth: true }),
  forgotPassword: (email: string) => post<MessageResponse>('/forgot-password', { email }),
  verifyResetOtp: (email: string, code: string) => post<{ reset_token: string }>('/verify-reset-otp', { email, code }),
  resetPassword: (reset_token: string, password: string, confirm_password: string) =>
    post<MessageResponse>('/reset-password', { reset_token, password, confirm_password }),
};
