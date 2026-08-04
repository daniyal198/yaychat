/**
 * YaysApp design tokens.
 *
 * Warm sand-and-amber identity: a golden-orange brand color over soft warm
 * neutrals and brown ink, with dark brown as the contrast accent.
 */

export const palette = {
  // Brand — rich, elegant amber orange
  ember50: '#fdeeda',
  ember100: '#f8d6a8',
  ember200: '#efb066', // primary light
  ember400: '#e5852b', // primary
  ember500: '#d4761f',
  ember600: '#b26018',
  ember700: '#8a4a12',

  // Accent — dark brown, contrasts the amber brand
  brown100: '#e8ddd5',
  brown400: '#9c7c6e',
  brown500: '#84675c',

  // Warm neutrals
  paper: '#ffffff',
  mist: '#eceae7', // soft light grey for ecosystem tiles
  cream: '#f8f6f2',
  sand: '#efeae2',
  stone: '#dcd6cc',
  beige: '#d5bba6',
  line: '#e6ded3',
  lineSoft: '#efeae2',

  // Ink (warm brown scale)
  ink900: '#3e2a22',
  ink700: '#84675c',
  ink500: '#a99c92',
  ink300: '#c7cbcf',

  // Semantic
  success: '#2f9a67',
  warning: '#c6942f',
  danger: '#c85a45',
  info: '#4a7ba6',
  gold: '#c6942f',

  white: '#ffffff',
  overlay: 'rgba(18, 13, 10, 0.45)',

  // Partner brand — aiainai's red (from aiainai.com), single source of truth.
  aiainaiRed: '#ff2d2d',
};

export const colors = {
  background: palette.cream,
  surface: palette.paper,
  surfaceRaised: palette.white,
  surfaceSunken: palette.sand,

  textPrimary: palette.ink900,
  textSecondary: palette.ink700,
  textMuted: palette.ink500,
  textFaint: palette.ink300,
  textOnBrand: palette.white,

  brand: palette.ember400,
  brandStrong: palette.ember600,
  brandSoft: palette.ember50,
  brandBorder: palette.ember100,

  accent: palette.brown500,
  accentSoft: palette.brown100,

  border: palette.line,
  borderSoft: palette.lineSoft,

  success: palette.success,
  successSoft: '#e2f3ea',
  warning: palette.warning,
  warningSoft: '#f6ecd7',
  danger: palette.danger,
  dangerSoft: '#f7e2dc',
  notify: '#ff3b30',
  info: palette.info,
  infoSoft: '#e4edf4',
  gold: palette.gold,
  goldSoft: '#f6ecd7',

  tileSoft: palette.mist,

  bubbleMine: palette.ember400,
  bubbleTheirs: palette.white,
  bubbleMedia: palette.sand,
  mediaBox: palette.stone,

  overlay: palette.overlay,
  skeleton: '#ece4d8',
  tabInactive: palette.ink500,
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 44,
} as const;

/**
 * Round elements (avatars, buttons, icon chips, count bubbles) all render the
 * brand oval image (assets/oval.png, extracted from the master oval artwork)
 * scaled to size — never a shape drawn in code. Colored variants (avatar DPs,
 * unread bubbles, presence dots) tint the same image so the silhouette is
 * always pixel-identical. Render it via the <Oval> component in components.tsx.
 */
export const OVAL_SOURCE = require('../../../assets/oval.png');
// Native aspect ratio of the cropped oval artwork (width / height).
export const OVAL_ASPECT = 1133 / 1052;

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const typography = {
  titleFamily: 'Avenir Next',
  bodyFamily: 'Avenir Next',
  display: {fontSize: 30, fontWeight: '800' as const, lineHeight: 36},
  title: {fontSize: 22, fontWeight: '800' as const, lineHeight: 28},
  heading: {fontSize: 18, fontWeight: '700' as const, lineHeight: 24},
  body: {fontSize: 15, fontWeight: '500' as const, lineHeight: 21},
  bodyStrong: {fontSize: 15, fontWeight: '700' as const, lineHeight: 21},
  caption: {fontSize: 13, fontWeight: '500' as const, lineHeight: 18},
  micro: {fontSize: 11, fontWeight: '600' as const, lineHeight: 14},
} as const;

export const shadows = {
  card: {
    shadowColor: '#120d0a',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 4},
    elevation: 2,
  },
  raised: {
    shadowColor: '#120d0a',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: 8},
    elevation: 6,
  },
} as const;

export const avatarPalette = [
  '#e5852b',
  '#84675c',
  '#d4761f',
  '#a99c92',
  '#9c7c6e',
  '#c6942f',
  '#b07a4a',
  '#7a5d50',
];

export const avatarColorFor = (seed: string): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  }
  return avatarPalette[hash % avatarPalette.length];
};
