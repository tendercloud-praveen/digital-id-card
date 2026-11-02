import { BadgeCheck, CreditCard, ExternalLink, LayoutDashboard, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import CardDesign from '@/components/card/CardDesign';
import CardGate from '@/components/card/CardGate';
import AppShell from '@/components/layout/AppShell';
import { buttonClass } from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import { useMyCard } from '@/hooks/useMyCard';
import { errorMessage } from '@/lib/api';
import { professionLabel, toCardView } from '@/lib/card';
import { physicalCardApi, type ActivationResult, type PhysicalCard } from '@/lib/cardApi';
import { formatDate } from '@/lib/format';

export default function ActivationSuccessPage() {
  return (
    <CardGate>
      <AppShell>
        <ActivationSuccess />
      </AppShell>
    </CardGate>
  );
}

// Everything shown is confirmed with the server: the activated card is always
// re-read from the account, so a refresh or a stale history entry cannot show
// an activation that did not happen. The activation response only supplies its message.
function ActivationSuccess() {
  const { publicId = '' } = useParams();
  const location = useLocation();
  const result = (location.state as { result?: ActivationResult } | null)?.result ?? null;
  const { card: savedCard } = useMyCard();
  const [physical, setPhysical] = useState<PhysicalCard | null | undefined>(undefined);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (result?.dev_test) return; // a development test activates no physical card
    let cancelled = false;
    physicalCardApi
      .mine()
      .then(list => !cancelled && setPhysical(list.find(item => item.public_id === publicId) ?? null))
      .catch(error => !cancelled && setLoadError(errorMessage(error)));
    return () => {
      cancelled = true;
    };
  }, [publicId, result?.dev_test]);

  const digital = savedCard?.status === 'published' && savedCard.slug && savedCard.slug === physical?.digital_card_id ? savedCard : null;

  if (result?.dev_test) {
    return (
      <div className="mx-auto max-w-[720px] space-y-4 rounded-[18px] bg-white p-5 shadow-sm ring-1 ring-navy-100 sm:p-7">
        <h1 className="text-[22px] font-extrabold tracking-tight text-navy-900 sm:text-2xl">Demo test complete</h1>
        <Notice tone="info">{result.message}</Notice>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          {result.digital_card?.slug && (
            <Link to={`/card/${result.digital_card.slug}`} className={buttonClass('primary', 'sm:px-6')}>
              <ExternalLink className="h-4 w-4" />
              View Card
            </Link>
          )}
          <Link to="/dashboard" className={buttonClass('secondary')}>
            <LayoutDashboard className="h-4 w-4" />
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (loadError) return <Notice tone="error">{loadError}</Notice>;
  if (physical === undefined) {
    return (
      <p className="flex items-center gap-2 text-navy-600" role="status">
        <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
        Loading activation
      </p>
    );
  }
  if (physical === null) {
    return (
      <div className="mx-auto max-w-[720px] rounded-[18px] bg-white p-7 text-center shadow-sm ring-1 ring-navy-100">
        <CreditCard className="mx-auto h-8 w-8 text-navy-400" />
        <h1 className="mt-3 text-lg font-bold text-navy-900">Activation not found</h1>
        <p className="mt-1 text-sm text-navy-600">This card is not activated on your account.</p>
        <Link to="/activate-card" className={buttonClass('primary', 'mt-5', 'sm')}>
          Activate a card
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[720px] space-y-5">
      <section className="rounded-[18px] bg-white p-5 shadow-sm ring-1 ring-navy-100 sm:p-7" aria-labelledby="success-title">
        <div className="flex items-start gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <BadgeCheck className="h-6 w-6" />
          </span>
          <div>
            <h1 id="success-title" className="text-[22px] font-extrabold tracking-tight text-navy-900 sm:text-2xl">
              {result?.already_yours ? 'Your NFC card is up to date' : 'Your NFC card is activated'}
            </h1>
            <p className="mt-0.5 text-sm text-navy-600">
              {result?.message ?? 'This card is activated on your account.'} Tapping or scanning it now opens your digital card.
            </p>
          </div>
        </div>

        <dl className="mt-5 grid gap-3 rounded-xl bg-navy-50/70 p-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-navy-500">NFC card</dt>
            <dd className="font-mono font-semibold uppercase text-navy-900">TapCard {physical.public_id}</dd>
          </div>
          <div>
            <dt className="text-xs text-navy-500">Status</dt>
            <dd className="font-semibold text-emerald-700">Active</dd>
          </div>
          <div>
            <dt className="text-xs text-navy-500">Activated</dt>
            <dd className="font-semibold text-navy-900">{formatDate(physical.activated_at)}</dd>
          </div>
        </dl>

        {digital && digital.slug ? (
          <div className="mt-5 flex items-center gap-4 rounded-xl p-1">
            <div className="w-[110px] shrink-0 overflow-hidden rounded-lg bg-navy-50 p-1 ring-1 ring-navy-100" aria-hidden {...{ inert: '' }}>
              <div style={{ width: 400, zoom: 0.255 }}>
                <CardDesign view={toCardView(digital.values)} style={digital} />
              </div>
            </div>
            <dl className="min-w-0 space-y-1 text-xs">
              <dt className="text-navy-500">Linked digital card</dt>
              <dd className="truncate text-sm font-semibold text-navy-900">{digital.values.name}</dd>
              <dd className="text-navy-600">{professionLabel(digital.profession)}</dd>
              <dd className="break-all font-mono text-navy-700">{digital.slug}</dd>
            </dl>
          </div>
        ) : (
          <Notice tone="info" className="mt-5">
            This card is not linked to a published digital card yet.
          </Notice>
        )}

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          {digital?.slug && (
            <Link to={`/card/${digital.slug}`} className={buttonClass('primary', 'sm:px-6')}>
              <ExternalLink className="h-4 w-4" />
              View Card
            </Link>
          )}
          <Link to="/dashboard" className={buttonClass('secondary')}>
            <LayoutDashboard className="h-4 w-4" />
            Go to Dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}
