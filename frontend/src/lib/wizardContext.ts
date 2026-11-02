import { createContext } from 'react';
import type { CardStyle, Profession } from '@/lib/card';
import type { WizardPaths } from '@/lib/flows';

export type WizardData = { profession: Profession | null; values: Record<string, string>; style: CardStyle };

// The physical card being activated (only in the NFC activation flow).
// `test` marks the development demo code: no physical card is activated.
export type ActivationTarget = { code: string; publicId: string; test?: boolean };

export type WizardContextValue = WizardData & {
  // "create" until the user has a saved card; then the wizard edits that card.
  mode: 'create' | 'edit';
  // Which journey these steps belong to: card creation or NFC card activation.
  flow: 'create' | 'activate';
  paths: WizardPaths;
  activation: ActivationTarget | null;
  cardId: string | null;
  setProfession: (profession: Profession) => void;
  setValue: (key: string, value: string) => void;
  setValues: (values: Record<string, string>) => void;
  setStyle: (style: CardStyle) => void;
  // Forget unsaved wizard progress (after a successful save, or to start over).
  clear: () => void;
};

export const WizardContext = createContext<WizardContextValue | null>(null);
