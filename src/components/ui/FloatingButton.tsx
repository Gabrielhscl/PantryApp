// src/components/ui/FloatingButton.tsx
import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>; // Adicionado suporte a estilo customizado
};

export function FloatingButton({ onPress, icon = 'add', style }: Props) {
  return (
    <TouchableOpacity 
      style={[styles.fab, style]} // Combina o estilo padrão com o enviado
      onPress={onPress} 
      activeOpacity={0.8}
    >
      <Ionicons name={icon} size={32} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 100,
  },
});