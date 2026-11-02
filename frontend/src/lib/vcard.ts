import type { CardView } from '@/lib/card';

const escape = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, match => `\\${match}`);

export function buildVCard(view: CardView, url: string): string {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${escape(view.name)}`, `N:${escape(view.name)};;;;`];
  if (view.organization) lines.push(`ORG:${escape(view.organization)}`);
  if (view.headline) lines.push(`TITLE:${escape(view.headline)}`);
  if (view.phone) lines.push(`TEL;TYPE=WORK,VOICE:${view.phone}`);
  if (view.email) lines.push(`EMAIL;TYPE=WORK:${view.email}`);
  if (view.address) lines.push(`ADR;TYPE=WORK:;;${escape(view.address)};;;;`);
  if (view.description) lines.push(`NOTE:${escape(view.description)}`);
  lines.push(`URL:${url}`, 'END:VCARD');
  return lines.join('\r\n');
}
