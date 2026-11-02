import { createContext } from 'react';
import type { Card } from '@/lib/card';
import type { CardInput, DesignInput } from '@/lib/cardApi';

export type MyCardContextValue = {
  status: 'loading' | 'ready' | 'error';
  card: Card | null;
  loadError: string;
  // Saves the wizard's card (POST). If it already exists, the saved card is loaded instead.
  createCard: (input: CardInput) => Promise<Card>;
  saveCard: (cardId: string, input: CardInput) => Promise<Card>;
  saveDesign: (cardId: string, design: DesignInput) => Promise<Card>;
  reload: () => void;
};

export const MyCardContext = createContext<MyCardContextValue | null>(null);
