// Codes are 12 letters/digits shown as XXXX-XXXX-XXXX. Every letter and digit is
// kept so nothing the user types is silently dropped; the backend decides
// whether a code is valid (issued codes avoid 0/O and 1/I/L to prevent mix-ups).
const CODE_CHARS = /[^A-Z0-9]/g;

export function cleanCode(value: string): string {
  return value.toUpperCase().replace(CODE_CHARS, '').slice(0, 12);
}

export function formatCode(value: string): string {
  return (cleanCode(value).match(/.{1,4}/g) ?? []).join('-');
}

export const isCompleteCode = (value: string) => cleanCode(value).length === 12;

export type ScanResult = { kind: 'code'; code: string } | { kind: 'card-link'; publicId: string } | { kind: 'unknown' };

// Understands the activation QR (".../activate?code=XXXX-XXXX-XXXX"), a bare
// code, and the card's own public QR (".../c/<id>"), which cannot activate.
export function parseScan(text: string): ScanResult {
  const trimmed = text.trim();
  try {
    const url = new URL(trimmed);
    const code = url.searchParams.get('code');
    if (code && isCompleteCode(code)) return { kind: 'code', code: formatCode(code) };
    const card = url.pathname.match(/^\/c\/([a-z0-9]+)\/?$/i);
    if (card) return { kind: 'card-link', publicId: card[1].toLowerCase() };
    return { kind: 'unknown' };
  } catch {
    const compact = trimmed.toUpperCase().replace(/[\s-]/g, '');
    return /^[A-Z0-9]{12}$/.test(compact)
      ? { kind: 'code', code: formatCode(compact) }
      : { kind: 'unknown' };
  }
}
