/**
 * Design tokens, ported from the approved design canvas (design/*.dc.html).
 *
 * The canvas is authored in oklch because that is what keeps the accent ramp
 * perceptually even. React Native has no oklch, so every value here is the
 * sRGB conversion of the canvas value — regenerate rather than hand-tune, or
 * the app and the canvas drift apart.
 */

export const color = {
  /** Page base, and the flat surface the widget has to use. */
  bg: '#f3f6fa',
  /** The three wash tints layered behind the glass, top-left to bottom. */
  bgTintIndigo: '#d2ddff',
  bgTintCyan: '#bfebf0',
  bgTintOrchid: '#ebe3fc',

  text: '#1f242e',
  textSecondary: '#484d58',
  textMuted: '#5e636f',
  textSubtle: '#747a87',
  textFaint: '#8b8f99',
  textGhost: '#9ea5b2',

  /** Primary accent. One hue, used for actions and confirmed states. */
  accent: '#5071de',
  accentPressed: '#3552bc',
  accentInk: '#334db0',
  accentInkDeep: '#263d97',
  accentEdge: '#688bf3',

  /** Attention. Same lightness and chroma as the accent, different hue. */
  warn: '#c35600',
  warnInk: '#9a3e00',
  warnText: '#7a5c48',
  warnMeta: '#945d36',

  danger: '#c13c3b',

  /** Category bar ramp, largest slice first. */
  barNeutral: '#c6cbd5',
  barAccent1: '#5071de',
  barAccent2: '#7694e9',
  barAccent3: '#9fb6f2',
  barAccent4: '#c3d1f3',

  surfaceOpaque: '#fcfdff',
  surfaceInset: '#f3f5f9',
  chipNeutral: '#e8ebf1',
  iconWell: '#e1e5eb',

  white: '#ffffff',
} as const;

/** Translucent fills. Glass is a fill plus a blur behind it, never a fill alone. */
export const alpha = {
  glass: 'rgba(255,255,255,0.66)',
  glassStrong: 'rgba(255,255,255,0.72)',
  glassSoft: 'rgba(255,255,255,0.58)',
  glassBorder: 'rgba(255,255,255,0.70)',
  glassBorderStrong: 'rgba(255,255,255,0.80)',
  hairline: 'rgba(36,41,51,0.08)',
  hairlineSoft: 'rgba(36,41,51,0.07)',
  accentWash: 'rgba(80,113,222,0.11)',
  accentEdgeWash: 'rgba(80,113,222,0.22)',
  warnWash: 'rgba(195,86,0,0.13)',
  warnPanel: 'rgba(250,240,230,0.72)',
  warnBorder: 'rgba(230,190,150,0.65)',
} as const;

export const radius = {
  chip: 14,
  row: 18,
  control: 20,
  card: 26,
  cardLarge: 30,
  pill: 999,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 26,
} as const;

/**
 * Anuphan carries the Thai text; the numerals come from the same family so
 * amounts and labels share a baseline. Weight is a separate family name on
 * Android, not a numeric weight.
 */
export const font = {
  regular: 'Anuphan_400Regular',
  medium: 'Anuphan_500Medium',
  semibold: 'Anuphan_600SemiBold',
  bold: 'Anuphan_700Bold',
} as const;

/**
 * Every entry carries an explicit `lineHeight` and `includeFontPadding`.
 *
 * Thai stacks a tone mark above an upper vowel above the base letter, so a
 * line box sized for Latin clips the top off words like `รอจัดหมวด` — and on
 * Android the clipping is silent. The ratios below (~1.3 for display sizes,
 * ~1.5 for text) leave room for the full stack. Never spread one of these and
 * then override `lineHeight` with something tighter.
 */
export const type = {
  /** Month total on the home screen and the widget. */
  amountHero: {
    fontFamily: font.semibold,
    fontSize: 41,
    lineHeight: 54,
    letterSpacing: -1.4,
    includeFontPadding: true,
  },
  amountLarge: {
    fontFamily: font.semibold,
    fontSize: 33,
    lineHeight: 44,
    letterSpacing: -1.2,
    includeFontPadding: true,
  },
  amountRow: {
    fontFamily: font.semibold,
    fontSize: 14.5,
    lineHeight: 22,
    includeFontPadding: true,
  },
  title: {
    fontFamily: font.bold,
    fontSize: 26,
    lineHeight: 38,
    letterSpacing: -0.6,
    includeFontPadding: true,
  },
  screenTitle: {
    fontFamily: font.semibold,
    fontSize: 21,
    lineHeight: 32,
    letterSpacing: -0.3,
    includeFontPadding: true,
  },
  headline: {
    fontFamily: font.semibold,
    fontSize: 18,
    lineHeight: 28,
    letterSpacing: -0.3,
    includeFontPadding: true,
  },
  rowTitle: {
    fontFamily: font.semibold,
    fontSize: 14,
    lineHeight: 22,
    includeFontPadding: true,
  },
  body: { fontFamily: font.regular, fontSize: 14, lineHeight: 22, includeFontPadding: true },
  label: { fontFamily: font.medium, fontSize: 12.5, lineHeight: 20, includeFontPadding: true },
  meta: { fontFamily: font.regular, fontSize: 11.5, lineHeight: 18, includeFontPadding: true },
  caption: { fontFamily: font.regular, fontSize: 11, lineHeight: 17, includeFontPadding: true },
  tab: { fontFamily: font.medium, fontSize: 9.5, lineHeight: 14, includeFontPadding: true },
} as const;

/**
 * `boxShadow`, never `elevation`.
 *
 * Android draws an elevation shadow from the view's *outline*, and on a
 * translucent view it fills that outline with an opaque rectangle first — so
 * every glass panel came out with a solid white block behind its content. The
 * CSS-style `boxShadow` React Native 0.86 supports composites correctly over
 * transparency, and takes the canvas values directly, negative spread and all.
 */
export const shadow = {
  card: {
    boxShadow: '0px 1px 1px rgba(36,41,51,0.04), 0px 12px 32px -16px rgba(36,41,51,0.20)',
  },
  floating: {
    boxShadow: '0px 1px 1px rgba(36,41,51,0.04), 0px 16px 36px -16px rgba(36,41,51,0.30)',
  },
  accent: {
    boxShadow: '0px 16px 34px -14px rgba(53,82,188,0.60)',
  },
} as const;

/** Blur radius for the glass surfaces, matched to the canvas backdrop-filter. */
export const blur = {
  surface: 28,
  bar: 30,
  chip: 20,
} as const;

/** Room left for the status bar. The canvas deliberately draws nothing here. */
export const statusBarInset = 56;
