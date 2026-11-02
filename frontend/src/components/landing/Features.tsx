import { motion } from 'framer-motion';
import { CreditCard, Layers, Link2, QrCode, ShieldCheck, UserRound, type LucideIcon } from 'lucide-react';

const FEATURES: { icon: LucideIcon; title: string; text: string; gradient: string }[] = [
  { icon: Link2, title: 'Your own link', text: 'Every card gets a unique address you can add to emails, messages and social profiles.', gradient: 'from-violet-500 to-fuchsia-500' },
  { icon: QrCode, title: 'Scannable QR code', text: 'Download a QR code so anyone can open your card with a phone camera.', gradient: 'from-cyan-500 to-blue-500' },
  { icon: UserRound, title: 'Save as contact', text: 'Visitors save your details to their contacts in one tap.', gradient: 'from-pink-500 to-rose-400' },
  { icon: Layers, title: 'Four designs', text: 'Choose Classic, Modern, Elegant or Bold and preview each one before you publish.', gradient: 'from-indigo-500 to-cyan-400' },
  { icon: CreditCard, title: 'Activate a printed card', text: 'Got a printed NFC or QR TapCard? Activate it and every tap or scan opens your profile.', gradient: 'from-fuchsia-500 to-pink-500' },
  { icon: ShieldCheck, title: 'Secure account', text: 'Email verification, encrypted passwords and one-time codes keep your account yours.', gradient: 'from-emerald-500 to-cyan-500' },
];

export default function Features() {
  return (
    <section id="features" className="relative py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-600">Features</p>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-navy-900 sm:text-5xl">
            Everything you need to <span className="text-gradient">be found</span>
          </h2>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              whileHover={{ y: -8 }}
              className="group relative overflow-hidden rounded-3xl bg-white p-7 shadow-lg shadow-violet-900/5 ring-1 ring-violet-100/70 transition-shadow duration-300 hover:shadow-2xl hover:shadow-fuchsia-500/15"
            >
              <div className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${feature.gradient} opacity-10 blur-2xl transition-opacity duration-300 group-hover:opacity-30`} />
              <span className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.gradient} text-white shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                <feature.icon className="h-7 w-7" />
              </span>
              <h3 className="mt-6 text-xl font-bold text-navy-900">{feature.title}</h3>
              <p className="mt-3 text-base leading-relaxed text-navy-600">{feature.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
