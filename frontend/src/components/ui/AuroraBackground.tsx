import type { ReactNode } from 'react';

const BLOBS = [
  'left-[-10%] top-[-10%] h-[28rem] w-[28rem] bg-violet-400/40',
  'right-[-8%] top-[10%] h-[24rem] w-[24rem] bg-cyan-300/40 [animation-delay:-4s]',
  'bottom-[-12%] left-[25%] h-[26rem] w-[26rem] bg-pink-300/30 [animation-delay:-8s]',
];

export default function AuroraBackground({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative min-h-screen overflow-hidden bg-gradient-to-b from-violet-50/70 via-white to-cyan-50/50 ${className}`}>
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {BLOBS.map(blob => (
          <span key={blob} className={`absolute animate-blob rounded-full blur-3xl ${blob}`} />
        ))}
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
