/**
 * Yay-chat design tokens.
 *
 * Original Yay-chat identity: warm "sunrise paper" neutrals with a muted,
 * burnt-orange brand color (echoing BTCY's orange without its brightness)
 * and a deep-teal accent for contrast. Intentionally distinct from WeChat.
 */

export const palette = {
  // Brand — muted burnt orange
  ember50: '#fbead9',
  ember100: '#f3d2ac',
  ember400: '#cf7a34',
  ember500: '#b5642a',
  ember600: '#8f4e20',
  ember700: '#6e3c19',

  // Accent — deep teal, contrasts the orange brand
  teal100: '#d9ece7',
  teal400: '#3f8f80',
  teal500: '#2c7568',

  // Warm neutrals
  paper: '#fffaf3',
  cream: '#f7f1e7',
  sand: '#efe6d6',
  line: '#e3d8c6',
  lineSoft: '#ede4d4',

  // Ink
  ink900: '#1c2a22',
  ink700: '#415047',
  ink500: '#68756d',
  ink300: '#98a29b',

  // Semantic
  success: '#2f9a67',
  warning: '#d98a17',
  danger: '#d0503f',
  info: '#2f6ab8',
  gold: '#c6942f',

  white: '#ffffff',
  overlay: 'rgba(24, 34, 28, 0.45)',
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

  brand: palette.ember500,
  brandStrong: palette.ember600,
  brandSoft: palette.ember50,
  brandBorder: palette.ember100,

  accent: palette.teal500,
  accentSoft: palette.teal100,

  border: palette.line,
  borderSoft: palette.lineSoft,

  success: palette.success,
  successSoft: '#e2f3ea',
  warning: palette.warning,
  warningSoft: '#faeed7',
  danger: palette.danger,
  dangerSoft: '#f9e4e0',
  info: palette.info,
  infoSoft: '#e3ecf8',
  gold: palette.gold,
  goldSoft: '#f6ecd7',

  bubbleMine: palette.ember500,
  bubbleTheirs: palette.white,

  overlay: palette.overlay,
  skeleton: '#eadfce',
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
    shadowColor: '#1c2a22',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 4},
    elevation: 2,
  },
  raised: {
    shadowColor: '#1c2a22',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: 8},
    elevation: 6,
  },
} as const;

export const avatarPalette = [
  '#b5642a',
  '#2c7568',
  '#2f6ab8',
  '#c6942f',
  '#7b5cb8',
  '#d0507a',
  '#4a8f3f',
  '#8a6d3b',
];

export const avatarColorFor = (seed: string): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  }
  return avatarPalette[hash % avatarPalette.length];
};
