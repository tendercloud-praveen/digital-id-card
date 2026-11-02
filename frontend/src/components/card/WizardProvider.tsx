import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import CardGate from '@/components/card/CardGate';
import { useAuth } from '@/hooks/useAuth';
import { useMyCard } from '@/hooks/useMyCard';
import { DEFAULT_STYLE, type Card, type CardStyle, type Profession } from '@/lib/card';
import { ACTIVATION, WIZARD } from '@/lib/flows';
import { WizardContext, type ActivationTarget, type WizardData } from '@/lib/wizardContext';

type Flow = 'create' | 'activate';
type Stored = WizardData & { cardId: string | null; activation?: ActivationTarget | null };
type IncomingState = { fresh?: boolean; activation?: ActivationTarget } | null;

// Each journey keeps its own progress so creating and activating never mix.
const storageKey = (flow: Flow, userId: number) => `tapcard.${flow === 'activate' ? 'activate' : 'wizard'}.${userId}`;

function readStored(flow: Flow, userId: number, cardId: string | null): Stored | null {
  try {
    const raw = window.sessionStorage.getItem(storageKey(flow, userId));
    if (!raw) return null;
    const stored = JSON.parse(raw) as Stored;
    // Progress belongs to one card (or to "no card yet"); ignore it otherwise.
    return stored.cardId === cardId ? stored : null;
  } catch {
    return null;
  }
}

function fromCard(card: Card | null, defaults: Record<string, string>): WizardData {
  return {
    profession: card?.profession ?? null,
    values: { ...defaults, ...card?.values },
    style: card ? { template: card.template, theme: card.theme, font: card.font, animated: card.animated } : DEFAULT_STYLE,
  };
}

// Holds the card being created, edited or activated while the user moves
// between wizard steps. Nothing is saved to the server until the final step.
function WizardState({ flow, children }: { flow: Flow; children: ReactNode }) {
  const { user } = useAuth();
  const { card } = useMyCard();
  const isSaved = card?.status === 'published' && Boolean(card.slug);
  const cardId = isSaved ? (card?.slug ?? null) : null;
  const userId = user?.id ?? 0;
  const location = useLocation();
  const navigate = useNavigate();
  const incoming = location.state as IncomingState;
  // Dashboard edit links and the activation page pass { fresh: true } so the steps start from the saved card.
  const fresh = Boolean(incoming?.fresh);
  const cleared = useRef(false);

  const [initial] = useState(() => (fresh ? null : readStored(flow, userId, cardId)));
  const [activation] = useState<ActivationTarget | null>(() =>
    flow === 'activate' ? (incoming?.activation ?? initial?.activation ?? null) : null
  );

  // Drop the navigation state once used, so refreshing the page keeps the user's progress.
  useEffect(() => {
    if (incoming) navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [incoming, navigate, location.pathname, location.search]);

  const [data, setData] = useState<WizardData>(() => {
    if (initial) return initial;
    const defaults = { name: user?.full_name ?? '', email: user?.email ?? '', phone: user?.phone ?? '' };
    // A saved card (or a draft from the earlier step-by-step flow) pre-fills the steps.
    return fromCard(card, defaults);
  });

  useEffect(() => {
    if (cleared.current) return;
    try {
      window.sessionStorage.setItem(storageKey(flow, userId), JSON.stringify({ ...data, cardId, activation } satisfies Stored));
    } catch {
      // Storage unavailable: progress is still kept while the page stays open.
    }
  }, [data, cardId, userId, flow, activation]);

  const change = useCallback((update: (d: WizardData) => WizardData) => {
    cleared.current = false;
    setData(update);
  }, []);
  const setProfession = useCallback((profession: Profession) => change(d => ({ ...d, profession })), [change]);
  const setValue = useCallback((key: string, value: string) => change(d => ({ ...d, values: { ...d.values, [key]: value } })), [change]);
  const setValues = useCallback((values: Record<string, string>) => change(d => ({ ...d, values })), [change]);
  const setStyle = useCallback((style: CardStyle) => change(d => ({ ...d, style })), [change]);
  const clear = useCallback(() => {
    cleared.current = true;
    try {
      window.sessionStorage.removeItem(storageKey(flow, userId));
    } catch {
      // Nothing to clear.
    }
  }, [flow, userId]);

  const value = useMemo(
    () => ({
      ...data,
      mode: isSaved ? ('edit' as const) : ('create' as const),
      flow,
      paths: flow === 'activate' ? ACTIVATION.paths : WIZARD.paths,
      activation,
      cardId,
      setProfession,
      setValue,
      setValues,
      setStyle,
      clear,
    }),
    [data, isSaved, flow, activation, cardId, setProfession, setValue, setValues, setStyle, clear]
  );

  // The activation steps only make sense for a physical card that was checked first.
  if (flow === 'activate' && !activation) return <Navigate to={ACTIVATION.start} replace />;
  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export default function WizardProvider({ flow = 'create', children }: { flow?: Flow; children: ReactNode }) {
  return (
    <CardGate>
      <WizardState flow={flow}>{children}</WizardState>
    </CardGate>
  );
}
