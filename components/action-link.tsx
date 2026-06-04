import { Link, type Href } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { palette } from '@/lib/theme';

type ActionLinkProps = {
  href: Href;
  label: string;
  variant?: 'default' | 'primary';
};

export function ActionLink({ href, label, variant = 'default' }: ActionLinkProps) {
  return (
    <Link href={href} style={[styles.link, variant === 'primary' && styles.primaryLink]}>
      <Text style={[styles.label, variant === 'primary' && styles.primaryLabel]}>{label}</Text>
    </Link>
  );
}

const styles = StyleSheet.create({
  link: {
    borderColor: palette.border,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryLink: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  label: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '600',
  },
  primaryLabel: {
    color: '#FFFFFF',
  },
});
