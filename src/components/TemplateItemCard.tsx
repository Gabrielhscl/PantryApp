import React from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';

export function TemplateItemCard({ item, onDelete }: any) {
  const statusColors = {
    ok: { bg: '#E8F5E9', text: '#2E7D32', label: 'Em dia' },
    low: { bg: '#FFF3E0', text: '#EF6C00', label: 'Acabando' },
    missing: { bg: '#FFEBEE', text: '#C62828', label: 'Em falta' }
  };

  const currentStatus = statusColors[item.status as keyof typeof statusColors];

  const renderRightActions = (_: any, dragX: any) => {
    const scale = dragX.interpolate({ inputRange: [-80, 0], outputRange: [1, 0], extrapolate: 'clamp' });
    return (
      <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="trash-outline" size={24} color="#FFF" />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions} containerStyle={styles.container}>
      <View style={styles.card}>
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.subtitle}>Meta: {item.targetQty}{item.unit} • Estoque: {item.currentStock}{item.unit}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: currentStatus.bg }]}>
          <Text style={[styles.statusText, { color: currentStatus.text }]}>{currentStatus.label}</Text>
        </View>
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 10, borderRadius: 16, overflow: 'hidden' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 16 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#1C1C1E' },
  subtitle: { fontSize: 12, color: '#8E8E93', marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  deleteBtn: { backgroundColor: '#FF3B30', width: 80, justifyContent: 'center', alignItems: 'center' }
});