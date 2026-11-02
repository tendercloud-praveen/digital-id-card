import { ArrowRight, CircleCheck, CreditCard, Nfc, ScanLine } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import CardGate from '@/components/card/CardGate';
import AppShell from '@/components/layout/AppShell';
import { buttonClass } from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import { useAuth } from '@/hooks/useAuth';
import { useMyCard } from '@/hooks/useMyCard';
import { ACTIVATION, WIZARD } from '@/lib/flows';

// CardGate shows the loading and error states until the server has answered
// whether this user has a saved card.
export default function DashboardPage() {
  return (
    <CardGate>
      <AppShell>
        <Dashboard />
      </AppShell>
    </CardGate>
  );
}


const SAVED_MESSAGES: Record<string, string> = {
  created: 'Your digital card is saved. You can find it under My Cards.',
  updated: 'Your changes are saved.',
  design: 'Your new design is saved.',
};

// The dashboard always offers "Create Your Digital Card". Saved cards are
// reached through My Cards in the sidebar.
function Dashboard() {
  const { user } = useAuth();
  const { card } = useMyCard();
  const location = useLocation();
  const savedMessage = SAVED_MESSAGES[(location.state as { saved?: string } | null)?.saved ?? ''];
  const hasSavedCard = card?.status === 'published' && Boolean(card.slug);
  const hasDraft = Boolean(card) && !hasSavedCard;
  if (!user) return null;

  return (
    <div className="mx-auto max-w-[880px] space-y-5">
      {savedMessage && (
        <Notice tone="success" icon={CircleCheck}>
          {savedMessage}
        </Notice>
      )}

      <header>
        <p className="text-xs font-semibold text-violet-700">Welcome, {user.full_name.split(' ')[0]}</p>
        <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight text-navy-900 sm:text-[32px]">
          Welcome to <span className="text-gradient">TapCard</span>
        </h1>
        <p className="mt-1 text-sm text-navy-600 sm:text-[15px]">Your professional identity, all in one place.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <section aria-labelledby="create-card-title" className="flex flex-col rounded-[18px] bg-white p-5 shadow-sm ring-1 ring-navy-100 sm:p-6">
          <div className="flex items-start gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-sm shadow-fuchsia-500/30">
              <CreditCard className="h-5 w-5" />
            </span>
            <h2 id="create-card-title" className="pt-1.5 text-lg font-bold text-navy-900">
              Create Your Digital Card
            </h2>
          </div>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-navy-600">
            Create a new digital business card with your professional details and preferred design.
          </p>
          <Link
            to={WIZARD.paths.profession}
            state={hasSavedCard ? { fresh: true } : undefined}
            className={buttonClass('primary', 'mt-5 w-full', 'lg')}
          >
            Create Your Digital Card
            <ArrowRight className="h-4 w-4" />
          </Link>
          {hasSavedCard && (
            <p className="mt-2.5 text-[13px] text-navy-500">
              Already have a card? Manage it in{' '}
              <Link to="/cards" className="font-semibold text-violet-700 hover:underline focus-visible:underline focus-visible:outline-none">
                My Cards
              </Link>
              .
            </p>
          )}
          {hasDraft && <p className="mt-2.5 text-[13px] text-navy-500">Your earlier progress is kept, so you can pick up where you left off.</p>}
        </section>

        <section aria-labelledby="activate-nfc-title" className="flex flex-col rounded-[18px] bg-white p-5 shadow-sm ring-1 ring-navy-100 sm:p-6">
          <div className="flex items-start gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white shadow-sm shadow-violet-500/30">
              <Nfc className="h-5 w-5" />
            </span>
            <h2 id="activate-nfc-title" className="pt-1.5 text-lg font-bold text-navy-900">
              Activate Your NFC Card
            </h2>
          </div>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-navy-600">
            Already have a physical TapCard NFC card? Scan its QR code to connect it to your digital profile.
          </p>
          <Link to={ACTIVATION.start} className={buttonClass('secondary', 'mt-5 w-full', 'lg')}>
            <ScanLine className="h-4 w-4" />
            Activate Your NFC Card
          </Link>
        </section>
      </div>
    </div>
  );
}
