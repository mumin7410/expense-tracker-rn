import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { color } from '@/theme/tokens';

/**
 * The wash the glass surfaces sit on.
 *
 * The canvas uses three soft radial tints. React Native has no radial
 * gradient, so this stacks three full-bleed linear ones instead — each fading
 * to its own hue at zero alpha, never to `transparent`, which fades through
 * black on Android and leaves a grey bruise across the middle of the screen.
 */
export function ScreenBackground({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.root, style]} {...rest}>
      <LinearGradient
        colors={[color.bgTintIndigo, 'rgba(210,221,255,0)']}
        locations={[0, 0.62]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.8, y: 0.62 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[color.bgTintCyan, 'rgba(191,235,240,0)']}
        locations={[0, 0.58]}
        start={{ x: 1, y: 0.04 }}
        end={{ x: 0.2, y: 0.6 }}
        style={[StyleSheet.absoluteFill, styles.cyan]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(235,227,252,0)', color.bgTintOrchid]}
        locations={[0.45, 1]}
        start={{ x: 0.45, y: 0.3 }}
        end={{ x: 0.55, y: 1 }}
        style={[StyleSheet.absoluteFill, styles.orchid]}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.bg,
  },
  cyan: {
    opacity: 0.8,
  },
  orchid: {
    opacity: 0.7,
  },
});
