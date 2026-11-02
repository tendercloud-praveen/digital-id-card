import { IdCard } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Logo() {
  return (
    <Link to="/" className="group inline-flex items-center gap-2.5 font-bold text-navy-900">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-400 text-white shadow-lg shadow-fuchsia-500/30 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105">
        <IdCard className="h-5 w-5" />
      </span>
      <span className="text-xl tracking-tight">
        Tap<span className="text-gradient">Card</span>
      </span>
    </Link>
  );
}
