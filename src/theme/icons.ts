import {
  Car,
  CircleEllipsis,
  CreditCard,
  FileText,
  Film,
  HeartPulse,
  Megaphone,
  ShoppingBag,
  User,
  Utensils,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';

/**
 * `categories.icon` in Postgres holds a Lucide icon name — see
 * supabase/migrations/0004_seed_categories.sql in the backend repo. These are
 * the eleven shared defaults; a user-created category can carry any name, so
 * always resolve through `categoryIcon()` rather than indexing directly.
 */
const byName: Record<string, LucideIcon> = {
  utensils: Utensils,
  'shopping-bag': ShoppingBag,
  'file-text': FileText,
  car: Car,
  'credit-card': CreditCard,
  'heart-pulse': HeartPulse,
  film: Film,
  wallet: Wallet,
  megaphone: Megaphone,
  user: User,
  'circle-ellipsis': CircleEllipsis,
};

export function categoryIcon(name: string | null | undefined): LucideIcon {
  if (!name) return CircleEllipsis;
  return byName[name] ?? CircleEllipsis;
}
