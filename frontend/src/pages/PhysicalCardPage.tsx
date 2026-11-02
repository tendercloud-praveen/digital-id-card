import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { buttonClass } from '@/components/ui/Button';
import { ApiError, errorMessage } from '@/lib/api';
import { physicalCardApi, type PhysicalCardStatus } from '@/lib/cardApi';
import CenteredMessage from '@/components/ui/CenteredMessage';

// Opened by tapping (NFC) or scanning the QR printed on a TapCard.
export default function PhysicalCardPage() {
  const { publicId = '' } = useParams();
  const [state, setState] = useState<PhysicalCardStatus | null>(null);
  const [error, setError] = useState<{ notFound: boolean; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    physicalCardApi
      .status(publicId)
      .then(result => !cancelled && setState(result))
      .catch(err => {
        if (!cancelled) setError({ notFound: err instanceof ApiError && err.status === 404, message: errorMessage(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [publicId]);

  if (error) {
    return error.notFound ? (
      <CenteredMessage title="Card not found" text="This TapCard does not exist. Check that you scanned the right card." />
    ) : (
      <CenteredMessage title="Could not open this card" text={error.message} />
    );
  }
  if (!state) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-50/60" role="status">
        <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
        <span className="sr-only">Opening card</span>
      </div>
    );
  }
  if (state.status === 'activated' && state.slug) return <Navigate to={`/card/${state.slug}`} replace />;
  if (state.status === 'activated') {
    return (
      <CenteredMessage
        title="This card is not set up yet"
        text="This TapCard is activated, but its owner has not published their digital card yet. Please check back soon."
      />
    );
  }
  return (
    <CenteredMessage
      title="This TapCard is not activated yet"
      text="Is this your card? Activate it with the code on the card insert to link it to your profile."
      action={
        <Link to="/activate" className={buttonClass('primary')}>
          Activate this card
        </Link>
      }
    />
  );
}
