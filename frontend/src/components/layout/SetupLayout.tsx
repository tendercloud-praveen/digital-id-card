import { ArrowLeft, Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useWizard } from '@/hooks/useWizard';
import { WIZARD } from '@/lib/flows';
import SiteHeader from './SiteHeader';

type Props = { step: number; title: string; subtitle: string; children: ReactNode; wide?: boolean; hideSteps?: boolean };

export default function SetupLayout({ step, title, subtitle, children, wide = false, hideSteps = false }: Props) {
  const { mode, flow, paths } = useWizard();
  const STEPS = WIZARD.steps;
  return (
    <div className="min-h-screen bg-navy-50/60">
      <SiteHeader />
      <main className={`mx-auto px-4 py-8 sm:px-6 sm:py-10 ${wide ? 'max-w-6xl' : 'max-w-4xl'}`}>
        <div className="mb-5 flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-violet-700">
            {flow === 'activate' ? 'Activate your NFC card' : mode === 'edit' ? 'Edit your digital card' : 'Create your digital card'}
          </p>
          <Link to={flow === 'activate' ? '/dashboard' : paths.start} className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-600 transition hover:text-navy-900">
            <ArrowLeft className="h-4 w-4" />
            {flow === 'activate' ? 'Cancel activation' : mode === 'edit' ? 'Cancel' : 'Exit (progress kept)'}
          </Link>
        </div>
        {!hideSteps && (
          <>
            <p className="mb-3 text-sm font-semibold text-blue-700 sm:hidden">
              Step {step + 1} of {STEPS.length}: {STEPS[step]}
            </p>
            <ol className="mb-8 flex items-center" aria-label="Card creation progress">
              {STEPS.map((label, index) => {
                const done = index < step;
                const current = index === step;
                return (
                  <li
                    key={label}
                    aria-current={current ? 'step' : undefined}
                    className={`flex items-center gap-2 sm:gap-3 ${index < STEPS.length - 1 ? 'flex-1' : ''}`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-300 ${
                        done || current ? 'bg-blue-600 text-white' : 'bg-white text-navy-600 ring-1 ring-navy-200'
                      } ${current ? 'ring-4 ring-blue-100' : ''}`}
                    >
                      {done ? <Check className="h-4 w-4" /> : index + 1}
                    </span>
                    <span className={`hidden text-sm font-medium sm:inline ${current ? 'text-navy-900' : 'text-navy-600'}`}>{label}</span>
                    {index < STEPS.length - 1 && (
                      <span className={`h-px flex-1 transition-colors duration-300 ${done ? 'bg-blue-600' : 'bg-navy-200'}`} />
                    )}
                  </li>
                );
              })}
            </ol>
          </>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">{title}</h1>
        <p className="mt-1.5 leading-relaxed text-navy-600">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </main>
    </div>
  );
}
