import { StyleSheet } from 'react-native';

export const palette = {
  background: '#FBF8EE',
  surface: '#FFFEFA',
  surfaceMuted: '#F8F1DD',
  cardSurface: '#FCF7EB',
  cardSurfaceStrong: '#F6EEDB',
  border: '#DCCB9A',
  text: '#010C4A',
  mutedText: '#5D6691',
  primary: '#005081',
  primarySoft: '#D9EAF4',
  accent: '#BF8B34',
  accentSoft: '#F3E1B8',
  secondaryAccent: '#966A29',
  danger: '#A33A3A',
  dangerSoft: '#F3DDDE',
  warning: '#BF8B34',
  warningSoft: '#F7E8C4',
  info: '#005081',
  infoSoft: '#DDEBF5',
  neutralSoft: '#EFE7CF',
  successSoft: '#D9EAF4',
  successText: '#005081',
};

export const commonStyles = StyleSheet.create({
  bodyText: {
    color: palette.text,
    fontSize: 15,
    lineHeight: 22,
  },
  helperText: {
    color: palette.mutedText,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  metricValue: {
    color: palette.text,
    fontSize: 24,
    fontWeight: '700',
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  buttonRow: {
    marginTop: 4,
  },
  errorText: {
    color: palette.danger,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  softPanel: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: 18,
    padding: 14,
  },
});
