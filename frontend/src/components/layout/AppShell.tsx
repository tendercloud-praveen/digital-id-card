import { CirclePlus, CreditCard, LayoutDashboard, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import SiteHeader from '@/components/layout/SiteHeader';
import { useMyCard } from '@/hooks/useMyCard';
import { WIZARD } from '@/lib/flows';

type Item = { to: string; label: string; icon: LucideIcon; state?: unknown; end?: boolean };

// Signed-in area: header, a persistent sidebar (a tab row on phones) and the page.
export default function AppShell({ children }: { children: ReactNode }) {
  const { card } = useMyCard();
  const hasSavedCard = card?.status === 'published' && Boolean(card.slug);
  const items: Item[] = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/cards', label: 'My Cards', icon: CreditCard },
    // With a saved card the wizard opens on that card ({ fresh: true } starts from the saved data).
    { to: WIZARD.paths.profession, label: 'Create Card', icon: CirclePlus, state: hasSavedCard ? { fresh: true } : undefined },
  ];

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition md:gap-2.5 md:px-3 md:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
      isActive ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-100' : 'text-navy-600 hover:bg-navy-50 hover:text-navy-900'
    }`;

  const nav = items.map(item => (
    <NavLink key={item.to} to={item.to} state={item.state} end={item.end} className={linkClass}>
      <item.icon className="hidden h-4 w-4 shrink-0 min-[360px]:block" />
      {item.label}
    </NavLink>
  ));

  return (
    <div className="min-h-screen bg-navy-50/60">
      <SiteHeader />
      <nav aria-label="Account" className="sticky top-16 z-30 flex gap-1 overflow-x-auto border-b border-navy-100 bg-white/95 px-3 py-2 backdrop-blur md:hidden">
        {nav}
      </nav>
      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <aside className="hidden w-52 shrink-0 md:block">
          <nav aria-label="Account" className="sticky top-24 space-y-1 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-navy-100">
            {nav}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
