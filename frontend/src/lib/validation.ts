import { normalizeUrl } from '@/lib/card';

export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

export const isValidPhone = (value: string) => /^\d{7,15}$/.test(value.replace(/[\s()+-]/g, ''));

export const isValidPassword = (value: string) => value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);

export function isValidUrl(value: string): boolean {
  try {
    return new URL(normalizeUrl(value)).hostname.includes('.');
  } catch {
    return false;
  }
}

const COMMON_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'live.com', 'rediffmail.com'];

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

// Suggests a fix for likely typos such as "gfmail.com" or "gmial.com".
export function suggestEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  const at = email.lastIndexOf('@');
  if (at < 1) return null;
  const domain = email.slice(at + 1);
  if (!domain.includes('.') || COMMON_EMAIL_DOMAINS.includes(domain)) return null;
  const match = COMMON_EMAIL_DOMAINS.find(known => editDistance(domain, known) <= 2);
  return match ? `${email.slice(0, at)}@${match}` : null;
}
