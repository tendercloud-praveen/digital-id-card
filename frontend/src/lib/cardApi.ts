import { apiRequest } from '@/lib/api';
import type { Card, CardStyle, FontId, Profession, TemplateId, ThemeId } from '@/lib/card';

export type CardUpdate = Partial<CardStyle> & { profession?: Profession; values?: Record<string, string> };
export type PublicCard = Pick<Card, 'profession' | 'template' | 'theme' | 'font' | 'animated' | 'values'> & { slug: string; public_url: string };

// What the creation wizard sends when the user saves the card.
export type CardInput = {
  profession: Profession;
  design_id: TemplateId;
  theme: ThemeId;
  font: FontId;
  animated: boolean;
  values: Record<string, string>;
};
export type DesignInput = { design_id: TemplateId; theme: ThemeId; font: FontId; animated: boolean };
export type PhysicalCard = { public_id: string; activated_at: string | null; digital_card_id?: string | null };
export type ValidatedCard = { public_id: string; status: 'available' | 'yours'; message: string; dev_test?: boolean };
export type ActivationResult = { message: string; card: PhysicalCard; already_yours: boolean; digital_card?: Card | null; dev_test?: boolean };
export type PhysicalCardStatus = { status: 'unactivated' | 'activated'; slug: string | null };

export const cardApi = {
  getMine: () => apiRequest<{ card: Card | null }>('/api/cards/me', { auth: true }),
  // Saves the wizard's card; the server generates the card ID and public URL.
  create: (input: CardInput) => apiRequest<Card>('/api/cards', { method: 'POST', body: input, auth: true }),
  replace: (cardId: string, input: CardInput) =>
    apiRequest<Card>(`/api/cards/${encodeURIComponent(cardId)}`, { method: 'PUT', body: input, auth: true }),
  changeDesign: (cardId: string, design: DesignInput) =>
    apiRequest<Card>(`/api/cards/${encodeURIComponent(cardId)}/design`, { method: 'PATCH', body: design, auth: true }),
  update: (changes: CardUpdate) => apiRequest<Card>('/api/cards/me', { method: 'PATCH', body: changes, auth: true }),
  publish: (preferredSlug?: string) =>
    apiRequest<Card>('/api/cards/me/publish', {
      method: 'POST',
      body: preferredSlug ? { preferred_slug: preferredSlug } : {},
      auth: true,
    }),
  getPublic: (slug: string) => apiRequest<PublicCard>(`/api/public/cards/${encodeURIComponent(slug)}`),
};

export const physicalCardApi = {
  // Checks a code without activating anything.
  validate: (code: string) =>
    apiRequest<ValidatedCard>('/api/physical-cards/validate', { method: 'POST', body: { code }, auth: true }),
  // With `card`, the backend saves the digital card and links it in the same transaction.
  activate: (code: string, card?: CardInput) =>
    apiRequest<ActivationResult>('/api/physical-cards/activate', { method: 'POST', body: card ? { code, card } : { code }, auth: true }),
  mine: () => apiRequest<PhysicalCard[]>('/api/physical-cards/me', { auth: true }),
  status: (publicId: string) =>
    apiRequest<PhysicalCardStatus>(`/api/public/physical-cards/${encodeURIComponent(publicId)}`),
};
