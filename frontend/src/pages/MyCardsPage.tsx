import { motion } from 'framer-motion';
import { ArrowRight, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import CardDesign from '@/components/card/CardDesign';
import CardGate from '@/components/card/CardGate';
import AppShell from '@/components/layout/AppShell';
import { buttonClass } from '@/components/ui/Button';
import { useMyCard } from '@/hooks/useMyCard';
import { professionLabel, toCardView } from '@/lib/card';
import { WIZARD } from '@/lib/flows';
import { formatDate } from '@/lib/format';

export default function MyCardsPage() {
  return (
    <CardGate>
      <AppShell>
        <MyCards />
      </AppShell>
    </CardGate>
  );
}

function MyCards() {
  // Loaded from GET /api/cards/me. Accounts have one card; an unfinished draft is not listed.
  const { card } = useMyCard();
  const saved = card?.status === 'published' && card.slug ? [card] : [];

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-navy-900">My Cards</h1>
      <p className="mt-1 text-sm text-navy-600">Your saved digital cards. Select a card to see its QR code, link and options.</p>

      {saved.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-navy-100">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-50 text-navy-500">
            <CreditCard className="h-6 w-6" />
          </span>
          <h2 className="mt-4 font-bold text-navy-900">No saved cards yet</h2>
          <p className="mt-1 text-sm text-navy-600">Create your digital card and it will appear here.</p>
          <Link to={WIZARD.paths.profession} className={buttonClass('primary', 'mt-5', 'sm')}>
            Create Your Digital Card
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {saved.map(item => (
            <motion.li
              key={item.slug}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="group relative rounded-2xl bg-white p-3 shadow-sm ring-1 ring-navy-100 transition duration-300 focus-within:ring-2 focus-within:ring-violet-500 hover:-translate-y-0.5 hover:shadow-md"
            >
              {/* The preview contains its own links, so it is inert here; the stretched link below opens the details. */}
              <div className="h-44 overflow-hidden rounded-xl bg-navy-50 p-2" aria-hidden {...{ inert: '' }}>
                <div style={{ width: 400, zoom: 0.62 }} className="mx-auto">
                  <CardDesign view={toCardView(item.values)} style={item} />
                </div>
              </div>
              <div className="mt-3 flex items-start justify-between gap-2 px-1">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-navy-900">{item.values.name}</p>
                  <p className="truncate text-xs text-navy-600">{professionLabel(item.profession)}</p>
                  <p className="mt-1 truncate font-mono text-[11px] text-navy-500">{item.card_id ?? item.slug}</p>
                  <p className="text-[11px] text-navy-500">Saved {formatDate(item.published_at)}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Live
                </span>
              </div>
              <Link
                to={`/cards/${item.slug}`}
                className="mt-3 flex items-center gap-1 px-1 text-xs font-semibold text-blue-700 focus-visible:outline-none after:absolute after:inset-0 after:rounded-2xl after:content-['']"
              >
                Open details
                <span className="sr-only"> for {item.values.name}</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
