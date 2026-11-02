import { Copy, Download, Share2 } from 'lucide-react';
import { useState } from 'react';
import QrCode from '@/components/card/QrCode';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import { copyText, downloadQr, shareOrCopy } from '@/lib/browser';

type Props = { url: string; qrId: string; qrFilename: string; compact?: boolean; shareTitle?: string };

export default function ShareLinkPanel({ url, qrId, qrFilename, compact = false, shareTitle = 'My digital card' }: Props) {
  // Only offered where the browser has a native share sheet (mostly phones).
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const handleCopy = async () => {
    const ok = await copyText(url);
    setFeedback(
      ok
        ? { tone: 'success', text: 'Link copied to clipboard.' }
        : { tone: 'error', text: 'Could not copy automatically. Select the link and copy it.' }
    );
  };

  const handleShare = async () => {
    const result = await shareOrCopy(shareTitle, url);
    if (result === 'cancelled') return;
    setFeedback(
      result === 'failed'
        ? { tone: 'error', text: 'Could not share. Copy the link instead.' }
        : { tone: 'success', text: result === 'shared' ? 'Shared successfully.' : 'Link copied to clipboard.' }
    );
  };

  const handleDownload = () => {
    downloadQr(qrId, qrFilename);
    setFeedback({ tone: 'success', text: 'QR code downloaded.' });
  };

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <QrCode id={qrId} value={url} size={84} />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">Card link</p>
            <p title={url} className="truncate rounded-lg bg-navy-50 px-3 py-2 font-mono text-xs text-navy-800">
              {url}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={handleCopy}>
                <Copy className="h-3.5 w-3.5" />
                Copy link
              </Button>
              <Button variant="secondary" size="sm" onClick={handleDownload}>
                <Download className="h-3.5 w-3.5" />
                Download QR
              </Button>
              {canShare && (
                <Button variant="secondary" size="sm" onClick={handleShare}>
                  <Share2 className="h-3.5 w-3.5" />
                  Share
                </Button>
              )}
            </div>
          </div>
        </div>
        {feedback && (
          <Notice tone={feedback.tone} className="py-2.5 text-xs">
            {feedback.text}
          </Notice>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-navy-900">Your digital card link</p>
        <p className="mt-2 break-all rounded-xl bg-navy-50 px-4 py-3 font-mono text-sm text-navy-800">{url}</p>
      </div>
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <QrCode id={qrId} value={url} size={140} />
        <div className="grid w-full gap-3">
          <Button variant="secondary" onClick={handleCopy} className="w-full">
            <Copy className="h-4 w-4" />
            Copy link
          </Button>
          <Button variant="secondary" onClick={handleDownload} className="w-full">
            <Download className="h-4 w-4" />
            Download QR code
          </Button>
        </div>
      </div>
      {feedback && <Notice tone={feedback.tone}>{feedback.text}</Notice>}
    </div>
  );
}
