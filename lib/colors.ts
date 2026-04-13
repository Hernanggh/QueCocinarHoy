import { Platform, PlatformColor } from 'react-native';

// Colores semánticos de iOS para uso en web (light mode)
const WEB: Record<string, string> = {
  label: '#000000',
  secondaryLabel: 'rgba(60,60,67,0.6)',
  tertiaryLabel: 'rgba(60,60,67,0.3)',
  systemBackground: '#ffffff',
  secondarySystemBackground: '#f2f2f7',
  tertiarySystemBackground: '#ffffff',
  systemGroupedBackground: '#f2f2f7',
  separator: 'rgba(60,60,67,0.29)',
  systemFill: 'rgba(120,120,128,0.2)',
  systemOrange: '#ff9500',
  systemRed: '#ff3b30',
  systemGreen: '#34c759',
  systemGray: '#8e8e93',
  systemGray2: '#aeaeb2',
  systemGray3: '#c7c7cc',
  systemGray4: '#d1d1d6',
  systemGray5: '#e5e5ea',
  systemGray6: '#f2f2f7',
};

/**
 * Cross-platform color helper.
 * - En iOS/Android: usa PlatformColor (colores semánticos del sistema)
 * - En Web: usa valores CSS equivalentes
 */
export function pc(name: string): any {
  if (Platform.OS === 'web') {
    return WEB[name] ?? '#000000';
  }
  return PlatformColor(name) as any;
}
