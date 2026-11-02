import { motion } from 'framer-motion';
import { Nfc, Palette, PenLine, RotateCw, Save } from 'lucide-react';
import { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import CardDesign from '@/components/card/CardDesign';
import SetupLayout from '@/components/layout/SetupLayout';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import { useMyCard } from '@/hooks/useMyCard';
import { useWizard } from '@/hooks/useWizard';
import { ApiError, errorMessage } from '@/lib/api';
import { FIELDS, professionLabel, themeById, toCardView, TEMPLATES, type Profession } from '@/lib/card';
import { physicalCardApi, type CardInput } from '@/lib/cardApi';
import { validateCardValues } from '@/lib/cardValidation';
import { ACTIVATION } from '@/lib/flows';

export default function PreviewPage() {
  const { profession, paths } = useWizard();
  if (!profession) return <Navigate to={paths.profession} replace />;
  return <PreviewAndSave profession={profession} />;
}

function PreviewAndSave({ profession }: { profession: Profession }) {
  const navigate = useNavigate();
  const { values, style, mode, cardId, clear, flow, paths, activation } = useWizard();
  const { createCard, saveCard, reload } = useMyCard();
  const activating = flow === 'activate' && activation !== null;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldProblems, setFieldProblems] = useState<string[]>([]);
  const inFlight = useRef(false);
  const labels = Object.fromEntries(FIELDS[profession].map(f => [f.key, f.label]));
  const filled = FIELDS[profession].filter(f => f.type !== 'image' && values[f.key]?.trim());

  const handleSave = async () => {
    if (inFlight.current) return; // ignore double clicks while saving
    setError('');
    setFieldProblems([]);

    const { cleaned, errors } = validateCardValues(profession, values);
    if (Object.keys(errors).length > 0) {
      setFieldProblems(Object.keys(errors).map(key => `${labels[key] ?? key}: ${errors[key]}`));
      return;
    }

    const input: CardInput = {
      profession,
      design_id: style.template,
      theme: style.theme,
      font: style.font,
      animated: style.animated,
      values: Object.fromEntries(Object.entries(cleaned).filter(([, value]) => value)),
    };

    inFlight.current = true;
    setSaving(true);
    try {
      if (activating) {
        // The backend checks the card again, saves the profile and links both in one transaction.
        const result = await physicalCardApi.activate(activation.code, input);
        clear();
        reload();
        navigate(ACTIVATION.success(result.card.public_id), { replace: true, state: { result } });
        return;
      }
      if (mode === 'edit' && cardId) await saveCard(cardId, input);
      else await createCard(input);
      clear();
      navigate('/dashboard', { replace: true, state: { saved: mode === 'edit' ? 'updated' : 'created' } });
    } catch (err) {
      inFlight.current = false;
      setSaving(false);
      if (err instanceof ApiError && Object.keys(err.fields).length > 0) {
        setFieldProblems(Object.entries(err.fields).map(([key, message]) => `${labels[key] ?? key}: ${message}`));
      }
      setError(
        err instanceof ApiError && err.status === 0
          ? 'We could not reach the server. Your details are still here. Check your connection and try again.'
          : errorMessage(err)
      );
    }
  };

  return (
    <SetupLayout
      step={3}
      title={activating ? 'Preview and activate' : mode === 'edit' ? 'Review your changes' : 'Preview your digital card'}
      subtitle={
        activating
          ? 'Check your card. Activating links your NFC card to this digital card.'
          : 'Check everything carefully. You can go back and change anything before saving.'
      }
      wide
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-br from-navy-100/70 to-white p-5 ring-1 ring-navy-100 sm:p-7"
        >
          <div className="mx-auto max-w-md">
            <CardDesign view={toCardView(values)} style={style} />
          </div>
        </motion.div>

        <div className="space-y-4">
          <section className="rounded-2xl bg-white p-5 ring-1 ring-navy-100">
            <h2 className="text-sm font-semibold text-navy-900">Summary</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {activating && (
                <div className="flex justify-between gap-4">
                  <dt className="text-navy-500">NFC card</dt>
                  <dd className="font-mono font-semibold uppercase text-navy-900">{activation.test ? 'Demo test card' : `TapCard ${activation.publicId}`}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-navy-500">Profession</dt>
                <dd className="font-medium text-navy-900">{professionLabel(profession)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-navy-500">Design</dt>
                <dd className="font-medium text-navy-900">
                  {TEMPLATES.find(t => t.id === style.template)?.label} · {themeById(style.theme).label}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-navy-500">Details filled in</dt>
                <dd className="font-medium text-navy-900">
                  {filled.length} of {FIELDS[profession].filter(f => f.type !== 'image').length}
                </dd>
              </div>
            </dl>
          </section>

          {fieldProblems.length > 0 && (
            <Notice tone="error">
              <p className="font-semibold">Please correct these details:</p>
              <ul className="mt-1 list-inside list-disc">
                {fieldProblems.map(problem => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            </Notice>
          )}
          {error && fieldProblems.length === 0 && (
            <Notice tone="error" icon={RotateCw}>
              {error}
            </Notice>
          )}

          <Button onClick={handleSave} loading={saving} className="w-full py-3">
            {!saving && (activating ? <Nfc className="h-4 w-4" /> : <Save className="h-4 w-4" />)}
            {activating
              ? saving
                ? 'Activating card'
                : error
                  ? 'Try again: Activate Card'
                  : 'Activate Card'
              : saving
                ? 'Saving your card'
                : mode === 'edit'
                  ? 'Save changes'
                  : error
                    ? 'Try again: Save My Card'
                    : 'Save My Card'}
          </Button>
          {activating && activation.test && (
            <Notice tone="info">Test mode: your digital card will be saved, but no physical NFC card is activated.</Notice>
          )}
          {activating && mode === 'edit' && (
            <p className="text-xs text-navy-500">
              You already have a digital card. Activating links this NFC card to it and saves these details to it, keeping its card ID and
              link.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" size="sm" onClick={() => navigate(paths.profile)} disabled={saving} className="w-full">
              <PenLine className="h-3.5 w-3.5" />
              Back to Details
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate(paths.design)} disabled={saving} className="w-full">
              <Palette className="h-3.5 w-3.5" />
              Back to Design
            </Button>
          </div>
        </div>
      </div>
    </SetupLayout>
  );
}
