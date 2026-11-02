// Before cards were stored on the server they lived in this browser under
// "tapcard.demo". These helpers let the dashboard move such a card to the
// user's account once, then remove the local copy.
const STORAGE_KEY = 'tapcard.demo';

export type LegacyCard = {
  profession: string | null;
  template?: string;
  values: Record<string, string>;
  slug: string | null;
  publishedAt: string | null;
};

type Store = { accounts?: Record<string, { card?: LegacyCard }> };

function readStore(): Store | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Store) : null;
  } catch {
    return null;
  }
}

export function readLegacyCard(email: string): LegacyCard | null {
  const card = readStore()?.accounts?.[email]?.card;
  return card?.profession ? card : null;
}

export function removeLegacyCard(email: string) {
  const store = readStore();
  if (!store?.accounts?.[email]) return;
  delete store.accounts[email];
  try {
    if (Object.keys(store.accounts).length === 0) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Leaving the copy behind is harmless; it is ignored once the server has a card.
  }
}
