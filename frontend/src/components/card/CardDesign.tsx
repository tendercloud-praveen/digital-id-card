import { Briefcase, CalendarCheck, Facebook, Github, Globe, Instagram, Linkedin, Mail, MapPin, Phone, Twitter, type LucideIcon } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { DEFAULT_STYLE, gradient, themeById, type CardStyle, type CardView, type TemplateId, type Theme } from '@/lib/card';

const LINK_ICONS: Record<string, LucideIcon> = {
  website: Globe,
  portfolio: Briefcase,
  appointment: CalendarCheck,
  github: Github,
  linkedin: Linkedin,
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
};

type Align = 'start' | 'center';
type Look = {
  theme: Theme;
  nameFont: string;
  // Gradient fill; slowly drifts when animation is on.
  fill: (angle?: number) => { style: CSSProperties; className: string };
};
type Tone = { body: string; accent: CSSProperties; pill: CSSProperties; pillClass: string };

function makeLook(style: CardStyle): Look {
  const theme = themeById(style.theme);
  return {
    theme,
    nameFont: style.font === 'serif' ? 'font-serif font-semibold' : 'font-sans font-extrabold',
    fill: (angle = 135) => ({
      style: { backgroundImage: gradient(theme, angle), backgroundSize: style.animated ? '200% 200%' : undefined },
      className: style.animated ? 'animate-gradient-x' : '',
    }),
  };
}

function Avatar({ view, className, look }: { view: CardView; className: string; look: Look }) {
  if (view.image) return <img src={view.image} alt={view.name} className={`block object-cover ${className}`} />;
  const initials =
    view.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(word => word[0])
      .join('')
      .toUpperCase() || 'TC';
  const fill = look.fill();
  return (
    <div aria-hidden style={fill.style} className={`flex items-center justify-center text-2xl font-bold text-white ${fill.className} ${className}`}>
      {initials}
    </div>
  );
}

function ContactRows({ view, tone, align }: { view: CardView; tone: Tone; align: Align }) {
  const rows = [
    { icon: Phone, value: view.phone },
    { icon: Mail, value: view.email },
    { icon: MapPin, value: view.address },
  ].filter(row => row.value);
  return (
    <ul className={`mt-5 space-y-2.5 text-sm ${tone.body}`}>
      {rows.map(({ icon: Icon, value }) => (
        <li key={value} className={`flex items-center gap-2.5 ${align === 'center' ? 'justify-center' : ''}`}>
          <Icon className="h-4 w-4 shrink-0" />
          <span className="break-all">{value}</span>
        </li>
      ))}
    </ul>
  );
}

function Description({ view, tone, align }: { view: CardView; tone: Tone; align: Align }) {
  if (!view.description) return null;
  return (
    <p className={`mt-5 whitespace-pre-line text-sm leading-relaxed ${tone.body} ${align === 'center' ? 'text-center' : ''}`}>
      {view.description}
    </p>
  );
}

function LinkPills({ view, tone, align }: { view: CardView; tone: Tone; align: Align }) {
  if (view.links.length === 0) return null;
  return (
    <div className={`mt-6 flex flex-wrap gap-2 ${align === 'center' ? 'justify-center' : ''}`}>
      {view.links.map(link => {
        const Icon = LINK_ICONS[link.key] ?? Globe;
        return (
          <a
            key={link.key}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            style={tone.pill}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition duration-300 hover:-translate-y-0.5 hover:opacity-90 ${tone.pillClass}`}
          >
            <Icon className="h-3.5 w-3.5" />
            {link.label}
          </a>
        );
      })}
    </div>
  );
}

function ClassicCard({ view, look }: { view: CardView; look: Look }) {
  const { theme } = look;
  const tone: Tone = { body: 'text-navy-600', accent: { color: theme.accent }, pill: { backgroundColor: theme.soft, color: theme.accent }, pillClass: '' };
  const frame = look.fill();
  const bar = look.fill(90);
  return (
    <div style={frame.style} className={`rounded-[2rem] p-[2px] shadow-2xl shadow-navy-900/10 ${frame.className}`}>
      <div className="rounded-[calc(2rem-2px)] bg-white p-8 text-center">
        <Avatar view={view} look={look} className="mx-auto h-28 w-28 rounded-full ring-4 ring-white shadow-lg" />
        <h3 className={`mt-6 text-2xl text-navy-900 ${look.nameFont}`}>{view.name}</h3>
        {view.headline && <p style={tone.accent} className="mt-1.5 text-sm font-semibold">{view.headline}</p>}
        {view.organization && <p className="mt-1 text-sm text-navy-600">{view.organization}</p>}
        <div style={bar.style} className={`mx-auto my-6 h-1 w-14 rounded-full ${bar.className}`} />
        <ContactRows view={view} tone={tone} align="center" />
        <Description view={view} tone={tone} align="center" />
        <LinkPills view={view} tone={tone} align="center" />
      </div>
    </div>
  );
}

function ModernCard({ view, look }: { view: CardView; look: Look }) {
  const { theme } = look;
  const tone: Tone = { body: 'text-navy-600', accent: { color: theme.accent }, pill: { backgroundColor: theme.soft, color: theme.accent }, pillClass: '' };
  const band = look.fill();
  return (
    <div className="overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-navy-900/10 ring-1 ring-navy-100">
      <div style={band.style} className={`relative h-36 overflow-hidden ${band.className}`}>
        <span className="absolute -left-6 -top-6 h-28 w-28 rounded-full bg-white/20" />
        <span className="absolute right-4 top-6 h-16 w-16 rounded-full bg-white/15" />
      </div>
      <div className="px-7 pb-8">
        <Avatar view={view} look={look} className="relative -mt-14 h-28 w-28 rounded-3xl ring-4 ring-white shadow-lg" />
        <h3 className={`mt-5 text-2xl text-navy-900 ${look.nameFont}`}>{view.name}</h3>
        {view.headline && <p style={tone.accent} className="mt-1.5 text-sm font-semibold">{view.headline}</p>}
        {view.organization && <p className="mt-1 text-sm text-navy-600">{view.organization}</p>}
        <ContactRows view={view} tone={tone} align="start" />
        <Description view={view} tone={tone} align="start" />
        <LinkPills view={view} tone={tone} align="start" />
      </div>
    </div>
  );
}

function ElegantCard({ view, look }: { view: CardView; look: Look }) {
  const tone: Tone = { body: 'text-slate-200', accent: {}, pill: {}, pillClass: 'border border-white/20 bg-white/5 text-white hover:bg-white/15' };
  const glow = look.fill();
  const rule = look.fill(90);
  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-navy-900 p-8 text-center text-white shadow-2xl shadow-navy-900/40">
      <div aria-hidden style={glow.style} className={`absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full opacity-50 blur-3xl ${glow.className}`} />
      <div className="relative">
        <Avatar view={view} look={look} className="mx-auto h-28 w-28 rounded-full ring-2 ring-white/50 ring-offset-4 ring-offset-navy-900" />
        <h3 className={`mt-7 text-3xl text-white ${look.nameFont}`}>{view.name}</h3>
        {view.headline && <p className="mt-3 text-xs uppercase tracking-[0.22em] text-white/80">{view.headline}</p>}
        {view.organization && <p className="mt-1.5 font-serif text-base italic text-slate-200">{view.organization}</p>}
        <div style={rule.style} className={`mx-auto my-6 h-px w-20 ${rule.className}`} />
        <ContactRows view={view} tone={tone} align="center" />
        <Description view={view} tone={tone} align="center" />
        <LinkPills view={view} tone={tone} align="center" />
      </div>
    </div>
  );
}

function BoldCard({ view, look }: { view: CardView; look: Look }) {
  const tone: Tone = { body: 'text-white/95', accent: {}, pill: { color: look.theme.accent }, pillClass: 'bg-white' };
  const fill = look.fill();
  return (
    <div style={fill.style} className={`relative overflow-hidden rounded-[2rem] p-8 text-white shadow-2xl shadow-navy-900/30 ${fill.className}`}>
      <span aria-hidden className="absolute -bottom-16 -right-12 h-56 w-56 rounded-full bg-white/15 blur-2xl" />
      <div className="relative">
        <Avatar view={view} look={look} className="h-20 w-20 rounded-2xl ring-2 ring-white/60" />
        <h3 className={`mt-7 text-4xl uppercase leading-[1.02] tracking-tight ${look.nameFont}`}>{view.name}</h3>
        {view.headline && <p className="mt-4 text-base font-bold text-white">{view.headline}</p>}
        {view.organization && <p className={`mt-1 text-sm font-medium ${tone.body}`}>{view.organization}</p>}
        <ContactRows view={view} tone={tone} align="start" />
        <Description view={view} tone={tone} align="start" />
        <LinkPills view={view} tone={tone} align="start" />
      </div>
    </div>
  );
}

const DESIGNS: Record<TemplateId, (props: { view: CardView; look: Look }) => ReactNode> = {
  classic: ClassicCard,
  modern: ModernCard,
  elegant: ElegantCard,
  bold: BoldCard,
};

type Props = { view: CardView; style?: Partial<CardStyle>; className?: string };

export default function CardDesign({ view, style, className = '' }: Props) {
  const full = { ...DEFAULT_STYLE, ...style };
  const Design = DESIGNS[full.template];
  return (
    <div className={`w-full ${className}`}>
      <Design view={view} look={makeLook(full)} />
    </div>
  );
}
