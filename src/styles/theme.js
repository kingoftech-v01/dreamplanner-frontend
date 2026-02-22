// DreamPlanner Design Tokens
export const colors = {
  primary: '#8B5CF6',
  primaryLight: '#C4B5FD',
  primaryDark: '#7C3AED',
  teal: '#14B8A6',
  tealLight: '#5EEAD4',
  green: '#5DE5A8',
  greenSolid: '#10B981',
  red: '#F69A9A',
  redSolid: '#EF4444',
  yellow: '#FCD34D',
  pink: '#EC4899',
  indigo: '#6366F1',
  blue: '#3B82F6',

  bgDeep: '#03010a',
  bgDark: '#070412',
  bgMid: '#0c081a',

  white: '#ffffff',
  textPrimary: 'rgba(255,255,255,1)',
  textSecondary: 'rgba(255,255,255,0.7)',
  textMuted: 'rgba(255,255,255,0.45)',
  textDim: 'rgba(255,255,255,0.3)',

  glass: 'rgba(255,255,255,0.05)',
  glassBorder: 'rgba(255,255,255,0.08)',
  glassHighlight: 'rgba(255,255,255,0.06)',
  glassHover: 'rgba(255,255,255,0.08)',
};

export const categories = {
  career:        { color: '#8B5CF6', label: 'Career' },
  hobbies:       { color: '#EC4899', label: 'Hobbies' },
  health:        { color: '#10B981', label: 'Health' },
  finance:       { color: '#FCD34D', label: 'Finance' },
  personal:      { color: '#6366F1', label: 'Growth' },
  relationships: { color: '#14B8A6', label: 'Social' },
};

export const glass = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(40px)',
  WebkitBackdropFilter: 'blur(40px)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.3)',
  borderRadius: 20,
};

export const glassHover = {
  background: 'rgba(255,255,255,0.08)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 8px 32px rgba(0,0,0,0.4)',
  transform: 'translateY(-2px)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const animation = {
  fast: '0.15s',
  normal: '0.25s',
  slow: '0.35s',
  entrance: '0.6s',
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  staggerBase: 80,
  staggerIncrement: 60,
};
