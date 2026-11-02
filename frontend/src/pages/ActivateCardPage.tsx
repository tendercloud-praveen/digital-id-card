import { ArrowLeft, ArrowRight, BadgeCheck, Info, Keyboard, Loader2, Nfc, QrCode, RotateCcw } from 'lucide-react';
import { lazy, Suspense, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import CardGate from '@/components/card/CardGate';
import AppShell from '@/components/layout/AppShell';
import Button, { buttonClass } from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import { TextField } from '@/components/ui/Field';
import { useMyCard } from '@/hooks/useMyCard';
import { ApiError, errorMessage } from '@/lib/api';
import { formatCode, isCompleteCode, parseScan } from '@/lib/activationCode';
import { physicalCardApi, type ValidatedCard } from '@/lib/cardApi';
import { ACTIVATION } from '@/lib/flows';

// The QR decoder is only downloaded when this page opens.
const QrScanner = lazy(() => import('@/components/activation/QrScanner'));

type Mode = 'scan' | 'manual';

export default function ActivateCardPage() {
  return (
    <CardGate>
      <AppShell>
        <ActivateCard />
      </AppShell>
    </CardGate>
  );
}

function ActivateCard() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const prefilled = params.get('code') ? formatCode(params.get('code') ?? '') : '';
  const { card } = useMyCard();
  const savedSlug = card?.status === 'published' ? card.slug : null;

  const [mode, setMode] = useState<Mode>(prefilled ? 'manual' : 'scan');
  const [code, setCode] = useState(prefilled);
  const [checking, setChecking] = useState(false);
  // A ref, not state: it blocks a second request even within the same click burst.
  const inFlight = useRef(false);
  const [error, setError] = useState('');
  // Manual-entry problems are shown right under the input.
  const [codeError, setCodeError] = useState('');
  const [info, setInfo] = useState('');
  const [validated, setValidated] = useState<{ code: string; card: ValidatedCard } | null>(null);
  // Remounting the scanner gives a clean "scan again".
  const [scanKey, setScanKey] = useState(0);

  // Every code, scanned or typed, is checked by the backend before anything else happens.
  const check = async (value: string, source: Mode) => {
    if (inFlight.current) return; // one check at a time
    setError('');
    setCodeError('');
    setInfo('');
    const showProblem = source === 'manual' ? setCodeError : setError;
    if (!value.trim()) {
      showProblem('Enter your activation code.');
      return;
    }
    if (!isCompleteCode(value)) {
      showProblem('Activation codes have 12 letters and numbers, like ABCD-EFGH-JKMN.');
      return;
    }
    inFlight.current = true;
    setChecking(true);
    try {
      setValidated({ code: formatCode(value), card: await physicalCardApi.validate(value) });
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        setError('We could not reach the server. Check your connection and try again.');
      } else if (err instanceof ApiError && err.status < 500) {
        showProblem(errorMessage(err));
      } else {
        setError('Something went wrong while checking the card. Please try again.');
      }
    } finally {
      inFlight.current = false;
      setChecking(false);
    }
  };

  const handleScan = (text: string) => {
    const scanned = parseScan(text);
    if (scanned.kind === 'code') {
      setCode(scanned.code);
      void check(scanned.code, 'scan');
    } else if (scanned.kind === 'card-link') {
      setInfo(
        `That is the card's public QR code (TapCard ${scanned.publicId}), which anyone can scan to view a profile. To activate, scan the activation QR on the card insert, or type the activation code printed there.`
      );
    } else {
      setError('This QR code is not a TapCard activation code. Scan the activation QR on your card insert, or enter the code manually.');
    }
  };

  const handleManual = (event: FormEvent) => {
    event.preventDefault();
    void check(code, 'manual');
  };

  const startOver = () => {
    setValidated(null);
    setError('');
    setCodeError('');
    setInfo('');
    setCode('');
    setScanKey(k => k + 1);
  };

  const continueToDetails = () => {
    if (!validated) return;
    navigate(ACTIVATION.paths.profession, {
      state: { fresh: true, activation: { code: validated.code, publicId: validated.card.public_id, test: Boolean(validated.card.dev_test) } },
    });
  };

  return (
    <div className="mx-auto max-w-[720px] space-y-5">
      <div>
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-600 transition hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <h1 className="mt-2 text-[26px] font-extrabold leading-tight tracking-tight text-navy-900 sm:text-[30px]">Activate Your NFC Card</h1>
        <p className="mt-1 text-sm text-navy-600 sm:text-[15px]">
          Scan the activation QR code on your card insert, or enter the activation code. We check the card before anything is
          linked.
        </p>
      </div>

      {validated ? (
        <section className="rounded-[18px] bg-white p-5 shadow-sm ring-1 ring-navy-100 sm:p-7" aria-labelledby="confirm-title">
          <div className="flex items-start gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <BadgeCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 id="confirm-title" className="flex flex-wrap items-center gap-2 text-lg font-bold text-navy-900">
                {validated.card.dev_test ? 'Demo code accepted' : validated.card.status === 'yours' ? 'This card is already yours' : 'Card found'}
                {validated.card.dev_test && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">Test mode</span>
                )}
              </h2>
              <p className="mt-0.5 text-sm text-navy-600">{validated.card.message}</p>
            </div>
          </div>
          <dl className="mt-5 grid gap-3 rounded-xl bg-navy-50/70 p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-navy-500">NFC card</dt>
              <dd className="font-mono font-semibold uppercase text-navy-900">
                {validated.card.dev_test ? 'Demo test card' : `TapCard ${validated.card.public_id}`}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-navy-500">Status</dt>
              <dd className="font-semibold text-navy-900">
                {validated.card.dev_test ? 'Demo code (development only)' : validated.card.status === 'yours' ? 'Active on your account' : 'Ready to activate'}
              </dd>
            </div>
          </dl>
          {validated.card.dev_test && (
            <Notice tone="info" icon={Info} className="mt-4">
              Test mode: you can go through the full activation steps. Your digital card will be saved, but no physical NFC card is
              activated.
            </Notice>
          )}
          <p className="mt-4 text-sm text-navy-600">
            {validated.card.status === 'yours'
              ? 'You can update the digital card it opens, or view it as it is.'
              : 'Next, choose your profession, add your details and pick a design. The card is activated when you confirm on the last step.'}
          </p>
          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
            <Button onClick={continueToDetails} className="sm:px-6">
              {validated.card.status === 'yours' ? 'Update card details' : 'Continue'}
              <ArrowRight className="h-4 w-4" />
            </Button>
            {validated.card.status === 'yours' && savedSlug && (
              <Link to={`/cards/${savedSlug}`} className={buttonClass('secondary')}>
                View linked card
              </Link>
            )}
            <Button variant="ghost" onClick={startOver}>
              <RotateCcw className="h-4 w-4" />
              Use a different card
            </Button>
          </div>
        </section>
      ) : (
        <section className="rounded-[18px] bg-white p-5 shadow-sm ring-1 ring-navy-100 sm:p-7" aria-label="Identify your card">
          <div role="tablist" aria-label="How to identify the card" className="grid grid-cols-2 gap-2 rounded-xl bg-navy-50 p-1.5">
            {(
              [
                { id: 'scan', label: 'Scan QR code', icon: QrCode },
                { id: 'manual', label: 'Manual entry', icon: Keyboard },
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={mode === tab.id}
                onClick={() => {
                  setMode(tab.id);
                  setError('');
                  setInfo('');
                }}
                className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-2 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 sm:gap-2 sm:px-3 sm:text-sm ${
                  mode === tab.id ? 'bg-white text-navy-900 shadow-sm ring-1 ring-navy-100' : 'text-navy-600 hover:text-navy-900'
                }`}
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-5">
            {mode === 'scan' ? (
              <Suspense fallback={<div className="aspect-[4/3] w-full animate-pulse rounded-2xl bg-navy-100" />}>
                <QrScanner key={scanKey} onResult={handleScan} />
              </Suspense>
            ) : (
              <form onSubmit={handleManual} noValidate className="space-y-4">
                <TextField
                  id="activation-code"
                  label="Activation code"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder="ABCD-EFGH-JKMN"
                  value={code}
                  onChange={event => {
                    setCode(formatCode(event.target.value));
                    if (codeError) setCodeError('');
                  }}
                  error={codeError || undefined}
                  hint="The 12-character code printed on the insert that came with your card."
                  className="text-center font-mono text-lg uppercase tracking-[0.25em]"
                />
                <Button type="submit" loading={checking} className="w-full sm:w-auto sm:px-6">
                  {checking ? 'Checking card' : 'Check card'}
                </Button>
              </form>
            )}
          </div>

          {checking && mode === 'scan' && (
            <p className="mt-4 flex items-center gap-2 text-sm text-navy-600" role="status">
              <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
              Checking card
            </p>
          )}
          {info && (
            <Notice tone="info" icon={Info} className="mt-4">
              {info}
            </Notice>
          )}
          {error && (
            <Notice tone="error" className="mt-4">
              <p>{error}</p>
              <button type="button" onClick={startOver} className="mt-1 font-semibold underline">
                Try again
              </button>
            </Notice>
          )}

          <div className="mt-5 flex flex-col gap-2 border-t border-navy-100 pt-4 text-xs text-navy-500 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-1.5">
              <Nfc className="h-3.5 w-3.5" />
              Tapping the card with a phone is not needed to activate it.
            </span>
            <Link to="/dashboard" className="font-semibold text-navy-600 hover:text-navy-900">
              Cancel
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
