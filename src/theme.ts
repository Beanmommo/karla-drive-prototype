export const colors = {
  background: '#FAFCFD',
  surface: '#FFFFFF',
  border: '#E1EBF1',
  ink: '#272724',
  muted: '#52616B',
  neutralSoft: '#ECEFF1',
  neutralBorder: '#D7DDE1',
  // Dominant opaque blue sampled from the car in koala-driving-logo-v5.png.
  accent: '#84CEFC',
  accentSoft: '#E4F4FE',
  accentPressed: '#72C3F6',
  accentEdge: '#59ACE0',
  accentInk: '#256087',
  error: '#A12D32',
  errorSoft: '#FFF0F0',
} as const;

// Hue variants of accent: OKLCH lightness ~0.820 and chroma ~0.098.
// All keep at least 8.5:1 contrast against the koala's #282322 outline.
export const learnerAvatarColors = [
  { id: 'sky', label: 'Sky', background: colors.accent },
  { id: 'mint', label: 'Mint', background: '#89D8AE' },
  { id: 'lavender', label: 'Lavender', background: '#CEB6FB' },
  { id: 'rose', label: 'Rose', background: '#F8AAC7' },
  { id: 'peach', label: 'Peach', background: '#F4B582' },
  { id: 'butter', label: 'Butter', background: '#D8C478' },
] as const;

export type LearnerAvatarColorId = (typeof learnerAvatarColors)[number]['id'];

export const fonts = {
  regular: 'Fredoka_400Regular',
  medium: 'Fredoka_500Medium',
  semibold: 'Fredoka_600SemiBold',
} as const;
