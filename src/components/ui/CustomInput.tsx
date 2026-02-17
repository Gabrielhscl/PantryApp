import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

interface CustomInputProps extends TextInputProps {
  label?: string;
}

export function CustomInput({ label, style, ...rest }: CustomInputProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput 
        style={[styles.input, style]} 
        placeholderTextColor={COLORS.text.secondary}
        {...rest} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.md },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.input,
    padding: 16,
    borderRadius: RADIUS.lg,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.primary,
  }
});