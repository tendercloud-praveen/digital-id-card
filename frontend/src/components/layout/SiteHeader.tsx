import { AnimatePresence, motion } from 'framer-motion';
import { LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button, { buttonClass } from '@/components/ui/Button';
import Logo from '@/components/ui/Logo';
import { useAuth } from '@/hooks/useAuth';

const SECTION_LINKS = [
  { href: '/#features', label: 'Features' },
  { href: '/#how-it-works', label: 'How it works' },
];

export default function SiteHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const { status, logout } = useAuth();
  const signedIn = status === 'authenticated';

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-navy-100/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {SECTION_LINKS.map(link => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-navy-600 transition hover:bg-navy-50 hover:text-navy-900"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {signedIn ? (
            <>
              <Link to="/dashboard" className={buttonClass('secondary')}>
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <Button variant="ghost" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" className={buttonClass('ghost')}>
                Log in
              </Link>
              <Link to="/register" className={buttonClass('primary')}>
                Get started
              </Link>
            </>
          )}
        </div>
        <button
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(open => !open)}
          className="rounded-lg p-2 text-navy-700 transition hover:bg-navy-50 md:hidden"
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-navy-100 md:hidden"
          >
            <div className="flex flex-col gap-1 p-4">
              {SECTION_LINKS.map(link => (
                <a key={link.href} href={link.href} className="rounded-lg px-3 py-2.5 text-sm font-medium text-navy-700 hover:bg-navy-50">
                  {link.label}
                </a>
              ))}
              <div className="mt-2 grid gap-2">
                {signedIn ? (
                  <>
                    <Link to="/dashboard" className={buttonClass('secondary')}>
                      Dashboard
                    </Link>
                    <Button variant="ghost" onClick={handleLogout}>
                      Log out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className={buttonClass('secondary')}>
                      Log in
                    </Link>
                    <Link to="/register" className={buttonClass('primary')}>
                      Get started
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
