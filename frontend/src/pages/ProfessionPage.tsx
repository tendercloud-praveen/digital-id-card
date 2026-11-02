import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Briefcase,
  Building2,
  Check,
  Code2,
  GraduationCap,
  Laptop,
  Lightbulb,
  Palette,
  Scale,
  Stethoscope,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SetupLayout from '@/components/layout/SetupLayout';
import Button, { buttonClass } from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import { useWizard } from '@/hooks/useWizard';
import { PROFESSIONS, WIZARD_PROFESSIONS, type Profession } from '@/lib/card';

const ICONS: Record<Profession, LucideIcon> = {
  developer: Code2,
  business: Briefcase,
  freelancer: Laptop,
  designer: Palette,
  consultant: Lightbulb,
  student: GraduationCap,
  other: UserRound,
  doctor: Stethoscope,
  lawyer: Scale,
  realtor: Building2,
  educator: BookOpen,
};

export default function ProfessionPage() {
  const navigate = useNavigate();
  const { profession, setProfession, paths, flow } = useWizard();
  const [selected, setSelected] = useState<Profession | null>(profession);
  const [showError, setShowError] = useState(false);
  // An existing card keeps its earlier profession available even if it is no longer offered.
  const offered = profession && !WIZARD_PROFESSIONS.includes(profession) ? [...WIZARD_PROFESSIONS, profession] : WIZARD_PROFESSIONS;
  const options = offered.map(id => PROFESSIONS.find(p => p.id === id)!);

  const handleContinue = () => {
    if (!selected) {
      setShowError(true);
      return;
    }
    setProfession(selected);
    navigate(paths.profile);
  };

  return (
    <SetupLayout step={0} title="Select your profession" subtitle="Choose the option that fits best. We will show the right fields for it." wide>
      <div role="radiogroup" aria-label="Profession" aria-required="true" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {options.map((option, index) => {
          const Icon = ICONS[option.id];
          const isSelected = selected === option.id;
          return (
            <motion.button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => {
                setSelected(option.id);
                setShowError(false);
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.03 }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              className={`relative flex flex-col items-start rounded-2xl bg-white p-5 text-left shadow-sm transition-shadow duration-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                isSelected ? 'ring-2 ring-blue-600 shadow-md shadow-blue-600/10' : 'ring-1 ring-navy-200'
              }`}
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-300 ${
                  isSelected ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700'
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="mt-4 font-semibold text-navy-900">{option.label}</span>
              <span className="mt-1 text-sm leading-relaxed text-navy-600">{option.blurb}</span>
              {isSelected && (
                <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {showError && (
        <Notice tone="error" className="mt-5">
          Select a profession to continue.
        </Notice>
      )}
      {profession && selected && selected !== profession && (
        <Notice tone="info" className="mt-5">
          Your details are kept when you change profession. Fields that do not apply are hidden.
        </Notice>
      )}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Link to={paths.start} className={buttonClass('ghost')}>
          <ArrowLeft className="h-4 w-4" />
          {flow === 'activate' ? 'Back' : 'Dashboard'}
        </Link>
        <Button onClick={handleContinue} aria-disabled={!selected} className={`w-full sm:w-auto ${selected ? '' : 'opacity-60'}`}>
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </SetupLayout>
  );
}
