import { missingRequired, type Card } from '@/lib/card';

export type WizardPaths = { start: string; profession: string; profile: string; design: string; publish: string };

// The card-creation wizard.
export const WIZARD = {
  steps: ['Profession', 'Details', 'Design', 'Preview'],
  paths: {
    start: '/dashboard',
    profession: '/setup/profession',
    profile: '/setup/profile',
    design: '/setup/design',
    publish: '/setup/preview',
  } satisfies WizardPaths,
};

// NFC activation reuses the same wizard steps after the physical card is checked.
export const ACTIVATION = {
  start: '/activate-card',
  paths: {
    start: '/activate-card',
    profession: '/activate-card/profession',
    profile: '/activate-card/details',
    design: '/activate-card/design',
    publish: '/activate-card/preview',
  } satisfies WizardPaths,
  success: (publicId: string) => `/activate-card/success/${publicId}`,
};

// Where "Continue Editing" should take a user with an unfinished card.
export function nextWizardPath(card: Card | null): string {
  if (!card?.profession) return WIZARD.paths.profession;
  if (missingRequired(card).length > 0) return WIZARD.paths.profile;
  return WIZARD.paths.design;
}

// Only known in-app paths are accepted as a post-login destination, so a crafted
// link cannot send users to another site.
export function safeNextPath(next: string | null): string | null {
  return next && /^\/(dashboard|cards(\/[a-z0-9-]{1,60})?|setup\/[a-z]+|activate-card|activate(\?code=[A-Za-z0-9-]{1,20})?)$/.test(next) ? next : null;
}
