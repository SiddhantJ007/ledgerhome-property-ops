import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette } from '@/lib/theme';
import { useNotifications } from '@/providers/notifications-provider';

export function InAppNotificationBanner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bannerNotification, hideBanner, markNotificationRead } = useNotifications();

  if (!bannerNotification) {
    return null;
  }

  const tone = bannerNotification.priority === 'high' ? styles.high : bannerNotification.priority === 'low' ? styles.low : styles.normal;

  return (
    <View pointerEvents="box-none" style={[styles.overlay, { top: insets.top + 12 }]}>
      <Pressable
        onPress={() => {
          void markNotificationRead(bannerNotification.id);
          hideBanner(bannerNotification.id);

          if (bannerNotification.routeTarget) {
            router.push(bannerNotification.routeTarget as never);
          }
        }}
        style={[styles.banner, tone]}>
        <View style={styles.copy}>
          <Text style={styles.title}>{bannerNotification.title}</Text>
          <Text style={styles.body}>{bannerNotification.body}</Text>
          {bannerNotification.actionLabel ? <Text style={styles.action}>{bannerNotification.actionLabel}</Text> : null}
        </View>
        <Pressable
          onPress={() => {
            hideBanner(bannerNotification.id);
          }}
          style={styles.closeButton}>
          <Text style={styles.closeLabel}>×</Text>
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    left: 0,
    pointerEvents: 'box-none',
    position: 'absolute',
    right: 0,
    zIndex: 100,
  },
  banner: {
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    marginHorizontal: 14,
    minHeight: 72,
    paddingBottom: 14,
    paddingLeft: 16,
    paddingRight: 10,
    paddingTop: 14,
    shadowColor: '#010C4A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
  },
  high: {
    backgroundColor: palette.warningSoft,
    borderColor: palette.accent,
  },
  normal: {
    backgroundColor: palette.primarySoft,
    borderColor: palette.primary,
  },
  low: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
  },
  copy: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '800',
  },
  body: {
    color: palette.mutedText,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  action: {
    color: palette.primary,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 8,
  },
  closeButton: {
    alignItems: 'center',
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  closeLabel: {
    color: palette.mutedText,
    fontSize: 20,
    lineHeight: 20,
  },
});
