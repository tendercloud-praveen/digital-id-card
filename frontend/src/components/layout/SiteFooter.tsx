import Logo from '@/components/ui/Logo';

export default function SiteFooter() {
  return (
    <footer className="border-t border-navy-100 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-navy-600 sm:flex-row sm:px-6">
        <Logo />
        <p>Digital visiting cards with a link and QR code.</p>
        <p>&copy; {new Date().getFullYear()} TapCard</p>
      </div>
    </footer>
  );
}
