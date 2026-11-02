import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type Tone = 'info' | 'success' | 'error';

const TONES: Record<Tone, string> = {
  info: 'bg-blue-50 text-blue-900 ring-blue-200',
  success: 'bg-emerald-50 text-emerald-900 ring-emerald-200',
  error: 'bg-red-50 text-red-800 ring-red-200',
};

type Props = { tone?: Tone; icon?: LucideIcon; children: ReactNode; className?: string };

export default function Notice({ tone = 'info', icon: Icon, children, className = '' }: Props) {
  return (
    <div role="status" className={`flex gap-3 rounded-2xl p-4 text-sm ring-1 ${TONES[tone]} ${className}`}>
      {Icon && <Icon className="mt-0.5 h-5 w-5 shrink-0" />}
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}
