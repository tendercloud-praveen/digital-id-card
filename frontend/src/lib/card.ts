export type Profession =
  | 'developer'
  | 'business'
  | 'freelancer'
  | 'designer'
  | 'consultant'
  | 'student'
  | 'other'
  // Earlier professions: not offered for new cards, still rendered for existing ones.
  | 'doctor'
  | 'lawyer'
  | 'realtor'
  | 'educator';
export type TemplateId = 'classic' | 'modern' | 'elegant' | 'bold';
export type ThemeId = 'aurora' | 'ocean' | 'sunset' | 'emerald' | 'midnight' | 'gold' | 'rose' | 'graphite';
export type FontId = 'sans' | 'serif';

// Same shape as the backend's card response.
export type Card = {
  profession: Profession | null;
  template: TemplateId;
  theme: ThemeId;
  font: FontId;
  animated: boolean;
  values: Record<string, string>;
  status: 'draft' | 'published';
  slug: string | null;
  // Same as slug: the unique ID the server generated for the saved card.
  card_id?: string | null;
  design_id?: TemplateId;
  // Canonical public link fixed by the server when the card was saved.
  public_url?: string | null;
  published_at: string | null;
  updated_at?: string | null;
};

export type CardStyle = Pick<Card, 'template' | 'theme' | 'font' | 'animated'>;

export type FieldDef = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'tel' | 'email' | 'url' | 'image';
  required?: boolean;
  placeholder?: string;
  wide?: boolean;
};

export type CardView = {
  name: string;
  headline: string;
  organization: string;
  phone: string;
  email: string;
  address: string;
  image: string;
  description: string;
  links: { key: string; label: string; href: string }[];
};

export const PROFESSIONS: { id: Profession; label: string; blurb: string }[] = [
  { id: 'developer', label: 'Software Developer', blurb: 'Showcase your role, stack and professional profiles.' },
  { id: 'business', label: 'Business Owner', blurb: 'Promote your business and make it easy to reach you.' },
  { id: 'freelancer', label: 'Freelancer', blurb: 'Present your services and point clients to your work.' },
  { id: 'designer', label: 'Designer', blurb: 'Lead with your portfolio and creative specialties.' },
  { id: 'consultant', label: 'Consultant', blurb: 'Share your expertise and let clients book a call.' },
  { id: 'student', label: 'Student', blurb: 'Share your course, college and projects.' },
  { id: 'other', label: 'Other', blurb: 'A general card for any profession.' },
  { id: 'doctor', label: 'Doctor', blurb: 'Share qualifications and let patients book visits.' },
  { id: 'lawyer', label: 'Lawyer', blurb: 'List practice areas and offer consultations.' },
  { id: 'realtor', label: 'Real Estate Agent', blurb: 'Connect buyers with you and your listings.' },
  { id: 'educator', label: 'Teacher / Trainer', blurb: 'Share your subjects, courses and class bookings.' },
];

// Professions offered when creating a card.
export const WIZARD_PROFESSIONS: Profession[] = ['developer', 'business', 'freelancer', 'designer', 'consultant', 'student', 'other'];

export const professionLabel = (id: Profession | null) => PROFESSIONS.find(p => p.id === id)?.label ?? '';

export const TEMPLATES: { id: TemplateId; label: string; description: string }[] = [
  { id: 'classic', label: 'Classic', description: 'Centred and timeless, with a gradient frame.' },
  { id: 'modern', label: 'Modern', description: 'A bold colour band with crisp typography.' },
  { id: 'elegant', label: 'Elegant', description: 'Deep navy with a soft glowing accent.' },
  { id: 'bold', label: 'Bold', description: 'Full-bleed gradient and large type.' },
];

export type Theme = { id: ThemeId; label: string; colors: [string, string, string]; accent: string; soft: string };

export const THEMES: Theme[] = [
  { id: 'aurora', label: 'Aurora', colors: ['#7C3AED', '#C026D3', '#06B6D4'], accent: '#6D28D9', soft: '#F5F3FF' },
  { id: 'ocean', label: 'Ocean', colors: ['#1D4ED8', '#0EA5E9', '#14B8A6'], accent: '#1D4ED8', soft: '#EFF6FF' },
  { id: 'sunset', label: 'Sunset', colors: ['#F97316', '#EC4899', '#F43F5E'], accent: '#C2410C', soft: '#FFF7ED' },
  { id: 'emerald', label: 'Emerald', colors: ['#047857', '#10B981', '#06B6D4'], accent: '#047857', soft: '#ECFDF5' },
  { id: 'midnight', label: 'Midnight', colors: ['#1E1B4B', '#4338CA', '#7C3AED'], accent: '#4338CA', soft: '#EEF2FF' },
  { id: 'gold', label: 'Gold', colors: ['#92400E', '#D97706', '#FBBF24'], accent: '#92400E', soft: '#FFFBEB' },
  { id: 'rose', label: 'Rose', colors: ['#BE123C', '#E11D48', '#F472B6'], accent: '#BE123C', soft: '#FFF1F2' },
  { id: 'graphite', label: 'Graphite', colors: ['#0F172A', '#334155', '#64748B'], accent: '#334155', soft: '#F1F5F9' },
];

export const FONTS: { id: FontId; label: string; description: string }[] = [
  { id: 'sans', label: 'Modern', description: 'Clean sans-serif' },
  { id: 'serif', label: 'Classic', description: 'Refined serif' },
];

export const themeById = (id: ThemeId) => THEMES.find(t => t.id === id) ?? THEMES[0];
export const gradient = (theme: Theme, angle = 135) => `linear-gradient(${angle}deg, ${theme.colors.join(', ')})`;

const NAME: FieldDef = { key: 'name', label: 'Full name', type: 'text', required: true, placeholder: 'Praveen Kumar' };
const PHOTO: FieldDef = { key: 'image', label: 'Profile photo', type: 'image' };
const PHONE: FieldDef = { key: 'phone', label: 'Phone', type: 'tel', required: true, placeholder: '+91 98765 43210' };
const EMAIL: FieldDef = { key: 'email', label: 'Email', type: 'email', required: true, placeholder: 'you@example.com' };
const WEBSITE: FieldDef = { key: 'website', label: 'Website', type: 'url', placeholder: 'yourwebsite.com' };
const LINKEDIN: FieldDef = { key: 'linkedin', label: 'LinkedIn profile', type: 'url', placeholder: 'linkedin.com/in/username' };
const GITHUB: FieldDef = { key: 'github', label: 'GitHub', type: 'url', placeholder: 'github.com/username' };
const INSTAGRAM: FieldDef = { key: 'instagram', label: 'Instagram', type: 'url', placeholder: 'instagram.com/username' };
const PORTFOLIO: FieldDef = { key: 'portfolio', label: 'Portfolio URL', type: 'url', placeholder: 'behance.net/username' };
const ABOUT: FieldDef = { key: 'description', label: 'About me', type: 'textarea', placeholder: 'A short introduction', wide: true };
const LOCATION: FieldDef = { key: 'address', label: 'Location', type: 'text', placeholder: 'Bengaluru, India' };

// Profession -> fields. Keep in sync with backend/app/cards/fields.py.
export const FIELDS: Record<Profession, FieldDef[]> = {
  developer: [
    NAME,
    { key: 'title', label: 'Professional title', type: 'text', required: true, placeholder: 'Senior Frontend Engineer' },
    { key: 'organization', label: 'Company name', type: 'text', placeholder: 'Acme Labs' },
    EMAIL, PHONE, WEBSITE, LINKEDIN, GITHUB, PORTFOLIO, LOCATION, PHOTO, ABOUT,
  ],
  business: [
    { ...NAME, placeholder: 'Priya Shah' },
    { key: 'organization', label: 'Business name', type: 'text', required: true, placeholder: 'Bluepeak Studio' },
    { key: 'category', label: 'Business category', type: 'text', placeholder: 'Branding & web design' },
    { key: 'title', label: 'Designation', type: 'text', required: true, placeholder: 'Founder & CEO' },
    EMAIL, PHONE, WEBSITE,
    { key: 'address', label: 'Business address', type: 'text', placeholder: '45 Harbour Street, Mumbai' },
    { key: 'instagram', label: 'Instagram', type: 'url', placeholder: 'instagram.com/yourbusiness' },
    { key: 'linkedin', label: 'LinkedIn page', type: 'url', placeholder: 'linkedin.com/company/name' },
    { key: 'facebook', label: 'Facebook', type: 'url', placeholder: 'facebook.com/yourbusiness' },
    { key: 'twitter', label: 'X (Twitter)', type: 'url', placeholder: 'x.com/yourbusiness' },
    { key: 'image', label: 'Business logo', type: 'image' },
    { key: 'description', label: 'Business description', type: 'textarea', placeholder: 'What you do and who you help', wide: true },
  ],
  freelancer: [
    NAME,
    { key: 'title', label: 'Professional title', type: 'text', required: true, placeholder: 'Freelance Copywriter' },
    EMAIL, PHONE, PORTFOLIO, LINKEDIN, WEBSITE, INSTAGRAM, PHOTO,
    { key: 'services', label: 'Services offered', type: 'textarea', placeholder: 'Website copy, product launches, brand voice', wide: true },
    ABOUT,
  ],
  designer: [
    NAME,
    { key: 'title', label: 'Professional title', type: 'text', required: true, placeholder: 'Product Designer' },
    { key: 'organization', label: 'Studio or company', type: 'text', placeholder: 'Pixel & Co.' },
    EMAIL, PHONE, { ...PORTFOLIO, placeholder: 'dribbble.com/username' }, WEBSITE, LINKEDIN, INSTAGRAM, LOCATION, PHOTO,
    { ...ABOUT, placeholder: 'Specialties: UX research, design systems, motion' },
  ],
  consultant: [
    NAME,
    { key: 'title', label: 'Professional title', type: 'text', required: true, placeholder: 'Management Consultant' },
    { key: 'organization', label: 'Firm', type: 'text', placeholder: 'Northstar Advisory' },
    EMAIL, PHONE, WEBSITE,
    { key: 'appointment', label: 'Booking link', type: 'url', placeholder: 'calendly.com/username' },
    LINKEDIN, LOCATION, PHOTO,
    { key: 'services', label: 'Areas of expertise', type: 'textarea', placeholder: 'Growth strategy, operations, fundraising', wide: true },
    ABOUT,
  ],
  student: [
    NAME,
    { key: 'title', label: 'Course or degree', type: 'text', required: true, placeholder: 'B.Tech, Computer Science' },
    { key: 'organization', label: 'College or university', type: 'text', required: true, placeholder: 'IIT Madras' },
    EMAIL, { ...PHONE, required: false }, LINKEDIN, GITHUB, PORTFOLIO, PHOTO,
    { ...ABOUT, placeholder: 'Interests, projects and skills' },
  ],
  other: [
    NAME,
    { key: 'title', label: 'Professional title', type: 'text', required: true, placeholder: 'Event Planner' },
    { key: 'organization', label: 'Company or organization', type: 'text', placeholder: 'Bright Events' },
    EMAIL, PHONE, WEBSITE, LINKEDIN, LOCATION, PHOTO, ABOUT,
  ],
  doctor: [
    { ...NAME, placeholder: 'Dr. Anita Rao' },
    { key: 'title', label: 'Qualification', type: 'text', required: true, placeholder: 'MBBS, MD' },
    { key: 'designation', label: 'Designation / specialty', type: 'text', placeholder: 'Consultant Cardiologist' },
    { key: 'organization', label: 'Clinic or hospital', type: 'text', placeholder: 'City Heart Clinic' },
    EMAIL, PHONE,
    { key: 'address', label: 'Clinic address', type: 'text', placeholder: '12 MG Road, Bengaluru' },
    { key: 'appointment', label: 'Appointment booking link', type: 'url', placeholder: 'book.example.com/anita' },
    WEBSITE, PHOTO,
    { key: 'description', label: 'About', type: 'textarea', placeholder: 'Experience, areas of care, consultation hours', wide: true },
  ],
  lawyer: [
    { ...NAME, placeholder: 'Adv. Rahul Mehta' },
    { key: 'title', label: 'Practice area', type: 'text', required: true, placeholder: 'Corporate & Commercial Law' },
    { key: 'designation', label: 'Designation', type: 'text', placeholder: 'Senior Partner' },
    { key: 'organization', label: 'Law firm', type: 'text', placeholder: 'Mehta & Associates' },
    EMAIL, PHONE,
    { key: 'address', label: 'Office address', type: 'text', placeholder: 'Lodha Tower, Mumbai' },
    { key: 'appointment', label: 'Consultation booking link', type: 'url', placeholder: 'calendly.com/rahul' },
    WEBSITE, LINKEDIN, PHOTO,
    { key: 'description', label: 'Practice summary', type: 'textarea', placeholder: 'Contracts, mergers, compliance', wide: true },
  ],
  realtor: [
    NAME,
    { key: 'title', label: 'Designation', type: 'text', required: true, placeholder: 'Senior Property Consultant' },
    { key: 'organization', label: 'Agency', type: 'text', required: true, placeholder: 'Skyline Realty' },
    EMAIL, PHONE,
    { key: 'address', label: 'Office address', type: 'text', placeholder: 'Whitefield, Bengaluru' },
    { ...WEBSITE, label: 'Listings website' }, INSTAGRAM, LINKEDIN, PHOTO,
    { key: 'description', label: 'Areas and property types', type: 'textarea', placeholder: 'Apartments and villas in East Bengaluru', wide: true },
  ],
  educator: [
    NAME,
    { key: 'title', label: 'Subject or role', type: 'text', required: true, placeholder: 'Mathematics Teacher' },
    { key: 'organization', label: 'School or institute', type: 'text', placeholder: 'Bright Minds Academy' },
    EMAIL, PHONE, LOCATION,
    { key: 'appointment', label: 'Class booking link', type: 'url', placeholder: 'forms.gle/your-form' },
    WEBSITE, LINKEDIN, PHOTO,
    { key: 'description', label: 'About and courses', type: 'textarea', placeholder: 'Grades 9-12, JEE preparation', wide: true },
  ],
};

const LINK_LABELS: Record<string, string> = {
  website: 'Website',
  portfolio: 'Portfolio',
  appointment: 'Book appointment',
  github: 'GitHub',
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  facebook: 'Facebook',
  twitter: 'X',
};

export const DEFAULT_STYLE: CardStyle = { template: 'classic', theme: 'aurora', font: 'sans', animated: true };

export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function toCardView(values: Record<string, string>): CardView {
  const v = values;
  return {
    name: v.name ?? '',
    headline: [v.title, v.designation].filter(Boolean).join(' · '),
    organization: [v.organization, v.category].filter(Boolean).join(' · '),
    phone: v.phone ?? '',
    email: v.email ?? '',
    address: v.address ?? '',
    image: v.image ?? '',
    description: [v.description, v.services && `Services: ${v.services}`].filter(Boolean).join('\n\n'),
    links: Object.keys(LINK_LABELS)
      .filter(key => v[key])
      .map(key => ({ key, label: LINK_LABELS[key], href: normalizeUrl(v[key]) })),
  };
}

export function missingRequired(card: Pick<Card, 'profession' | 'values'>): FieldDef[] {
  if (!card.profession) return [];
  return FIELDS[card.profession].filter(field => field.required && !card.values[field.key]?.trim());
}

export function publicCardUrl(slug: string): string {
  return `${window.location.origin}/card/${slug}`;
}

// The link stored by the server; falls back to this site's address for older responses.
export const cardUrl = (card: Pick<Card, 'slug' | 'public_url'>) => card.public_url || publicCardUrl(card.slug ?? '');
