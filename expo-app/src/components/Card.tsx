import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'glow' | 'transparent';
  style?: ViewStyle;
}

export function Card({ children, variant = 'default', style }: CardProps) {
  const variantStyles = {
    default: styles.default,
    glow: styles.glow,
    transparent: styles.transparent,
  };

  return (
    <View style={[styles.card, variantStyles[variant], style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
  },
  default: {
    backgroundColor: colors.dark[800],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  glow: {
    backgroundColor: colors.dark[800],
    borderWidth: 1,
    borderColor: colors.neon.cyan,
    shadowColor: colors.neon.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  transparent: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
});
