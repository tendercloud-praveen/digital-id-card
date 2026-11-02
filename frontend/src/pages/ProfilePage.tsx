import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import SetupLayout from '@/components/layout/SetupLayout';
import Button from '@/components/ui/Button';
import ImageUpload from '@/components/ui/ImageUpload';
import Notice from '@/components/ui/Notice';
import { TextAreaField, TextField } from '@/components/ui/Field';
import { useWizard } from '@/hooks/useWizard';
import { FIELDS, professionLabel, type Profession } from '@/lib/card';
import { validateCardValues } from '@/lib/cardValidation';

export default function ProfilePage() {
  const { profession, paths } = useWizard();
  if (!profession) return <Navigate to={paths.profession} replace />;
  return <DetailsForm profession={profession} />;
}

function DetailsForm({ profession }: { profession: Profession }) {
  const navigate = useNavigate();
  const { values, setValue, setValues, paths } = useWizard();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fields = FIELDS[profession];

  const handleChange = (key: string, value: string) => {
    setValue(key, value);
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = validateCardValues(profession, values);
    setErrors(result.errors);
    const firstError = Object.keys(result.errors)[0];
    if (firstError) {
      document.getElementById(`profile-${firstError}`)?.focus();
      return;
    }
    setValues(result.cleaned);
    navigate(paths.design);
  };

  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <SetupLayout
      step={1}
      title="Your professional details"
      subtitle={`Details for a ${professionLabel(profession)} card. Fields marked * are required; the rest are optional.`}
    >
      <form onSubmit={handleSubmit} noValidate className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy-100 sm:p-7">
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map(field => {
            const id = `profile-${field.key}`;
            const value = values[field.key] ?? '';
            const error = errors[field.key] || undefined;
            if (field.type === 'image') {
              return (
                <div key={field.key} className="md:col-span-2">
                  <ImageUpload id={id} label={field.label} optional value={value} onChange={next => handleChange(field.key, next)} error={error} />
                </div>
              );
            }
            if (field.type === 'textarea') {
              return (
                <div key={field.key} className="md:col-span-2">
                  <TextAreaField
                    id={id}
                    label={field.label}
                    required={field.required}
                    optional={!field.required}
                    placeholder={field.placeholder}
                    value={value}
                    maxLength={1000}
                    rows={3}
                    onChange={event => handleChange(field.key, event.target.value)}
                    error={error}
                  />
                </div>
              );
            }
            return (
              <TextField
                key={field.key}
                id={id}
                label={field.label}
                type={field.type}
                required={field.required}
                optional={!field.required}
                placeholder={field.placeholder}
                value={value}
                maxLength={field.type === 'url' ? 300 : 120}
                autoComplete={field.key === 'name' ? 'name' : field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : undefined}
                onChange={event => handleChange(field.key, event.target.value)}
                error={error}
              />
            );
          })}
        </div>

        {errorCount > 0 && (
          <Notice tone="error" className="mt-5">
            Please fix {errorCount === 1 ? 'the highlighted field' : `the ${errorCount} highlighted fields`} to continue.
          </Notice>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" onClick={() => navigate(paths.profession)}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button type="submit" className="w-full sm:w-auto">
            Continue to design
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </SetupLayout>
  );
}
