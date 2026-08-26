export const SPORT_COLOURS: Record<string, string> = {
  basketball: '#F97316',
  tennis: '#22C55E',
  football: '#3B82F6',
  padel: '#8B5CF6',
  volleyball: '#F59E0B',
  bouldering: '#EF4444',
  running: '#EC4899',
  cycling: '#06B6D4',
  swimming: '#0EA5E9',
  triathlon: '#6366F1',
  badminton: '#84CC16',
  table_tennis: '#FB923C',
  squash: '#10B981',
  futsal: '#60A5FA',
  handball: '#A78BFA',
  rugby: '#14B8A6',
  pickleball: '#FBBF24',
  boxing: '#F43F5E',
  martial_arts: '#DC2626',
  rock_climbing: '#A16207',
  weightlifting: '#78716C',
  rowing: '#0369A1',
  chess: '#4B5563',
  darts: '#DB2777',
  pool: '#15803D',
  foosball: '#B45309',
  beach_volleyball: '#EAB308',
  beach_tennis: '#FDBA74',
  racquetball: '#2563EB',
  ultimate_frisbee: '#7C3AED',
  water_polo: '#0891B2',
  field_hockey: '#16A34A',
  cricket: '#CA8A04',
  golf: '#4ADE80',
  bowling: '#818CF8',
  skiing: '#38BDF8',
  snowboarding: '#7DD3FC',
  skateboarding: '#737373',
  surfing: '#22D3EE',
  yoga: '#A855F7',
  hiking: '#65A30D',
  crossfit: '#EA580C',
};

const FALLBACKS = ['#6C47FF', '#FF6B35', '#22C55E', '#F59E0B', '#3B82F6', '#EC4899'];

export function getSportColour(slug?: string | null): string {
  if (slug && SPORT_COLOURS[slug]) return SPORT_COLOURS[slug];
  if (!slug) return FALLBACKS[0];
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return FALLBACKS[h % FALLBACKS.length];
}
