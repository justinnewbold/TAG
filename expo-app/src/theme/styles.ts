import { StyleSheet } from 'react-native';
import { colors } from './colors';

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark[900],
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.dark[900],
  },
  screenPadding: {
    padding: 24,
  },
  card: {
    backgroundColor: colors.dark[800],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: 16,
  },
  cardGlow: {
    backgroundColor: colors.dark[800],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neon.cyan,
    padding: 16,
    shadowColor: colors.neon.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const typography = StyleSheet.create({
  h1: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.text.primary,
    letterSpacing: 1,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
  },
  body: {
    fontSize: 16,
    color: colors.text.primary,
  },
  bodySmall: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  caption: {
    fontSize: 12,
    color: colors.text.muted,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
