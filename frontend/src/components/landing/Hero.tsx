import { motion } from 'framer-motion';
import { ArrowRight, CreditCard, Link2, QrCode, Sparkles, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import CardDesign from '@/components/card/CardDesign';
import { buttonClass } from '@/components/ui/Button';
import { toCardView } from '@/lib/card';

const SAMPLE_VALUES: Record<string, string> = {
    name: 'Praveen Kumar',
    title: 'Senior Software Engineer',
    organization: 'Acme Labs',
    phone: '+1 555 123 4567',
    email: 'praveen@example.com',
    address: 'Bengaluru, India',
    description: 'Building fast, accessible web products.',
    github: 'github.com/praveen',
    website: 'praveen.dev',
};

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-2 lg:pb-28 lg:pt-24">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-sm font-semibold text-violet-700 shadow-sm ring-1 ring-violet-200 backdrop-blur">
            <Sparkles className="h-4 w-4 text-fuchsia-500" />
            Digital visiting cards
          </span>
          <h1 className="mt-6 text-5xl font-extrabold leading-[1.08] tracking-tight text-navy-900 sm:text-6xl lg:text-7xl">
            Your Digital Visiting Card.{' '}
            <span className="text-gradient">Always With You.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-navy-600 sm:text-xl">
            Build a polished digital card in minutes, publish it to a unique link, and share it with a QR code anyone can scan.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link to="/register" className={buttonClass('primary', 'px-7 py-3.5 text-base')}>
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/login" className={buttonClass('secondary', 'px-7 py-3.5 text-base')}>
              Log in
            </Link>
          </div>
          <Link
            to="/activate"
            className="group mt-5 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm ring-1 ring-violet-200 backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:shadow-md"
          >
            <CreditCard className="h-4 w-4 text-fuchsia-500" />
            Already Have a Card? Activate It
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <p className="mt-5 text-sm text-navy-600">Free to create. Secure sign-in with email verification.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30, rotate: -3 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.9, delay: 0.15 }}
          className="relative isolate mx-auto w-full max-w-md"
        >
          <div className="absolute -inset-8 -z-10 rounded-[2.5rem] bg-gradient-to-tr from-violet-300/50 via-fuchsia-300/40 to-cyan-300/50 blur-3xl" />
          <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}>
            <CardDesign view={toCardView(SAMPLE_VALUES)} style={{ template: 'modern' }} />
          </motion.div>

          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -left-4 top-10 hidden rounded-2xl bg-white/90 p-3 shadow-xl ring-1 ring-violet-100 backdrop-blur sm:flex"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
              <Link2 className="h-5 w-5" />
            </span>
          </motion.div>
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -right-3 bottom-12 hidden rounded-2xl bg-white/90 p-3 shadow-xl ring-1 ring-cyan-100 backdrop-blur sm:flex"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 text-white">
              <QrCode className="h-5 w-5" />
            </span>
          </motion.div>
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -bottom-4 left-10 hidden rounded-2xl bg-white/90 p-3 shadow-xl ring-1 ring-pink-100 backdrop-blur sm:flex"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-400 text-white">
              <UserRound className="h-5 w-5" />
            </span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
