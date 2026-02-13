import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';

type Props = {
  item: any;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function ShoppingItemCard({ item, onToggle, onEdit, onDelete }: Props) {
  
  const renderRightActions = (_: any, dragX: any) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: '#FF9500' }]} 
          onPress={onEdit}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons name="pencil" size={22} color="#FFF" />
          </Animated.View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: '#FF3B30' }]} 
          onPress={onDelete}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons name="trash-outline" size={22} color="#FFF" />
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions} containerStyle={styles.swipeContainer}>
      <TouchableOpacity 
        activeOpacity={0.8} 
        style={styles.card} 
        onPress={onToggle}
      >
        <View style={[styles.checkbox, item.isChecked && styles.checked]}>
          {item.isChecked && <Ionicons name="checkmark" size={16} color="#FFF" />}
        </View>
        
        <View style={styles.info}>
          <Text style={[styles.name, item.isChecked && styles.textStrikethrough]}>
            {item.name}
          </Text>
          <Text style={styles.qty}>
            {item.quantity} {item.unit}
          </Text>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  swipeContainer: { marginBottom: 8, borderRadius: 16, overflow: 'hidden' },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", padding: 16, borderRadius: 16, shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 5, elevation: 2 },
  checkbox: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: "#007AFF", marginRight: 15, justifyContent: "center", alignItems: "center" },
  checked: { backgroundColor: "#34C759", borderColor: "#34C759" },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "600", color: "#1C1C1E" },
  qty: { fontSize: 13, color: "#8E8E93", marginTop: 2 },
  textStrikethrough: { textDecorationLine: "line-through", color: "#8E8E93" },
  actionsContainer: { flexDirection: 'row', width: 140 },
  actionBtn: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});