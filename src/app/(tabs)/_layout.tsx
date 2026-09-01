import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { House, ImageUp, Inbox, SlidersHorizontal, type LucideIcon } from 'lucide-react-native';
import { forwardRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { usePendingTransactions } from '@/features/transactions/queries';
import { useQueueSync } from '@/queue/use-queue';
import { useScreenshotWatcher } from '@/queue/use-screenshot-watcher';
import { alpha, color, radius, shadow, type } from '@/theme/tokens';

/**
 * The canvas puts the three tabs in a floating glass capsule and keeps the
 * capture button beside it as a separate accent circle — capturing a slip is
 * an action, not a place, so it does not belong in the tab row.
 *
 * Built on the headless tabs from `expo-router/ui` rather than the default
 * navigator: the dock is two sibling surfaces, which a `tabBar` slot cannot
 * express.
 *
 * The shape here is not a style preference. `parseTriggersFromChildren` walks
 * only Fragments and `TabList`, and `asChild` unwraps exactly one element — so
 * `TabList` has to be a direct child of `Tabs`, and the triggers direct
 * children of the element it wraps. Wrapping either in a layout `View` leaves
 * the navigator with no screens at all. Hence two absolutely positioned
 * siblings rather than one flex row.
 */
export default function TabsLayout() {
  const router = useRouter();
  const { data: pending } = usePendingTransactions();
  // Drains the offline queue on mount and whenever the app is foregrounded.
  useQueueSync();
  // No-op unless the user opted in from Settings — see that screen for the toggle.
  useScreenshotWatcher();

  // The picker stays even with the listener running: it is the only way in
  // for a slip that was never a screenshot (forwarded image, saved earlier).
  const pickSlip = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 1,
    });
    if (result.canceled) return;
    router.push({ pathname: '/review', params: { uri: result.assets[0].uri } });
  };

  return (
    <Tabs>
      <TabSlot />

      <TabList asChild>
        <View style={styles.capsule}>
          <TabTrigger name="home" href="/" asChild>
            <TabButton icon={House} label="หน้าแรก" />
          </TabTrigger>
          <TabTrigger name="pending" href="/pending" asChild>
            <TabButton icon={Inbox} label="รอจัดหมวด" badge={pending?.length} />
          </TabTrigger>
          <TabTrigger name="settings" href="/settings" asChild>
            <TabButton icon={SlidersHorizontal} label="ตั้งค่า" />
          </TabTrigger>
        </View>
      </TabList>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="เลือกรูปสลิป"
        onPress={pickSlip}
        style={({ pressed }) => [styles.capture, pressed && styles.capturePressed]}>
        <ImageUp size={24} strokeWidth={1.9} color={color.white} />
      </Pressable>
    </Tabs>
  );
}

type TabButtonProps = TabTriggerSlotProps & {
  icon: LucideIcon;
  label: string;
  /** Rendered only when there is something to count. */
  badge?: number;
};

const TabButton = forwardRef<View, TabButtonProps>(
  ({ icon: Icon, label, badge, isFocused, style: _ignored, ...pressableProps }, ref) => (
    // `style` is applied after the spread on purpose. TabTrigger passes its own
    // slot props through, and a `style` key among them — even one holding
    // `undefined` — wins if it is spread last, silently dropping the layout.
    <Pressable
      ref={ref}
      {...pressableProps}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
      style={[styles.tab, isFocused && styles.tabFocused]}>
      <Icon
        size={20}
        strokeWidth={isFocused ? 1.9 : 1.8}
        color={isFocused ? color.accentInk : color.textSubtle}
      />
      <Text style={[styles.tabLabel, isFocused && styles.tabLabelFocused]}>{label}</Text>
      {badge !== undefined && badge > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  )
);

TabButton.displayName = 'TabButton';

const styles = StyleSheet.create({
  capsule: {
    position: 'absolute',
    left: 20,
    // Leaves room for the capture button (62) plus the 12 gap beside it.
    right: 94,
    bottom: 26,
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: alpha.glassBorderStrong,
    backgroundColor: alpha.glassStrong,
    ...shadow.floating,
  },
  tab: {
    width: 66,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: radius.pill,
  },
  tabFocused: {
    backgroundColor: alpha.accentWash,
  },
  tabLabel: {
    ...type.tab,
    color: color.textSubtle,
  },
  tabLabelFocused: {
    color: color.accentInk,
  },
  badge: {
    position: 'absolute',
    top: -1,
    right: 8,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: color.warn,
  },
  badgeText: {
    fontFamily: type.tab.fontFamily,
    fontSize: 10,
    color: color.white,
  },
  capture: {
    position: 'absolute',
    right: 20,
    bottom: 26,
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: color.accent,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.accentEdge,
    ...shadow.accent,
  },
  capturePressed: {
    backgroundColor: color.accentPressed,
  },
});
