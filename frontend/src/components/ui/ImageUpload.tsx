import { ImagePlus, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Field } from './Field';
import { resizeImage } from '@/lib/image';

const MAX_BYTES = 5 * 1024 * 1024;

type Props = { id: string; label: string; value: string; onChange: (value: string) => void; error?: string; optional?: boolean };

export default function ImageUpload({ id, label, value, onChange, error, optional }: Props) {
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setLocalError('Please choose an image file (JPG, PNG or WebP).');
    if (file.size > MAX_BYTES) return setLocalError('Image must be under 5 MB.');
    setLocalError('');
    setBusy(true);
    try {
      onChange(await resizeImage(file));
    } catch {
      setLocalError('Could not process this image. Try another file.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Field id={id} label={label} optional={optional} error={error ?? localError}>
      <div className="flex items-center gap-4 rounded-2xl border border-dashed border-navy-200 bg-navy-50/50 p-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-navy-100">
          {busy ? (
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          ) : value ? (
            <img src={value} alt="Selected preview" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-6 w-6 text-navy-400" />
          )}
        </div>
        <div className="flex flex-col items-start gap-2">
          <label
            htmlFor={id}
            className="cursor-pointer rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-blue-700 ring-1 ring-navy-200 transition hover:bg-blue-50"
          >
            {value ? 'Replace image' : 'Choose image'}
          </label>
          <input
            id={id}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={event => handleFile(event.target.files?.[0])}
          />
          {value && (
            <button type="button" onClick={() => onChange('')} className="text-xs font-medium text-navy-600 hover:text-red-600">
              Remove
            </button>
          )}
          <p className="text-xs text-navy-500">JPG, PNG or WebP, up to 5 MB</p>
        </div>
      </div>
    </Field>
  );
}
