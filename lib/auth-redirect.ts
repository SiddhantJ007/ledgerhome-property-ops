import { Platform } from 'react-native';

const APP_SCHEME = 'ledgerhome';
const configuredPublicAppUrl = process.env.EXPO_PUBLIC_APP_URL?.trim().replace(/\/+$/, '') ?? '';

function buildSchemeUrl(pathname: string) {
  const cleanPath = pathname.startsWith('/') ? pathname.slice(1) : pathname;
  return `${APP_SCHEME}://${cleanPath}`;
}

function buildWebUrl(pathname: string) {
  const cleanPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return configuredPublicAppUrl ? `${configuredPublicAppUrl}${cleanPath}` : buildSchemeUrl(cleanPath);
}

export function getAuthRedirectUrl(pathname: string) {
  if (Platform.OS === 'web') {
    return buildWebUrl(pathname);
  }

  return buildSchemeUrl(pathname);
}

export function getPasswordResetRedirectUrl() {
  return getAuthRedirectUrl('/auth/reset-password');
}

export function getInviteRedirectUrl() {
  return getAuthRedirectUrl('/auth/reset-password');
}
