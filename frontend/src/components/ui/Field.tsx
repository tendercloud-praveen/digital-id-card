import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

export const inputClass =
  'w-full rounded-xl border border-navy-200 bg-white px-4 py-3 text-sm text-navy-900 placeholder:text-navy-400 transition duration-200 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/15';

const errorClass = 'border-red-400 focus:border-red-500 focus:ring-red-500/15';

type Props = {
  id: string;
  label: string;
  required?: boolean;
  // Shows "(optional)" after the label; only used where optional fields need calling out.
  optional?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
};

export function Field({ id, label, required, optional, error, hint, children }: Props) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-navy-800">
        {label}
        {required && <span className="text-blue-600"> *</span>}
        {optional && !required && <span className="font-normal text-navy-500"> (optional)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-navy-500">{hint}</p>
      ) : null}
    </div>
  );
}

type CommonProps = { id: string; label: string; error?: string; hint?: string; optional?: boolean };

export function TextField({
  id,
  label,
  error,
  hint,
  optional,
  className = '',
  ...rest
}: CommonProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field id={id} label={label} required={rest.required} optional={optional} error={error} hint={hint}>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${inputClass} ${error ? errorClass : ''} ${className}`}
        {...rest}
      />
    </Field>
  );
}

export function TextAreaField({
  id,
  label,
  error,
  hint,
  optional,
  className = '',
  ...rest
}: CommonProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field id={id} label={label} required={rest.required} optional={optional} error={error} hint={hint}>
      <textarea
        id={id}
        rows={4}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${inputClass} resize-y ${error ? errorClass : ''} ${className}`}
        {...rest}
      />
    </Field>
  );
}
