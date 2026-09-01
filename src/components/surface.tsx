import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { alpha, radius, shadow } from '@/theme/tokens';

type Variant = 'glass' | 'flat';

type SurfaceProps = {
  children?: React.ReactNode;
  /** `glass` is the lighter, more translucent fill; `flat` sits more solidly. */
  variant?: Variant;
  cornerRadius?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * The translucent panel everything sits on.
 *
 * Deliberately not a real backdrop blur. Android has no free one, and the
 * current `expo-blur` needs a `blurTarget` ref to a `BlurTargetView` that
 * wraps the content being blurred — which a card nested *inside* that content
 * cannot have without blurring itself. Left unconfigured it paints an opaque
 * rectangle, and `elevation` stops `overflow: hidden` from clipping it to the
 * rounded frame, so it shows up as a square white box.
 *
 * No loss: the backdrop is a smooth gradient with no high-frequency detail, so
 * blurring it returns almost exactly the same pixels. What reads as glass here
 * is the translucency and the bright top edge, and those are real.
 */
export function Surface({
  children,
  variant = 'glass',
  cornerRadius = radius.card,
  style,
}: SurfaceProps) {
  return (
    <View
      style={[
        styles.frame,
        { borderRadius: cornerRadius },
        variant === 'flat' ? styles.flatFill : styles.glassFill,
        shadow.card,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: alpha.glassBorder,
  },
  glassFill: {
    backgroundColor: alpha.glass,
  },
  flatFill: {
    backgroundColor: alpha.glassStrong,
  },
});
