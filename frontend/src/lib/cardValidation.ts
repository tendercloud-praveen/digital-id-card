import { FIELDS, normalizeUrl, type Profession } from '@/lib/card';
import { isValidEmail, isValidPhone, isValidUrl } from '@/lib/validation';

// Validates the details step for a profession. Returns cleaned values and per-field errors.
// The backend repeats these checks; this gives instant inline feedback.
export function validateCardValues(profession: Profession, values: Record<string, string>) {
  const errors: Record<string, string> = {};
  const cleaned: Record<string, string> = { ...values };
  for (const field of FIELDS[profession]) {
    const raw = (values[field.key] ?? '').trim();
    cleaned[field.key] = raw;
    if (!raw) {
      if (field.required) errors[field.key] = `${field.label} is required.`;
      continue;
    }
    if (field.type === 'email' && !isValidEmail(raw)) errors[field.key] = 'Enter a valid email address, like you@example.com.';
    else if (field.type === 'tel' && !isValidPhone(raw)) errors[field.key] = 'Enter a valid phone number with 7 to 15 digits.';
    else if (field.type === 'url') {
      if (!isValidUrl(raw)) errors[field.key] = 'Enter a valid web address, such as example.com.';
      else cleaned[field.key] = normalizeUrl(raw);
    }
  }
  return { cleaned, errors };
}
