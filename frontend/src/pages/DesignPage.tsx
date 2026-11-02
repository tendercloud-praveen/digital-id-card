import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Save, Sparkles } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import CardDesign from '@/components/card/CardDesign';
import SetupLayout from '@/components/layout/SetupLayout';
import Button, { buttonClass } from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import { useMyCard } from '@/hooks/useMyCard';
import { useWizard } from '@/hooks/useWizard';
import { errorMessage } from '@/lib/api';
import { FONTS, TEMPLATES, THEMES, gradient, themeById, toCardView, type CardStyle } from '@/lib/card';

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 ring-1 ring-navy-100 sm:p-5">
      <h2 className="text-sm font-semibold text-navy-900">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-navy-500">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function DesignPage() {
  const { profession, paths } = useWizard();
  if (!profession) return <Navigate to={paths.profession} replace />;
  return <DesignStep />;
}

function DesignStep() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { values, style, setStyle, mode, cardId, flow, paths } = useWizard();
  const { saveDesign } = useMyCard();
  // "Change Design" from the dashboard: only this step, saved on its own.
  const designOnly = flow === 'create' && mode === 'edit' && params.get('mode') === 'design' && Boolean(cardId);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const view = toCardView(values);
  const set = <K extends keyof CardStyle>(key: K, value: CardStyle[K]) => setStyle({ ...style, [key]: value });

  const handleSaveDesign = async () => {
    if (!cardId || saving) return;
    setSaving(true);
    setSaveError('');
    try {
      await saveDesign(cardId, { design_id: style.template, theme: style.theme, font: style.font, animated: style.animated });
      navigate('/dashboard', { replace: true, state: { saved: 'design' } });
    } catch (error) {
      setSaving(false);
      setSaveError(errorMessage(error));
    }
  };

  return (
    <SetupLayout
      step={2}
      hideSteps={designOnly}
      title={designOnly ? 'Change your card design' : 'Choose a design'}
      subtitle="Each design shows your own details. Pick one, then fine-tune the colours and type."
      wide
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
        <div className="space-y-4">
          <Section title="Design">
            <div role="radiogroup" aria-label="Design" className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {TEMPLATES.map(option => {
                const selected = option.id === style.template;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={`${option.label} design`}
                    onClick={() => set('template', option.id)}
                    className={`group relative rounded-xl p-2 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                      selected ? 'bg-blue-50/70 ring-2 ring-blue-600' : 'bg-navy-50/60 ring-1 ring-navy-200'
                    }`}
                  >
                    <div className="h-36 overflow-hidden rounded-lg">
                      <div style={{ width: 400, zoom: 0.3 }} aria-hidden>
                        <CardDesign view={view} style={{ ...style, template: option.id, animated: false }} />
                      </div>
                    </div>
                    <span className="mt-2 flex items-center justify-between px-1">
                      <span className="text-sm font-semibold text-navy-900">{option.label}</span>
                      {selected && <Check className="h-4 w-4 text-blue-600" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="Colour theme" hint={themeById(style.theme).label}>
            <div role="radiogroup" aria-label="Colour theme" className="flex flex-wrap gap-2.5">
              {THEMES.map(option => {
                const selected = option.id === style.theme;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={option.label}
                    title={option.label}
                    onClick={() => set('theme', option.id)}
                    style={{ backgroundImage: gradient(option) }}
                    className={`relative h-9 w-9 rounded-full transition duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${
                      selected ? 'ring-2 ring-navy-900 ring-offset-2' : 'ring-1 ring-black/5'
                    }`}
                  >
                    {selected && <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />}
                  </button>
                );
              })}
            </div>
          </Section>

          <div className="grid gap-4 sm:grid-cols-2">
            <Section title="Name font">
              <div role="radiogroup" aria-label="Name font" className="grid grid-cols-2 gap-2">
                {FONTS.map(option => {
                  const selected = option.id === style.font;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => set('font', option.id)}
                      className={`rounded-xl px-3 py-2 text-center transition ${
                        selected ? 'bg-blue-50/60 ring-2 ring-blue-600' : 'ring-1 ring-navy-200 hover:bg-navy-50'
                      }`}
                    >
                      <span className={`block text-lg text-navy-900 ${option.id === 'serif' ? 'font-serif' : 'font-sans font-bold'}`}>Aa</span>
                      <span className="block text-xs text-navy-600">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </Section>
            <Section title="Motion">
              <button
                type="button"
                role="switch"
                aria-checked={style.animated}
                onClick={() => set('animated', !style.animated)}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 ring-1 ring-navy-200 transition hover:bg-navy-50"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-navy-800">
                  <Sparkles className="h-4 w-4 text-violet-600" />
                  Animated gradient
                </span>
                <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${style.animated ? 'bg-blue-600' : 'bg-navy-200'}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${style.animated ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </span>
              </button>
            </Section>
          </div>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-2xl bg-gradient-to-br from-navy-100/70 to-white p-4 ring-1 ring-navy-100 sm:p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-navy-500">Live preview</p>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${style.template}-${style.theme}-${style.font}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="mx-auto max-w-sm"
              >
                <CardDesign view={view} style={style} />
              </motion.div>
            </AnimatePresence>
          </div>

          {saveError && <Notice tone="error">{saveError}</Notice>}

          {designOnly ? (
            <div className="grid grid-cols-2 gap-3">
              <Link to="/dashboard" className={buttonClass('secondary', 'w-full')}>
                Cancel
              </Link>
              <Button onClick={handleSaveDesign} loading={saving} className="w-full">
                {!saving && <Save className="h-4 w-4" />}
                {saving ? 'Saving' : 'Save design'}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button variant="ghost" onClick={() => navigate(paths.profile)}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button onClick={() => navigate(paths.publish)} className="w-full sm:w-auto">
                Preview card
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </SetupLayout>
  );
}
