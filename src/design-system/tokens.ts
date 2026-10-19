export const blueOceanTokens = {
  colors: {
    primary900: '#0B1F3B',
    primary600: '#1E63F0',
    electric: '#00A3FF',
    turquoise: '#00D4C4',
    canvas: '#F6F8FB',
    surface: '#FFFFFF',
    text: '#17263B',
    muted: '#718198',
    border: '#DBE4EF',
  },
  radius: { sm: 6, md: 8, lg: 12, xl: 16 },
  controlHeight: { sm: 30, md: 36, lg: 42 },
  layout: { sidebar: 244, header: 64, inspector: 340 },
} as const;

export type BlueOceanTokens = typeof blueOceanTokens;
