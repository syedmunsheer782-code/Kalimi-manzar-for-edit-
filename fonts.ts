export type FontCategory =
  | 'All'
  | 'Custom'
  | 'Clean Normal'
  | 'Editorial Serif'
  | 'Modern Geometric'
  | 'Condensed'
  | 'Heavy Bold';

export interface FontItem {
  id: string;
  name: string;
  family: string;
  category: Exclude<FontCategory, 'All'>;
  defaultWeight: number;
  weights: number[];
  sample: string;
  isCustom?: boolean;
}

export const FONT_CATEGORIES: FontCategory[] = [
  'All',
  'Custom',
  'Clean Normal',
  'Editorial Serif',
  'Modern Geometric',
  'Condensed',
  'Heavy Bold',
];

export const FONT_LIBRARY: FontItem[] = [
  // Clean Normal
  {
    id: 'dm-sans',
    name: 'DM Sans',
    family: '"DM Sans", -apple-system, sans-serif',
    category: 'Clean Normal',
    defaultWeight: 400,
    weights: [400, 500, 700, 900],
    sample: 'Clean Studio Type',
  },
  {
    id: 'plus-jakarta',
    name: 'Plus Jakarta Sans',
    family: '"Plus Jakarta Sans", -apple-system, sans-serif',
    category: 'Clean Normal',
    defaultWeight: 400,
    weights: [400, 600, 800],
    sample: 'Crisp Modern Clarity',
  },
  {
    id: 'manrope',
    name: 'Manrope',
    family: '"Manrope", sans-serif',
    category: 'Clean Normal',
    defaultWeight: 400,
    weights: [400, 600, 800],
    sample: 'Balanced Neutral Sans',
  },
  {
    id: 'work-sans',
    name: 'Work Sans',
    family: '"Work Sans", sans-serif',
    category: 'Clean Normal',
    defaultWeight: 400,
    weights: [400, 600, 900],
    sample: 'Precision Subtitles',
  },
  {
    id: 'nunito-sans',
    name: 'Nunito Sans',
    family: '"Nunito Sans", sans-serif',
    category: 'Clean Normal',
    defaultWeight: 400,
    weights: [400, 700, 900],
    sample: 'Friendly Editorial',
  },
  {
    id: 'jetbrains-mono',
    name: 'JetBrains Mono',
    family: '"JetBrains Mono", monospace',
    category: 'Clean Normal',
    defaultWeight: 400,
    weights: [400, 600, 700],
    sample: 'TIMECODE 00:04:12',
  },

  // Modern Geometric
  {
    id: 'outfit',
    name: 'Outfit',
    family: '"Outfit", sans-serif',
    category: 'Modern Geometric',
    defaultWeight: 600,
    weights: [400, 600, 800, 900],
    sample: 'Geometric Display',
  },
  {
    id: 'urbanist',
    name: 'Urbanist',
    family: '"Urbanist", sans-serif',
    category: 'Modern Geometric',
    defaultWeight: 600,
    weights: [400, 600, 800, 900],
    sample: 'Sleek Urban Motion',
  },
  {
    id: 'sora',
    name: 'Sora',
    family: '"Sora", sans-serif',
    category: 'Modern Geometric',
    defaultWeight: 600,
    weights: [400, 600, 800],
    sample: 'Tech Documentary',
  },
  {
    id: 'syne',
    name: 'Syne',
    family: '"Syne", sans-serif',
    category: 'Modern Geometric',
    defaultWeight: 800,
    weights: [600, 800],
    sample: 'AVANT TITLE',
  },
  {
    id: 'bricolage',
    name: 'Bricolage Grotesque',
    family: '"Bricolage Grotesque", sans-serif',
    category: 'Modern Geometric',
    defaultWeight: 600,
    weights: [400, 600, 800],
    sample: 'Creator Expressive',
  },
  {
    id: 'archivo',
    name: 'Archivo',
    family: '"Archivo", sans-serif',
    category: 'Modern Geometric',
    defaultWeight: 600,
    weights: [400, 600, 800],
    sample: 'Broadcast Grotesque',
  },

  // Editorial Serif
  {
    id: 'playfair',
    name: 'Playfair Display',
    family: '"Playfair Display", Georgia, serif',
    category: 'Editorial Serif',
    defaultWeight: 700,
    weights: [500, 700, 900],
    sample: 'Cinematic Elegance',
  },
  {
    id: 'cormorant',
    name: 'Cormorant Garamond',
    family: '"Cormorant Garamond", Georgia, serif',
    category: 'Editorial Serif',
    defaultWeight: 500,
    weights: [500, 700],
    sample: 'Fine Film Credits',
  },
  {
    id: 'lora',
    name: 'Lora',
    family: '"Lora", Georgia, serif',
    category: 'Editorial Serif',
    defaultWeight: 400,
    weights: [400, 700],
    sample: 'Storytelling Serif',
  },
  {
    id: 'cinzel',
    name: 'Cinzel',
    family: '"Cinzel", Georgia, serif',
    category: 'Editorial Serif',
    defaultWeight: 600,
    weights: [600, 900],
    sample: 'EPIC TRAILER TITLE',
  },
  {
    id: 'bodoni',
    name: 'Bodoni Moda',
    family: '"Bodoni Moda", Georgia, serif',
    category: 'Editorial Serif',
    defaultWeight: 600,
    weights: [600, 900],
    sample: 'High Contrast Vogue',
  },

  // Condensed
  {
    id: 'oswald',
    name: 'Oswald',
    family: '"Oswald", sans-serif',
    category: 'Condensed',
    defaultWeight: 700,
    weights: [400, 600, 700],
    sample: 'TALL IMPACT HEADLINE',
  },
  {
    id: 'barlow-condensed',
    name: 'Barlow Condensed',
    family: '"Barlow Condensed", sans-serif',
    category: 'Condensed',
    defaultWeight: 700,
    weights: [500, 700, 900],
    sample: 'SHORTS CAPTION PRO',
  },
  {
    id: 'antonio',
    name: 'Antonio',
    family: '"Antonio", sans-serif',
    category: 'Condensed',
    defaultWeight: 700,
    weights: [400, 700],
    sample: 'POSTER CONDENSED',
  },
  {
    id: 'bebas-neue',
    name: 'Bebas Neue',
    family: '"Bebas Neue", sans-serif',
    category: 'Condensed',
    defaultWeight: 400,
    weights: [400],
    sample: 'YOUTUBE THUMBNAIL',
  },
  {
    id: 'big-shoulders',
    name: 'Big Shoulders Display',
    family: '"Big Shoulders Display", sans-serif',
    category: 'Condensed',
    defaultWeight: 900,
    weights: [700, 900],
    sample: 'ULTRA TALL REELS',
  },

  // Heavy Bold
  {
    id: 'anton',
    name: 'Anton',
    family: '"Anton", Impact, sans-serif',
    category: 'Heavy Bold',
    defaultWeight: 400,
    weights: [400],
    sample: 'HEAVY CREATOR POP',
  },
  {
    id: 'archivo-black',
    name: 'Archivo Black',
    family: '"Archivo Black", Impact, sans-serif',
    category: 'Heavy Bold',
    defaultWeight: 400,
    weights: [400],
    sample: 'MAXIMUM BOLD IMPACT',
  },
  {
    id: 'black-han-sans',
    name: 'Black Han Sans',
    family: '"Black Han Sans", Impact, sans-serif',
    category: 'Heavy Bold',
    defaultWeight: 400,
    weights: [400],
    sample: 'THICK CHUNKY BLOCK',
  },
  {
    id: 'bungee',
    name: 'Bungee',
    family: '"Bungee", Impact, sans-serif',
    category: 'Heavy Bold',
    defaultWeight: 400,
    weights: [400],
    sample: 'ARCADE SIGNAGE',
  },
  {
    id: 'rubik-mono',
    name: 'Rubik Mono One',
    family: '"Rubik Mono One", monospace',
    category: 'Heavy Bold',
    defaultWeight: 400,
    weights: [400],
    sample: 'ULTRA WIDE SLAM',
  },
];
