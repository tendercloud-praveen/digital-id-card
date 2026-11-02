import { AlertTriangle, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import SiteHeader from '@/components/layout/SiteHeader';
import Button from '@/components/ui/Button';
import { useMyCard } from '@/hooks/useMyCard';

// Shows a loading or error screen until the user's card has been fetched.
export default function CardGate({ children }: { children: ReactNode }) {
  const { status, loadError, reload } = useMyCard();
  if (status === 'ready') return <>{children}</>;
  return (
    <div className="min-h-screen bg-navy-50/60">
      <SiteHeader />
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        {status === 'loading' ? (
          <p className="flex items-center gap-3 text-navy-600" role="status">
            <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
            Loading your card
          </p>
        ) : (
          <div className="max-w-sm rounded-3xl bg-white p-8 text-center ring-1 ring-navy-100">
            <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
            <h1 className="mt-4 text-lg font-bold text-navy-900">We could not load your card</h1>
            <p className="mt-2 text-sm text-navy-600">{loadError}</p>
            <Button onClick={reload} className="mt-6 w-full">
              Try again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
