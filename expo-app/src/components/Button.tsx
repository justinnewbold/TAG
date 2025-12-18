import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../theme/colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
}: ButtonProps) {
  const sizeStyles = {
    small: { paddingVertical: 8, paddingHorizontal: 16 },
    medium: { paddingVertical: 14, paddingHorizontal: 24 },
    large: { paddingVertical: 18, paddingHorizontal: 32 },
  };

  const textSizes = {
    small: 14,
    medium: 16,
    large: 18,
  };

  const isDisabled = disabled || loading;

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        style={[styles.button, style]}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={isDisabled ? ['#666', '#444'] : (gradients.primary as [string, string])}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, sizeStyles[size], styles.rounded]}
        >
          {loading ? (
            <ActivityIndicator color={colors.text.primary} />
          ) : (
            <>
              {icon}
              <Text style={[styles.text, { fontSize: textSizes[size] }, textStyle]}>
                {title}
              </Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const variantStyles = {
    secondary: styles.secondary,
    danger: styles.danger,
    ghost: styles.ghost,
  };

  const variantTextStyles = {
    secondary: styles.secondaryText,
    danger: styles.dangerText,
    ghost: styles.ghostText,
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.button,
        variantStyles[variant],
        sizeStyles[size],
        styles.rounded,
        isDisabled && styles.disabled,
        style,
      ]}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={colors.text.primary} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              variantTextStyles[variant],
              { fontSize: textSizes[size] },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  rounded: {
    borderRadius: 12,
  },
  text: {
    color: colors.text.primary,
    fontWeight: '700',
  },
  secondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  secondaryText: {
    color: colors.text.primary,
  },
  danger: {
    backgroundColor: colors.error,
  },
  dangerText: {
    color: colors.text.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: colors.neon.cyan,
  },
  disabled: {
    opacity: 0.5,
  },
});
