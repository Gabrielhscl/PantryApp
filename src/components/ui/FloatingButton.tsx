// src/components/ui/FloatingButton.tsx
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function FloatingButton({ onPress, icon = 'add' }: Props) {
  return (
    <TouchableOpacity style={styles.fab} onPress={onPress} activeOpacity={0.8}>
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
    borderRadius: 20, // Squircle (formato moderno iOS/Android 14)
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