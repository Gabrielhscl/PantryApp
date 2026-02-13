import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';

type InventoryItemProps = {
  item: {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    image?: string | null;
    expiryDate?: Date | string | null;
    brand?: string;
    location?: string;
    packSize?: number;
    packUnit?: string;
    category?: string;
    allergens?: string; // As tags vêm aqui (ex: "Glúten, Leite")
  };
  onPress: (item: any) => void;
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
};

const BULK_CATEGORIES = ["Carnes", "Frutas", "Legumes", "Grãos", "Frios"];

export function InventoryItemCard({ item, onPress, onEdit, onDelete }: InventoryItemProps) {
  
  const getLocationColor = (loc?: string) => {
    switch(loc) {
      case 'fridge': return '#42A5F5';
      case 'freezer': return '#26C6DA';
      default: return '#FFB74D';
    }
  };

  const getExpiryStatus = (date?: Date | string | null) => {
    if (!date) return null;
    const expiry = new Date(date);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { color: '#FF3B30', bg: '#FFEBEE', label: 'Vencido' };
    if (diffDays <= 3) return { color: '#FF9500', bg: '#FFF3E0', label: `Vence em ${diffDays}d` };
    return null;
  };

  const status = getExpiryStatus(item.expiryDate);
  const tags = item.allergens ? item.allergens.split(',').filter(t => t.trim()) : [];

  const renderQuantity = () => {
    const isBulk = BULK_CATEGORIES.some(cat => item.category?.includes(cat));
    if (isBulk) {
        let q = item.quantity;
        let u = item.unit;
        if (u === 'g' && q >= 1000) { q /= 1000; u = 'kg'; }
        return <View style={styles.qtyBadge}><Text style={styles.qtyValue}>{q}</Text><Text style={styles.qtyUnit}>{u}</Text></View>;
    }
    const pSize = item.packSize || 0;
    if (pSize <= 0) return <View style={styles.qtyBadge}><Text style={styles.qtyValue}>{item.quantity}</Text><Text style={styles.qtyUnit}>{item.unit}</Text></View>;
    
    const units = Math.floor(item.quantity / pSize);
    const rem = parseFloat((item.quantity % pSize).toFixed(2));
    return (
        <View style={styles.qtyBadge}>
            <Text style={styles.qtyValue}>{units || rem}</Text>
            <Text style={styles.qtyUnit}>{units ? 'UN' : item.unit}</Text>
            {units > 0 && rem > 0 && <Text style={styles.qtySub}>+{rem}{item.unit}</Text>}
        </View>
    );
  };

  const renderRightActions = (_: any, dragX: any) => {
    const scale = dragX.interpolate({ inputRange: [-100, 0], outputRange: [1, 0], extrapolate: 'clamp' });
    return (
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#FF9500'}]} onPress={() => onEdit(item)}>
          <Animated.View style={{ transform: [{ scale }] }}><Ionicons name="pencil" size={20} color="#FFF" /></Animated.View>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#FF3B30'}]} onPress={() => onDelete(item.id)}>
          <Animated.View style={{ transform: [{ scale }] }}><Ionicons name="trash" size={20} color="#FFF" /></Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions} containerStyle={styles.swipe}>
      <TouchableOpacity activeOpacity={0.9} onPress={() => onPress(item)} style={[styles.card, { borderLeftColor: getLocationColor(item.location) }]}>
        <View style={styles.imageBox}>
          {item.image ? <Image source={{ uri: item.image }} style={styles.img} /> : <Ionicons name="cube-outline" size={24} color="#CCC" />}
        </View>

        <View style={styles.main}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.brand}>{item.brand || 'Genérico'}</Text>
          
          {/* --- NOVO: CONTAINER DE TAGS DE ALERTA --- */}
          {tags.length > 0 && (
            <View style={styles.tagsRow}>
              {tags.map((tag, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{tag.trim()}</Text>
                </View>
              ))}
            </View>
          )}

          {status && (
            <View style={[styles.expiry, { backgroundColor: status.bg }]}>
              <Text style={[styles.expiryText, { color: status.color }]}>{status.label}</Text>
            </View>
          )}
        </View>

        {renderQuantity()}
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  swipe: { marginBottom: 10, borderRadius: 16, overflow: 'hidden' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 16, borderLeftWidth: 5, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  imageBox: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  main: { flex: 1, justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: '#1C1C1E' },
  brand: { fontSize: 12, color: '#8E8E93', marginBottom: 4 },
  
  // Estilos das Tags
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2, marginBottom: 4 },
  tag: { backgroundColor: '#FF704320', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 0.5, borderColor: '#FF7043' },
  tagText: { fontSize: 9, color: '#FF7043', fontWeight: '800', textTransform: 'uppercase' },

  qtyBadge: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2F2F7', padding: 8, borderRadius: 12, minWidth: 55 },
  qtyValue: { fontSize: 15, fontWeight: '800', color: '#1C1C1E' },
  qtyUnit: { fontSize: 9, color: '#8E8E93', fontWeight: '700' },
  qtySub: { fontSize: 8, color: '#FF9500', fontWeight: '600' },
  expiry: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  expiryText: { fontSize: 10, fontWeight: '700' },
  actions: { flexDirection: 'row', width: 120 },
  actionBtn: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});