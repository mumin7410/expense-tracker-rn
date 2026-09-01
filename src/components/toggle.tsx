import { Pressable, StyleSheet, View } from 'react-native';

import { color, radius } from '@/theme/tokens';

/**
 * The iOS-style switch from the canvas. Drawn rather than using the platform
 * `Switch` so it carries the same accent and geometry as everything else.
 */
export function Toggle({
  value,
  onValueChange,
  disabled,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={[
        styles.track,
        value ? styles.trackOn : styles.trackOff,
        disabled && styles.disabled,
      ]}>
      <View style={[styles.knob, value ? styles.knobOn : styles.knobOff]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 51,
    height: 31,
    padding: 2,
    borderRadius: radius.pill,
    justifyContent: 'center',
  },
  trackOn: {
    backgroundColor: color.accent,
    alignItems: 'flex-end',
  },
  trackOff: {
    backgroundColor: color.iconWell,
    alignItems: 'flex-start',
  },
  disabled: {
    opacity: 0.5,
  },
  knob: {
    width: 27,
    height: 27,
    borderRadius: radius.pill,
    backgroundColor: color.white,
  },
  knobOn: {
    boxShadow: '0px 2px 5px rgba(36,41,51,0.30)',
  },
  knobOff: {
    boxShadow: '0px 2px 5px rgba(36,41,51,0.20)',
  },
});
