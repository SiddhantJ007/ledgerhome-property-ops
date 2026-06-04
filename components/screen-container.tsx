import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import type { PropsWithChildren, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DashboardNotificationTray } from '@/components/dashboard-notification-tray';
import { palette } from '@/lib/theme';
import { useAccess } from '@/providers/access-provider';
import { useAuth } from '@/providers/auth-provider';
import { useNotifications } from '@/providers/notifications-provider';

type ScreenContainerProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  eyebrow?: string;
  headerAccessory?: ReactNode;
}>;

export function ScreenContainer({ title, subtitle, eyebrow, headerAccessory, children }: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useAuth();
  const { currentRole } = useAccess();
  const { notifications, markNotificationRead, dismissNotification } = useNotifications();
  const scrollRef = useRef<ScrollView | null>(null);
  const scrollOffsetRef = useRef(0);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuItems =
    currentRole === 'admin'
      ? [
          { label: 'Dashboard', href: '/(admin)/(tabs)' as Href },
          { label: 'Properties', href: '/(admin)/(tabs)/properties' as Href },
          { label: 'Tenants', href: '/tenants' as Href },
          { label: 'Units', href: '/units' as Href },
          { label: 'Payments', href: '/(admin)/(tabs)/payments' as Href },
          { label: 'Repairs', href: '/(admin)/(tabs)/maintenance' as Href },
          { label: 'More', href: '/(admin)/(tabs)/more' as Href },
        ]
      : currentRole === 'tenant'
        ? [
            { label: 'Dashboard', href: '/(tenant)/(tabs)' as Href },
            { label: 'Rent', href: '/(tenant)/(tabs)/ledger' as Href },
            { label: 'Repairs', href: '/(tenant)/(tabs)/maintenance' as Href },
            { label: 'Documents', href: '/(tenant)/(tabs)/lease' as Href },
            { label: 'Messages', href: '/(tenant)/contact-admin' as Href },
            { label: 'More', href: '/(tenant)/(tabs)/more' as Href },
          ]
        : [];
  const effectiveHeaderAccessory = headerAccessory ?? (
    <DashboardNotificationTray
      notifications={notifications.filter((item) => !item.dismissedAt)}
      onOpenNotification={(item) => {
        void markNotificationRead(item.id);
      }}
      onDismissNotification={(item) => {
        void dismissNotification(item.id);
      }}
    />
  );

  useEffect(() => {
    function scrollFocusedInputAboveKeyboard(keyboardTopY: number) {
      const focusedInput = TextInput.State.currentlyFocusedInput?.();

      if (!focusedInput || typeof focusedInput.measureInWindow !== 'function') {
        return;
      }

      focusedInput.measureInWindow((_x: number, y: number, _width: number, height: number) => {
        const bottomY = y + height;
        const visibleBottom = keyboardTopY - 18;

        if (bottomY <= visibleBottom) {
          return;
        }

        const nextOffset = scrollOffsetRef.current + (bottomY - visibleBottom);
        scrollRef.current?.scrollTo({ y: Math.max(0, nextOffset), animated: true });
      });
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      const windowHeight = Dimensions.get('window').height;
      const keyboardHeight = Math.max(0, windowHeight - event.endCoordinates.screenY);
      setKeyboardInset(keyboardHeight);
      scrollFocusedInputAboveKeyboard(event.endCoordinates.screenY);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Math.max(12, insets.top)}
        style={styles.keyboardShell}>
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: Math.max(32, insets.bottom + 20) + keyboardInset,
              paddingTop: Math.max(24, insets.top + 12),
            },
          ]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          onScroll={(event) => {
            scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
          }}
          ref={scrollRef}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}>
          {menuOpen ? (
            <Pressable
              accessibilityLabel="Close navigation menu"
              onPress={() => setMenuOpen(false)}
              style={styles.menuScrim}
            />
          ) : null}
          <View style={styles.headerRow}>
            <View style={styles.header}>
              <View style={styles.brandRow}>
                <Image source={require('../assets/images/brand-logo-source.png')} style={styles.logo} resizeMode="contain" />
                <View style={styles.headerCopy}>
                  {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
                  <Text style={styles.title}>{title}</Text>
                </View>
              </View>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <View style={styles.headerAccessoryRow}>
              {effectiveHeaderAccessory ? <View style={styles.headerAccessory}>{effectiveHeaderAccessory}</View> : null}
              {menuItems.length > 0 ? (
                <View style={styles.menuWrap}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Open navigation menu"
                    onPress={() => setMenuOpen((current) => !current)}
                    style={styles.iconButton}>
                    <MaterialCommunityIcons name="dots-vertical" size={21} color={palette.text} />
                  </Pressable>
                  {menuOpen ? (
                    <View style={styles.menuPanel}>
                      {menuItems.map((item) => (
                        <Pressable
                          accessibilityRole="button"
                          key={item.label}
                          onPress={() => {
                            setMenuOpen(false);
                            router.push(item.href);
                          }}
                          style={styles.menuItem}>
                          <Text style={styles.menuItemLabel}>{item.label}</Text>
                        </Pressable>
                      ))}
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          setMenuOpen(false);
                          void signOut();
                        }}
                        style={styles.menuItem}>
                        <Text style={styles.menuItemLabel}>Log out</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: palette.background,
    flex: 1,
  },
  keyboardShell: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    overflow: 'visible',
    padding: 20,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 20,
    overflow: 'visible',
    zIndex: 100,
  },
  header: {
    flex: 1,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  logo: {
    borderRadius: 10,
    height: 38,
    width: 30,
  },
  headerCopy: {
    flex: 1,
  },
  headerAccessory: {
    flexShrink: 0,
    marginTop: 4,
  },
  headerAccessoryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: palette.cardSurface,
    borderColor: palette.border,
    borderRadius: 20,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  menuWrap: {
    position: 'relative',
    zIndex: 200,
  },
  menuPanel: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 12,
    minWidth: 180,
    padding: 6,
    position: 'absolute',
    right: 0,
    top: 48,
    zIndex: 300,
  },
  menuScrim: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 50,
  },
  menuItem: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  menuItemLabel: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '700',
  },
  eyebrow: {
    color: palette.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  title: {
    color: palette.text,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    color: palette.mutedText,
    fontSize: 15,
    lineHeight: 22,
  },
});
