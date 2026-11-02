import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { buttonClass } from '@/components/ui/Button';
import Logo from '@/components/ui/Logo';

export default function CenteredMessage({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-navy-50/60 p-6 text-center">
      <Logo />
      <h1 className="text-2xl font-bold text-navy-900">{title}</h1>
      <p className="max-w-sm text-navy-600">{text}</p>
      {action ?? (
        <Link to="/" className={buttonClass('primary')}>
          Go to TapCard
        </Link>
      )}
    </div>
  );
}
