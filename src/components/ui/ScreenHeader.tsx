// src/components/ui/ScreenHeader.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  subtitle: string;
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onIconPress?: () => void;
};

export function ScreenHeader({ subtitle, title, icon = 'person-circle-outline', onIconPress }: Props) {
  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      <TouchableOpacity onPress={onIconPress} style={styles.iconBtn}>
        <Ionicons name={icon} size={32} color="#007AFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  subtitle: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1C1C1E',
    marginTop: 4,
  },
  iconBtn: {
    padding: 4,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
  }
});