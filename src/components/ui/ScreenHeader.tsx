import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/theme';

type Props = {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap; 
  onIconPress?: () => void;
  iconColor?: string;
};

export function ScreenHeader({ title, subtitle, icon, onIconPress, iconColor }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.title}>{title}</Text>
        
        {/* SECÇÃO DIREITA: APENAS O ÍCONE (Se existir) */}
        {icon && (
          <View style={styles.rightControls}>
            <TouchableOpacity 
              onPress={onIconPress}
              activeOpacity={0.4}
              style={styles.iconButton}
            >
              <Ionicons 
                name={icon} 
                size={22} 
                color={iconColor || COLORS.text.primary} 
              />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* SUBTÍTULO ABAIXO DO TÍTULO */}
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
    backgroundColor: 'transparent',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', 
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '600', // Um negrito mais suave e elegante (Minimalista)
    color: COLORS.text.primary,
    letterSpacing: -0.5,
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 4, // Removemos o fundo, bordas e sombras. Apenas o ícone limpo!
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.text.secondary,
  },
});