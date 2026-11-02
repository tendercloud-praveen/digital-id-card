import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, BadgeCheck, CirclePlus, ExternalLink, Info, Keyboard, Nfc, QrCode, ShieldCheck } from 'lucide-react';
import { lazy, Suspense, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SiteHeader from '@/components/layout/SiteHeader';
import Button, { buttonClass } from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import { TextField } from '@/components/ui/Field';
import { useAuth } from '@/hooks/useAuth';
import { errorMessage } from '@/lib/api';
import { formatCode, isCompleteCode, parseScan } from '@/lib/activationCode';
import type { Card } from '@/lib/card';
import { cardApi, physicalCardApi, type ActivationResult } from '@/lib/cardApi';
import { WIZARD, nextWizardPath } from '@/lib/flows';

// The QR decoder is only downloaded when someone opens the scanner.
const QrScanner = lazy(() => import('@/components/activation/QrScanner'));

type Mode = 'scan' | 'code';

export default function ActivatePage() {
  const { status } = useAuth();
  const [params] = useSearchParams();
  const initialCode = params.get('code') ? formatCode(params.get('code') ?? '') : '';

  return (
    <div className="min-h-screen bg-navy-50/60">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        {status === 'authenticated' && (
          <Link to="/dashboard" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-navy-600 transition hover:text-navy-900">
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        )}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-400 text-white shadow-lg shadow-fuchsia-500/25">
            <Nfc className="h-7 w-7" />
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">Activate your printed TapCard</h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-navy-600">
            Scan the activation QR code on your card insert, or type the 12-character activation code. We verify it and
            link the card to your account, so every tap and scan opens your digital card.
          </p>
        </motion.div>

        <div className="mt-8">
          {status === 'loading' ? (
            <div className="h-64 animate-pulse rounded-[2rem] bg-white ring-1 ring-navy-100" aria-label="Checking your session" />
          ) : status === 'anonymous' ? (
            <SignInPrompt code={initialCode} />
          ) : (
            <ActivationPanel initialCode={initialCode} />
          )}
        </div>
      </main>
    </div>
  );
}

function SignInPrompt({ code }: { code: string }) {
  const next = encodeURIComponent(code ? `/activate?code=${code}` : '/activate');
  return (
    <div className="space-y-5 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-navy-100 sm:p-8">
      <Notice tone="info" icon={ShieldCheck}>
        Log in or create a free account first. The card is linked to the account you activate it with, and you come straight
        back here afterwards{code ? ' with your code filled in' : ''}.
      </Notice>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link to={`/login?next=${next}`} className={buttonClass('primary', 'w-full')}>
          Log in to activate
        </Link>
        <Link to={`/register?next=${next}`} className={buttonClass('secondary', 'w-full')}>
          Create an account
        </Link>
      </div>
    </div>
  );
}

function ActivationPanel({ initialCode }: { initialCode: string }) {
  const [mode, setMode] = useState<Mode>(initialCode ? 'code' : 'scan');
  const [code, setCode] = useState(initialCode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [result, setResult] = useState<ActivationResult | null>(null);
  const [myCard, setMyCard] = useState<Card | null | undefined>(undefined);

  const activate = async (value: string) => {
    setError('');
    setInfo('');
    if (!isCompleteCode(value)) {
      setError('Enter all 12 characters of the activation code, like ABCD-EFGH-JKMN.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await physicalCardApi.activate(value);
      setResult(response);
      cardApi
        .getMine()
        .then(r => setMyCard(r.card))
        .catch(() => setMyCard(null));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleScan = (text: string) => {
    const scanned = parseScan(text);
    if (scanned.kind === 'code') {
      setCode(scanned.code);
      setMode('code');
      void activate(scanned.code);
    } else if (scanned.kind === 'card-link') {
      setMode('code');
      setInfo(
        `That is the card's public QR code (TapCard ${scanned.publicId}). To activate, scan the activation QR on the card insert or type the activation code printed there.`
      );
    } else {
      setError('That QR code is not a TapCard activation code. Scan the code on your card insert, or type it in.');
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void activate(code);
  };

  const reset = () => {
    setResult(null);
    setCode('');
    setError('');
    setInfo('');
    setMyCard(undefined);
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {result ? (
        <motion.div key="done" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <ActivationSuccess result={result} myCard={myCard} onAnother={reset} />
        </motion.div>
      ) : (
        <motion.div
          key="form"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-navy-100 sm:p-8"
        >
          <div role="tablist" aria-label="Activation method" className="grid grid-cols-2 gap-2 rounded-2xl bg-navy-50 p-1.5">
            {(
              [
                { id: 'scan', label: 'Scan QR code', icon: QrCode },
                { id: 'code', label: 'Enter code', icon: Keyboard },
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={mode === tab.id}
                onClick={() => setMode(tab.id)}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  mode === tab.id ? 'bg-white text-navy-900 shadow-sm ring-1 ring-navy-100' : 'text-navy-600 hover:text-navy-900'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {mode === 'scan' ? (
              <Suspense fallback={<div className="aspect-square w-full animate-pulse rounded-3xl bg-navy-100 sm:aspect-[4/3]" />}>
                <QrScanner onResult={handleScan} />
              </Suspense>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <TextField
                  id="activation-code"
                  label="Activation code"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder="ABCD-EFGH-JKMN"
                  value={code}
                  onChange={event => setCode(formatCode(event.target.value))}
                  hint="Printed on the insert that came with your card. Letters and numbers only."
                  className="text-center font-mono text-lg uppercase tracking-[0.25em]"
                />
                <Button type="submit" loading={submitting} className="w-full">
                  {submitting ? 'Verifying card' : 'Activate card'}
                  {!submitting && <ArrowRight className="h-4 w-4" />}
                </Button>
              </form>
            )}
          </div>

          {submitting && mode === 'scan' && (
            <p className="mt-4 text-center text-sm text-navy-600" role="status">
              Verifying card
            </p>
          )}
          {info && (
            <Notice tone="info" icon={Info} className="mt-5">
              {info}
            </Notice>
          )}
          {error && (
            <Notice tone="error" className="mt-5">
              {error}
            </Notice>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ActivationSuccess({
  result,
  myCard,
  onAnother,
}: {
  result: ActivationResult;
  myCard: Card | null | undefined;
  onAnother: () => void;
}) {
  const isLive = myCard?.status === 'published' && Boolean(myCard.slug);
  return (
    <div className="space-y-6 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-navy-100 sm:p-8">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <BadgeCheck className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-xl font-bold text-navy-900">{result.already_yours ? 'Already activated' : 'Card activated'}</h2>
          <p className="mt-1 text-navy-600">
            {result.message} Card ID <span className="font-mono font-semibold uppercase text-navy-900">{result.card.public_id}</span>.
          </p>
        </div>
      </div>

      {myCard === undefined ? (
        <div className="h-20 animate-pulse rounded-2xl bg-navy-100/60" aria-label="Loading next steps" />
      ) : isLive && myCard?.slug ? (
        <Notice tone="success">Taps and scans of this card now open your digital card.</Notice>
      ) : (
        <Notice tone="info" icon={Info}>
          {myCard
            ? 'Finish and publish your digital card so people who tap or scan this card see your profile.'
            : 'Create your digital card next, so people who tap or scan this card see your profile.'}
        </Notice>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {isLive && myCard?.slug ? (
          <Link to={`/card/${myCard.slug}`} className={buttonClass('primary', 'w-full')}>
            <ExternalLink className="h-4 w-4" />
            View my card
          </Link>
        ) : myCard ? (
          <Link to={nextWizardPath(myCard)} className={buttonClass('primary', 'w-full')}>
            Continue Editing
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <Link to={WIZARD.paths.profession} className={buttonClass('primary', 'w-full')}>
            <CirclePlus className="h-4 w-4" />
            Create a New Digital Card
          </Link>
        )}
        <Link to="/dashboard" className={buttonClass('secondary', 'w-full')}>
          Go to dashboard
        </Link>
      </div>
      <button type="button" onClick={onAnother} className="text-sm font-semibold text-blue-700 hover:underline">
        Activate another card
      </button>
    </div>
  );
}
