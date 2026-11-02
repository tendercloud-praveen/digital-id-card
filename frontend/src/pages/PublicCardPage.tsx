import { motion } from 'framer-motion';
import { Copy, Loader2, Mail, MapPin, Phone, Share2, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import CardDesign from '@/components/card/CardDesign';
import Button, { buttonClass } from '@/components/ui/Button';
import CenteredMessage from '@/components/ui/CenteredMessage';
import Logo from '@/components/ui/Logo';
import Notice from '@/components/ui/Notice';
import { ApiError, errorMessage } from '@/lib/api';
import { cardUrl, toCardView } from '@/lib/card';
import { cardApi, type PublicCard } from '@/lib/cardApi';
import { copyText, downloadText, shareOrCopy } from '@/lib/browser';
import { buildVCard } from '@/lib/vcard';

export default function PublicCardPage() {
  const { slug = '' } = useParams();
  const [card, setCard] = useState<PublicCard | null>(null);
  const [error, setError] = useState<{ notFound: boolean; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCard(null);
    setError(null);
    cardApi
      .getPublic(slug)
      .then(result => !cancelled && setCard(result))
      .catch(err => {
        if (cancelled) return;
        setError({ notFound: err instanceof ApiError && err.status === 404, message: errorMessage(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error) {
    return error.notFound ? (
      <CenteredMessage title="Card not found" text="This card does not exist or has not been published yet." />
    ) : (
      <CenteredMessage title="Could not load this card" text={error.message} />
    );
  }
  if (!card) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-50/60" role="status">
        <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
        <span className="sr-only">Loading card</span>
      </div>
    );
  }
  return <PublicCardView card={card} />;
}

function PublicCardView({ card }: { card: PublicCard }) {
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const view = toCardView(card.values);
  const url = cardUrl(card);

  const contactActions = [
    { label: 'Call', icon: Phone, href: view.phone && `tel:${view.phone.replace(/[^\d+]/g, '')}` },
    { label: 'Email', icon: Mail, href: view.email && `mailto:${view.email}` },
    {
      label: 'Directions',
      icon: MapPin,
      href: view.address && `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(view.address)}`,
    },
  ].filter(action => action.href);

  const handleShare = async () => {
    const result = await shareOrCopy(view.name, url);
    if (result === 'cancelled') return;
    setFeedback(
      result === 'failed'
        ? { tone: 'error', text: 'Could not share. Copy the link instead.' }
        : { tone: 'success', text: result === 'shared' ? 'Shared successfully.' : 'Link copied to clipboard.' }
    );
  };

  const handleCopy = async () => {
    const ok = await copyText(url);
    setFeedback(
      ok
        ? { tone: 'success', text: 'Link copied to clipboard.' }
        : { tone: 'error', text: 'Could not copy automatically. Select the link and copy it.' }
    );
  };

  const handleSaveContact = () => {
    downloadText(`${card.slug}.vcf`, buildVCard(view, url), 'text/vcard');
    setFeedback({ tone: 'success', text: 'Contact file downloaded.' });
  };

  return (
    <div className="min-h-screen bg-navy-50/60">
      <header className="border-b border-navy-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <Link to="/" className="text-sm font-semibold text-blue-700 hover:underline">
            Create your own
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-10 sm:py-14">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <CardDesign view={view} style={card} />
        </motion.div>

        <div className="mt-8 grid gap-3">
          {contactActions.length > 0 && (
            <div className={`grid gap-3 ${contactActions.length === 1 ? 'grid-cols-1' : contactActions.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {contactActions.map(action => (
                <a
                  key={action.label}
                  href={action.href}
                  {...(action.label === 'Directions' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className={buttonClass('secondary', 'w-full px-3')}
                >
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </a>
              ))}
            </div>
          )}
          <Button onClick={handleShare}>
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={handleCopy} className="w-full">
              <Copy className="h-4 w-4" />
              Copy link
            </Button>
            <Button variant="secondary" onClick={handleSaveContact} className="w-full">
              <UserPlus className="h-4 w-4" />
              Save contact
            </Button>
          </div>
          {feedback && <Notice tone={feedback.tone} className="mt-2">{feedback.text}</Notice>}
        </div>
      </main>
    </div>
  );
}
