import jsQR from 'jsqr';
import { Camera, CameraOff, Loader2, Upload } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';

type Props = { onResult: (text: string) => void };

function decode(context: CanvasRenderingContext2D, width: number, height: number) {
  const image = context.getImageData(0, 0, width, height);
  return jsQR(image.data, width, height, { inversionAttempts: 'attemptBoth' })?.data ?? null;
}

export default function QrScanner({ onResult }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number>(0);
  const [state, setState] = useState<'idle' | 'starting' | 'scanning'>('idle');
  const [error, setError] = useState('');

  const stop = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setState('idle');
  }, []);

  useEffect(() => stop, [stop]);

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (video && canvas && context && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const text = decode(context, canvas.width, canvas.height);
      if (text) {
        stop();
        onResult(text);
        return;
      }
    }
    frameRef.current = requestAnimationFrame(scanFrame);
  }, [onResult, stop]);

  const start = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser cannot use the camera here. Upload a photo of the QR code or type the code instead.');
      return;
    }
    setState('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      setState('scanning');
      frameRef.current = requestAnimationFrame(scanFrame);
    } catch (err) {
      stop();
      const name = err instanceof DOMException ? err.name : '';
      setError(
        name === 'NotAllowedError'
          ? 'Camera access was blocked. Allow camera access in your browser settings, or upload a photo instead.'
          : name === 'NotFoundError'
            ? 'No camera was found on this device. Upload a photo of the QR code or type the code instead.'
            : 'The camera could not be started. Upload a photo of the QR code or type the code instead.'
      );
    }
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    setError('');
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('no canvas');
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const text = decode(context, canvas.width, canvas.height);
      if (text) onResult(text);
      else setError('No QR code was found in that photo. Try a sharper, closer photo, or type the code.');
    } catch {
      setError('That file could not be read. Choose a JPG or PNG photo of the QR code.');
    }
  };

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-navy-900 sm:aspect-[4/3]">
        <video ref={videoRef} muted playsInline className={`h-full w-full object-cover ${state === 'scanning' ? '' : 'hidden'}`} />
        <canvas ref={canvasRef} className="hidden" />
        {state === 'scanning' ? (
          <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-3/5 w-3/5 max-w-xs rounded-3xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(14,29,61,0.45)]" />
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white/80">
            {state === 'starting' ? <Loader2 className="h-8 w-8 animate-spin" /> : <Camera className="h-10 w-10" />}
            <p className="max-w-xs text-sm">
              {state === 'starting' ? 'Starting camera' : 'Point your camera at the activation QR code on your card insert.'}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {state === 'scanning' ? (
          <Button variant="secondary" onClick={stop} className="w-full">
            <CameraOff className="h-4 w-4" />
            Stop Scanner
          </Button>
        ) : (
          <Button onClick={start} loading={state === 'starting'} className="w-full">
            {state !== 'starting' && <Camera className="h-4 w-4" />}
            Start Scanner
          </Button>
        )}
        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-white/90 px-5 py-2.5 text-sm font-semibold text-navy-800 shadow-sm ring-1 ring-violet-200 transition hover:bg-white hover:shadow-md focus-within:ring-2 focus-within:ring-violet-500">
          <Upload className="h-4 w-4" />
          Upload a photo
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={event => {
              void handleFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </label>
      </div>
      {error && (
        <Notice tone="error" className="mt-4">
          {error}
        </Notice>
      )}
    </div>
  );
}
