import React from 'react';
import { TouchableOpacity, Text, StyleSheet, TouchableOpacityProps, ViewStyle } from 'react-native';
import { COLORS, RADIUS } from '../../constants/theme'; // Usando o tema

interface PrimaryButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'danger' | 'dark';
  containerStyle?: ViewStyle;
}

export function PrimaryButton({ title, variant = 'primary', containerStyle, disabled, ...rest }: PrimaryButtonProps) {
  const getBackgroundColor = () => {
    if (disabled) return COLORS.border;
    switch (variant) {
      case 'danger': return COLORS.status.danger;
      case 'dark': return COLORS.text.primary; // Dark mode ready
      default: return COLORS.primary;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        disabled && styles.disabled,
        containerStyle
      ]}
      disabled={disabled}
      activeOpacity={0.8}
      {...rest}
    >
      <Text style={[styles.text, disabled && { color: COLORS.text.secondary }]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 18,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  text: {
    color: COLORS.text.light,
    fontWeight: 'bold',
    fontSize: 17,
  },
  disabled: {
    shadowOpacity: 0,
    elevation: 0,
  }
});