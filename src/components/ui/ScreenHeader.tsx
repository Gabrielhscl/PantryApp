import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING } from '../../constants/theme';

interface Props {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onIconPress?: () => void;
  // --- NOVAS PROPRIEDADES ---
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
}

export function ScreenHeader({ 
  title, 
  subtitle, 
  icon, 
  onIconPress,
  rightIcon,
  onRightIconPress 
}: Props) {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        {icon && (
          <TouchableOpacity 
            style={styles.iconBtn} 
            onPress={onIconPress || (() => navigation.goBack())}
          >
            <Ionicons name={icon} size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
        )}
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>

      {/* --- NOVO: BOTÃO DA DIREITA --- */}
      {rightIcon && (
        <TouchableOpacity style={styles.iconBtn} onPress={onRightIconPress}>
          <Ionicons name={rightIcon} size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.background,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: COLORS.card,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text.primary,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
});