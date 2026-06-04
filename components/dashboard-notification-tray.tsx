import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '@/lib/theme';
import type { Notification } from '@/types/domain';

type DashboardNotificationTrayProps = {
  notifications: Notification[];
  onActionPress?: (notification: Notification) => Promise<string | void> | string | void;
  onOpenNotification?: (notification: Notification) => void;
  onDismissNotification?: (notification: Notification) => void;
};

export function DashboardNotificationTray({
  notifications,
  onActionPress,
  onOpenNotification,
  onDismissNotification,
}: DashboardNotificationTrayProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [actionMessages, setActionMessages] = useState<Record<string, string>>({});

  const actionableNotifications = useMemo(
    () => notifications.filter((item) => !item.dismissedAt),
    [notifications]
  );

  return (
    <View style={styles.root}>
      <Pressable onPress={() => setIsOpen((current) => !current)} style={styles.iconButton}>
        <MaterialCommunityIcons name="bell-outline" size={22} color={palette.text} />
        {actionableNotifications.length > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>{actionableNotifications.length > 9 ? '9+' : actionableNotifications.length}</Text>
          </View>
        ) : null}
      </Pressable>

      {isOpen ? (
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Notifications</Text>
            <Pressable onPress={() => setIsOpen(false)}>
              <Text style={styles.closeLabel}>Close</Text>
            </Pressable>
          </View>

          {actionableNotifications.length > 0 ? (
            actionableNotifications.slice(0, 8).map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.copy}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.body}>{item.body}</Text>
                  <View style={styles.actionsRow}>
                    {item.actionLabel ? (
                      <Pressable
                        onPress={async () => {
                          if (onActionPress) {
                            const result = await onActionPress(item);

                            if (typeof result === 'string' && result) {
                              setActionMessages((current) => ({
                                ...current,
                                [item.id]: result,
                              }));
                              return;
                            }
                          }

                          if (item.routeTarget) {
                            onOpenNotification?.(item);
                            router.push(item.routeTarget as Href);
                          }
                        }}
                        style={styles.actionButton}>
                        <Text style={styles.actionLabel}>{item.actionLabel}</Text>
                      </Pressable>
                    ) : null}
                    {item.routeTarget ? (
                      <Pressable
                        onPress={() => {
                          onOpenNotification?.(item);
                          router.push(item.routeTarget as Href);
                        }}
                        style={styles.secondaryButton}>
                        <Text style={styles.secondaryLabel}>Open</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  {actionMessages[item.id] ? <Text style={styles.feedback}>{actionMessages[item.id]}</Text> : null}
                </View>
                <View style={styles.meta}>
                  <Pressable onPress={() => onDismissNotification?.(item)} style={styles.dismissButton}>
                    <Text style={styles.dismissLabel}>×</Text>
                  </Pressable>
                  <Text style={styles.priority}>{item.priority ?? 'normal'}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyLabel}>No pending notifications right now.</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'flex-end',
    minWidth: 70,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 20,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    position: 'relative',
    width: 42,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: palette.accent,
    borderRadius: 999,
    minWidth: 20,
    paddingHorizontal: 5,
    position: 'absolute',
    right: -5,
    top: -5,
  },
  badgeLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 18,
  },
  panel: {
    backgroundColor: palette.cardSurface,
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 10,
    maxWidth: 360,
    minWidth: 320,
    padding: 14,
    shadowColor: '#010C4A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  panelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  panelTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '800',
  },
  closeLabel: {
    color: palette.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  itemRow: {
    borderBottomColor: palette.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  copy: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '700',
  },
  body: {
    color: palette.mutedText,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  actionButton: {
    alignSelf: 'flex-start',
    backgroundColor: palette.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionLabel: {
    color: palette.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    backgroundColor: palette.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  secondaryLabel: {
    color: palette.text,
    fontSize: 12,
    fontWeight: '700',
  },
  feedback: {
    color: palette.primary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  emptyLabel: {
    color: palette.mutedText,
    fontSize: 13,
    lineHeight: 19,
    paddingVertical: 12,
  },
  priority: {
    color: palette.mutedText,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  meta: {
    alignItems: 'flex-end',
    gap: 8,
  },
  dismissButton: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  dismissLabel: {
    color: palette.mutedText,
    fontSize: 18,
    lineHeight: 18,
  },
});
