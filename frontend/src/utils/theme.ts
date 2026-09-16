// Color and Theme Utility for Multi-Tenant Empresa Customization

export interface PresetColor {
  name: string;
  hex: string;
  bgLight: string;
  borderLight: string;
}

export const PRESET_COMPANY_COLORS: PresetColor[] = [
  { name: 'Azul Petróleo', hex: '#176B87', bgLight: '#E8F3F6', borderLight: '#C6E3EB' },
  { name: 'Azul Oceano', hex: '#0284C7', bgLight: '#E0F2FE', borderLight: '#BAE6FD' },
  { name: 'Índigo Real', hex: '#4F46E5', bgLight: '#EEF2FF', borderLight: '#C7D2FE' },
  { name: 'Verde Esmeralda', hex: '#059669', bgLight: '#ECFDF5', borderLight: '#A7F3D0' },
  { name: 'Âmbar Obras', hex: '#D97706', bgLight: '#FEF3C7', borderLight: '#FDE68A' },
  { name: 'Laranja Construtor', hex: '#EA580C', bgLight: '#FFEDD5', borderLight: '#FED7AA' },
  { name: 'Vermelho Rubi', hex: '#E11D48', bgLight: '#FFE4E6', borderLight: '#FECDD3' },
  { name: 'Roxo Corporativo', hex: '#7C3AED', bgLight: '#F3E8FF', borderLight: '#DDD6FE' },
  { name: 'Grafite Moderno', hex: '#334155', bgLight: '#F1F5F9', borderLight: '#CBD5E1' },
];

/**
 * Converts a hex color (#RRGGBB) to rgba string with custom opacity
 */
export function hexToRgba(hex: string = '#176B87', alpha: number = 1): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) || 23;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 107;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 135;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Generates styling helpers for components based on an Empresa's primary color
 */
export function getCompanyTheme(color: string = '#176B87') {
  const safeColor = color.startsWith('#') ? color : `#${color}`;
  
  return {
    primaryHex: safeColor,
    bgLight: hexToRgba(safeColor, 0.09),
    bgLightHover: hexToRgba(safeColor, 0.15),
    borderLight: hexToRgba(safeColor, 0.28),
    ringColor: hexToRgba(safeColor, 0.25),
    shadowLight: `0 4px 14px ${hexToRgba(safeColor, 0.2)}`,
    shadowHover: `0 8px 20px ${hexToRgba(safeColor, 0.28)}`,
  };
}

/**
 * Modern corporate preset images for quick company selection
 */
export const PRESET_COMPANY_LOGOS = [
  {
    id: 'tower',
    name: 'Edifício & Torre',
    url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=160&auto=format&fit=crop&q=80',
  },
  {
    id: 'blueprint',
    name: 'Projetos & Engenharia',
    url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=160&auto=format&fit=crop&q=80',
  },
  {
    id: 'bridge',
    name: 'Infraestrutura & Pontes',
    url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=160&auto=format&fit=crop&q=80',
  },
  {
    id: 'industry',
    name: 'Indústria & Montagens',
    url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=160&auto=format&fit=crop&q=80',
  },
  {
    id: 'modern',
    name: 'Arquitetura Moderna',
    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=160&auto=format&fit=crop&q=80',
  },
];
