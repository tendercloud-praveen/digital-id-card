import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ApiError, errorMessage } from '@/lib/api';
import type { Card, Profession, TemplateId } from '@/lib/card';
import { cardApi, type CardInput, type DesignInput } from '@/lib/cardApi';
import { readLegacyCard, removeLegacyCard } from '@/lib/legacyCards';
import { MyCardContext } from '@/lib/myCardContext';

// Moves a card saved in this browser by an older version of TapCard to the account.
async function importLegacyCard(email: string): Promise<Card | null> {
  const legacy = readLegacyCard(email);
  if (!legacy) return null;
  let card = await cardApi.update({
    profession: legacy.profession as Profession,
    template: (legacy.template as TemplateId) ?? 'classic',
    values: legacy.values,
  });
  if (legacy.publishedAt) {
    try {
      card = await cardApi.publish(legacy.slug ?? undefined);
    } catch {
      // Incomplete old card: it stays a draft the user can finish.
    }
  }
  removeLegacyCard(email);
  return card;
}

export default function MyCardProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [card, setCard] = useState<Card | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setStatus('loading');
    (async () => {
      try {
        let mine = (await cardApi.getMine()).card;
        if (!mine) mine = await importLegacyCard(user.email).catch(() => null);
        if (cancelled) return;
        setCard(mine);
        setStatus('ready');
      } catch (error) {
        if (cancelled) return;
        setLoadError(errorMessage(error));
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, attempt]);

  const createCard = useCallback(async (input: CardInput) => {
    try {
      const saved = await cardApi.create(input);
      setCard(saved);
      return saved;
    } catch (error) {
      // A retry after a lost response: the card was already saved, so use it.
      if (error instanceof ApiError && error.code === 'card_exists') {
        const existing = (await cardApi.getMine()).card;
        if (existing) {
          setCard(existing);
          return existing;
        }
      }
      throw error;
    }
  }, []);

  const saveCard = useCallback(async (cardId: string, input: CardInput) => {
    const saved = await cardApi.replace(cardId, input);
    setCard(saved);
    return saved;
  }, []);

  const saveDesign = useCallback(async (cardId: string, design: DesignInput) => {
    const saved = await cardApi.changeDesign(cardId, design);
    setCard(saved);
    return saved;
  }, []);

  const reload = useCallback(() => setAttempt(a => a + 1), []);

  const value = useMemo(
    () => ({ status, card, loadError, createCard, saveCard, saveDesign, reload }),
    [status, card, loadError, createCard, saveCard, saveDesign, reload]
  );
  return <MyCardContext.Provider value={value}>{children}</MyCardContext.Provider>;
}
