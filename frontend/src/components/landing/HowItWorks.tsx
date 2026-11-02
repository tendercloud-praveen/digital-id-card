import { motion } from 'framer-motion';
import { ArrowRight, Pencil, Share2, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buttonClass } from '@/components/ui/Button';

const STEPS = [
  { icon: UserPlus, title: 'Create your account', text: 'Sign up and verify your email with a six-digit code we send you.' },
  { icon: Pencil, title: 'Build your card', text: 'Pick your profession, fill in your details and choose a design.' },
  { icon: Share2, title: 'Publish and share', text: 'Get a unique link and QR code, then share them anywhere.' },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-600">How it works</p>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-navy-900 sm:text-5xl">Three steps to your card</h2>
        </div>
        <div className="relative mt-16 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: index * 0.12 }}
              whileHover={{ y: -6 }}
              className="surface-card relative p-8 transition-shadow duration-300 hover:shadow-2xl hover:shadow-violet-500/15"
            >
              <span className="absolute right-7 top-6 bg-gradient-to-br from-violet-500 to-cyan-400 bg-clip-text text-5xl font-black text-transparent">
                0{index + 1}
              </span>
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-400 text-white shadow-lg shadow-fuchsia-500/25">
                <step.icon className="h-7 w-7" />
              </span>
              <h3 className="mt-7 text-2xl font-bold text-navy-900">{step.title}</h3>
              <p className="mt-3 text-base leading-relaxed text-navy-600">{step.text}</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-14 flex justify-center">
          <Link to="/register" className={buttonClass('primary', 'px-8 py-4 text-base')}>
            Build my card
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
