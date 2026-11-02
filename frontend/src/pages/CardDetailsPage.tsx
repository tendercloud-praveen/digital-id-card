import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, ExternalLink, Link2, Nfc, Palette, QrCode, ScanLine, SquarePen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import CardDesign from '@/components/card/CardDesign';
import CardGate from '@/components/card/CardGate';
import ShareLinkPanel from '@/components/card/ShareLinkPanel';
import AppShell from '@/components/layout/AppShell';
import { buttonClass } from '@/components/ui/Button';
import { useMyCard } from '@/hooks/useMyCard';
import { errorMessage } from '@/lib/api';
import { cardUrl, professionLabel, toCardView, type Card } from '@/lib/card';
import { physicalCardApi, type PhysicalCard } from '@/lib/cardApi';
import { WIZARD } from '@/lib/flows';
import { formatDate } from '@/lib/format';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay },
});

const panel = 'rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy-100';

export default function CardDetailsPage() {
  return (
    <CardGate>
      <AppShell>
        <CardDetails />
      </AppShell>
    </CardGate>
  );
}

function CardDetails() {
  const { cardId } = useParams();
  const { card } = useMyCard();
  // Users can only open their own saved card.
  const mine = card?.status === 'published' && card.slug && card.slug === cardId ? card : null;

  if (!mine) {
    return (
      <div className={`${panel} text-center`}>
        <CreditCard className="mx-auto h-8 w-8 text-navy-400" />
        <h1 className="mt-3 text-lg font-bold text-navy-900">Card not found</h1>
        <p className="mt-1 text-sm text-navy-600">This card does not exist or does not belong to your account.</p>
        <Link to="/cards" className={buttonClass('primary', 'mt-5', 'sm')}>
          Go to My Cards
        </Link>
      </div>
    );
  }
  return <SavedCard card={mine} />;
}

function SavedCard({ card }: { card: Card }) {
  const [printed, setPrinted] = useState<PhysicalCard[] | null>(null);
  const [printedError, setPrintedError] = useState('');
  const slug = card.slug as string;
  const url = cardUrl(card);

  useEffect(() => {
    let cancelled = false;
    physicalCardApi
      .mine()
      .then(list => !cancelled && setPrinted(list))
      .catch(error => !cancelled && setPrintedError(errorMessage(error)));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <Link to="/cards" className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-600 transition hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" />
          My Cards
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-navy-900">{card.values.name}</h1>
        <p className="text-sm text-navy-600">{professionLabel(card.profession)}</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_1fr]">
        <motion.section {...fadeUp(0.05)} className={`${panel} min-w-0`} aria-labelledby="my-card-title">
          <div className="flex items-center justify-between gap-2">
            <h2 id="my-card-title" className="text-base font-bold text-navy-900">
              Your digital card
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live
            </span>
          </div>
          <div className="mt-4 flex gap-4">
            <div className="w-[150px] shrink-0 overflow-hidden rounded-xl bg-navy-50 p-1.5 ring-1 ring-navy-100" aria-label="Card preview">
              <div style={{ width: 400, zoom: 0.3425 }}>
                <CardDesign view={toCardView(card.values)} style={card} />
              </div>
            </div>
            <dl className="min-w-0 space-y-2 text-xs">
              <div>
                <dt className="text-navy-500">Name</dt>
                <dd className="truncate text-sm font-semibold text-navy-900">{card.values.name}</dd>
              </div>
              <div>
                <dt className="text-navy-500">Profession</dt>
                <dd className="font-medium text-navy-800">{professionLabel(card.profession)}</dd>
              </div>
              <div>
                <dt className="text-navy-500">Card ID</dt>
                <dd className="break-all font-mono font-semibold text-navy-900">{card.card_id ?? slug}</dd>
              </div>
              <div>
                <dt className="text-navy-500">Status</dt>
                <dd className="font-medium text-emerald-700">Live since {formatDate(card.published_at)}</dd>
              </div>
            </dl>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <Link to={`/card/${slug}`} className={buttonClass('primary', 'w-full px-2', 'sm')}>
              <ExternalLink className="h-3.5 w-3.5" />
              View Card
            </Link>
            <Link to={WIZARD.paths.profession} state={{ fresh: true }} className={buttonClass('secondary', 'w-full px-2', 'sm')}>
              <SquarePen className="h-3.5 w-3.5" />
              Edit Card
            </Link>
            <Link to={`${WIZARD.paths.design}?mode=design`} state={{ fresh: true }} className={buttonClass('secondary', 'w-full px-2', 'sm')}>
              <Palette className="h-3.5 w-3.5" />
              Change Design
            </Link>
          </div>
        </motion.section>

        <motion.section {...fadeUp(0.1)} className={`${panel} min-w-0`} aria-labelledby="share-title">
          <h2 id="share-title" className="flex items-center gap-2 text-base font-bold text-navy-900">
            <QrCode className="h-4 w-4 text-violet-600" />
            Share your card
          </h2>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-navy-600">
            <Link2 className="h-3 w-3" />
            Anyone with this link or QR code can open your card.
          </p>
          <div className="mt-4">
            <ShareLinkPanel url={url} qrId="dashboard-qr" qrFilename={`${slug}-qr.png`} shareTitle={card.values.name} compact />
          </div>
        </motion.section>
      </div>

      <PrintedCards printed={printed} error={printedError} />
    </div>
  );
}

function PrintedCards({ printed, error }: { printed: PhysicalCard[] | null; error: string }) {
  return (
    <motion.section {...fadeUp(0.15)} className={panel} aria-labelledby="printed-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="printed-title" className="text-base font-bold text-navy-900">
          Printed cards
        </h2>
        <Link to="/activate" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline">
          <ScanLine className="h-3.5 w-3.5" />
          Activate a printed card
        </Link>
      </div>
      <p className="mt-0.5 text-xs text-navy-600">NFC and QR cards linked to your account open your digital card when tapped or scanned.</p>
      <div className="mt-3">
        {error ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : printed === null ? (
          <div className="h-10 animate-pulse rounded-xl bg-navy-100/70" aria-label="Loading printed cards" />
        ) : printed.length === 0 ? (
          <p className="flex items-center gap-2 rounded-xl bg-navy-50/70 px-3 py-2.5 text-sm text-navy-600">
            <CreditCard className="h-4 w-4 shrink-0 text-navy-400" />
            No printed cards linked yet.
          </p>
        ) : (
          <ul className="divide-y divide-navy-100">
            {printed.map(item => (
              <li key={item.public_id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                    <Nfc className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-mono text-xs font-semibold uppercase text-navy-900">TapCard {item.public_id}</p>
                    <p className="text-xs text-navy-600">Activated {formatDate(item.activated_at)}</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200">
                  Opens your digital card
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.section>
  );
}
