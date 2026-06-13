import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  ImageBackground,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AuthShellProps = PropsWithChildren<{
  eyebrow?: string;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onActionPress?: () => void;
  footer?: string;
}>;

const authBackground =
  'https://images.unsplash.com/photo-1570129477492-45c003edd2be?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

export function AuthShell({
  children,
  eyebrow = 'LedgerHome',
  title,
  subtitle,
  actionLabel,
  onActionPress,
  footer,
}: AuthShellProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isCompact = width < 430 || height < 820;
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <ImageBackground source={{ uri: authBackground }} style={styles.background}>
      <StatusBar backgroundColor="transparent" style="light" translucent />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        style={styles.keyboardRoot}>
        <View
          style={[
            styles.overlay,
            {
              paddingBottom: Math.max(20, insets.bottom + 16),
              paddingTop: Math.max(18, insets.top + 10),
            },
          ]}>
          <ScrollView
            bounces={false}
            contentContainerStyle={[
              styles.scrollContent,
              isCompact && styles.scrollContentCompact,
              keyboardVisible && styles.scrollContentKeyboard,
            ]}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.navbar}>
              <View />
              {actionLabel && onActionPress ? (
                <Pressable onPress={onActionPress} style={styles.navAction}>
                  <Text style={styles.navActionLabel}>{actionLabel}</Text>
                </Pressable>
              ) : null}
            </View>

            <View
              style={[
                styles.content,
                isCompact && styles.contentCompact,
                keyboardVisible && styles.contentKeyboard,
              ]}>
              <View style={[styles.heroColumn, isCompact && styles.heroColumnCompact]}>
                <View style={styles.brandLockup}>
                  <Image
                    source={require('../assets/images/brand-logo-source.png')}
                    style={[styles.heroLogo, isCompact && styles.heroLogoCompact]}
                    resizeMode="contain"
                  />
                  <Text style={[styles.brandName, isCompact && styles.brandNameCompact]}>LedgerHome</Text>
                </View>
                <Text style={styles.eyebrow}>{eyebrow}</Text>
                <Text style={[styles.title, isCompact && styles.titleCompact]}>{title}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
                {footer ? <Text style={styles.footer}>{footer}</Text> : null}
              </View>

              <View style={[styles.card, isCompact && styles.cardCompact]}>{children}</View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  keyboardRoot: {
    flex: 1,
  },
  overlay: {
    backgroundColor: 'rgba(1, 12, 74, 0.18)',
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    flexGrow: 1,
  },
  scrollContentCompact: {
    paddingBottom: 8,
  },
  scrollContentKeyboard: {
    paddingBottom: 32,
  },
  navbar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  navAction: {
    backgroundColor: 'rgba(255,251,239,0.82)',
    borderColor: 'rgba(191,139,52,0.24)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  navActionLabel: {
    color: '#010C4A',
    fontSize: 13,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    gap: 18,
    justifyContent: 'space-between',
  },
  contentCompact: {
    gap: 16,
  },
  contentKeyboard: {
    gap: 16,
    justifyContent: 'flex-start',
  },
  heroColumn: {
    backgroundColor: 'rgba(255, 251, 239, 0.86)',
    borderColor: 'rgba(191,139,52,0.22)',
    borderRadius: 28,
    borderWidth: 1,
    maxWidth: 560,
    padding: 24,
    paddingTop: 24,
    shadowColor: '#010C4A',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
  },
  heroColumnCompact: {
    borderRadius: 24,
    padding: 18,
  },
  brandLockup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  heroLogo: {
    aspectRatio: 345 / 446,
    height: 76,
    width: 72,
  },
  heroLogoCompact: {
    height: 68,
    width: 56,
  },
  brandName: {
    color: '#010C4A',
    fontSize: 32,
    fontWeight: '800',
  },
  brandNameCompact: {
    fontSize: 26,
  },
  eyebrow: {
    color: '#966A29',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  title: {
    color: '#010C4A',
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
    maxWidth: 480,
  },
  titleCompact: {
    fontSize: 26,
    lineHeight: 32,
  },
  subtitle: {
    color: '#46507E',
    fontSize: 15,
    lineHeight: 23,
    marginTop: 12,
    maxWidth: 460,
  },
  footer: {
    color: '#7D6129',
    fontSize: 12,
    lineHeight: 19,
    marginTop: 12,
    maxWidth: 420,
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,254,250,0.97)',
    borderColor: 'rgba(191,139,52,0.18)',
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#010C4A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
  },
  cardCompact: {
    borderRadius: 24,
    padding: 16,
  },
});
