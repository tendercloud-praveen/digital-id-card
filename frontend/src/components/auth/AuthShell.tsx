import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import SiteHeader from '@/components/layout/SiteHeader';

const BENEFITS = [
  'Pick your profession and a design',
  'Publish to a unique link and QR code',
  'Share it with a tap, a scan or a message',
];

export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-navy-50/60">
      <SiteHeader />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:py-20">
        <aside className="hidden lg:block">
          <h2 className="text-4xl font-bold leading-tight tracking-tight text-navy-900">Your card, ready in minutes.</h2>
          <ul className="mt-8 space-y-4">
            {BENEFITS.map(item => (
              <li key={item} className="flex items-center gap-3 text-navy-700">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                  <Check className="h-4 w-4" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </aside>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto w-full max-w-md rounded-3xl bg-white p-6 shadow-xl shadow-navy-900/5 ring-1 ring-navy-100 sm:p-8"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
