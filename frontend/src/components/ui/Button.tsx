import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'sm' | 'lg';

const BASE =
  'inline-flex items-center justify-center transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 bg-[length:200%_200%] text-white shadow-lg shadow-violet-600/30 hover:shadow-xl hover:shadow-fuchsia-500/30 hover:bg-right',
  secondary: 'bg-white/90 text-navy-800 shadow-sm ring-1 ring-violet-200 hover:bg-white hover:shadow-md hover:ring-violet-300',
  ghost: 'text-navy-700 hover:bg-violet-50 hover:text-violet-700',
};

const SIZES: Record<Size, string> = {
  md: 'gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold',
  sm: 'gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold',
  lg: 'h-12 gap-2 rounded-xl px-7 text-[15px] font-medium',
};

export function buttonClass(variant: Variant = 'primary', extra = '', size: Size = 'md') {
  return [BASE, SIZES[size], VARIANTS[variant], extra].join(' ');
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean; size?: Size };

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  disabled,
  children,
  type = 'button',
  ...rest
}: Props) {
  return (
    <button type={type} disabled={disabled || loading} className={buttonClass(variant, className, size)} {...rest}>
      {loading && <Loader2 className={size === 'sm' ? 'h-3.5 w-3.5 animate-spin' : 'h-4 w-4 animate-spin'} />}
      {children}
    </button>
  );
}
