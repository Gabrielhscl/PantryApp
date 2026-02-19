import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
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
    allergens?: string;
  };
  onPress: (item: any) => void;
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
};

const BULK_CATEGORIES = ["Carnes", "Frutas", "Legumes", "Grãos", "Frios"];

export function InventoryItemCard({ item, onPress, onEdit, onDelete }: InventoryItemProps) {
  
  // Estado para controlar se mostra "UN" ou a medida base
  const [showAsUnit, setShowAsUnit] = useState(true);

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
    const pSize = item.packSize || 0;
    
    // Mostra a medida real
    if (isBulk || pSize <= 0 || !showAsUnit) {
        let q = item.quantity;
        let u = item.unit.toLowerCase();
        
        if (u === 'g' && q >= 1000) { q /= 1000; u = 'kg'; }
        if (u === 'ml' && q >= 1000) { q /= 1000; u = 'L'; }
        
        return (
          <TouchableOpacity 
             disabled={pSize <= 0 || isBulk} 
             onPress={() => setShowAsUnit(true)} 
             style={styles.qtyBadge} 
             activeOpacity={0.7}
          >
             <Text style={styles.qtyValue}>{Number.isInteger(q) ? q : q.toFixed(2)}</Text>
             <Text style={styles.qtyUnit}>{u}</Text>
          </TouchableOpacity>
        );
    }
    
    // Mostra em Unidades (UN)
    const units = Math.floor(item.quantity / pSize);
    const rem = parseFloat((item.quantity % pSize).toFixed(2));
    
    return (
        <TouchableOpacity 
            onPress={() => setShowAsUnit(false)} 
            style={[styles.qtyBadge, { backgroundColor: '#E3F2FD' }]} 
            activeOpacity={0.7}
        >
            <Text style={[styles.qtyValue, { color: '#1976D2' }]}>{units || rem}</Text>
            <Text style={[styles.qtyUnit, { color: '#1976D2' }]}>{units ? 'UN' : item.unit}</Text>
            {units > 0 && rem > 0 && <Text style={styles.qtySub}>+{rem}{item.unit}</Text>}
        </TouchableOpacity>
    );
  };

  const renderRightActions = (_: any, dragX: any) => {
    const scale = dragX.interpolate({ inputRange: [-100, 0], outputRange: [1, 0], extrapolate: 'clamp' });
    return (
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#FF9500'}]} onPress={() => onEdit(item)}>
          <Animated.View style={{ transform: [{ scale }] }}><Ionicons name="pencil" size={22} color="#FFF" /></Animated.View>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#FF3B30'}]} onPress={() => onDelete(item.id)}>
          <Animated.View style={{ transform: [{ scale }] }}><Ionicons name="trash" size={22} color="#FFF" /></Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions} containerStyle={styles.swipe}>
      <TouchableOpacity activeOpacity={0.9} onPress={() => onPress(item)} style={[styles.card, { borderLeftColor: getLocationColor(item.location) }]}>
        
        {/* CAIXA DE IMAGEM COM TAMANHO FIXO */}
        <View style={styles.imageBox}>
          {item.image ? <Image source={{ uri: item.image }} style={styles.img} /> : <Ionicons name="cube-outline" size={24} color="#CCC" />}
        </View>

        {/* CONTAINER PRINCIPAL DO TEXTO */}
        <View style={styles.main}>
          <View style={styles.textContainer}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.brand} numberOfLines={1}>{item.brand || 'Genérico'}</Text>
          </View>
          
          {/* CONTAINER HORIZONTAL DE TAGS E VALIDADE PARA POUPAR ESPAÇO */}
          {(tags.length > 0 || status) && (
            <View style={styles.badgesRow}>
              {status && (
                <View style={[styles.expiry, { backgroundColor: status.bg }]}>
                  <Text style={[styles.expiryText, { color: status.color }]} numberOfLines={1}>{status.label}</Text>
                </View>
              )}
              
              {tags.length > 0 && (
                <View style={styles.tagsRow}>
                  {/* Mostra apenas a primeira tag para não quebrar o layout fixo */}
                  <View style={styles.tag}>
                    <Text style={styles.tagText} numberOfLines={1}>{tags[0].trim()}</Text>
                  </View>
                  {/* Se houver mais, mostra um contador (ex: +2) */}
                  {tags.length > 1 && (
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>+{tags.length - 1}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </View>

        {/* CAIXA DE QUANTIDADE COM TAMANHO FIXO */}
        {renderQuantity()}

      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  swipe: { 
    marginBottom: 10, 
    borderRadius: 16, 
    overflow: 'hidden' 
  },
  card: { 
    height: 96, // <-- O SEGREDO ESTÁ AQUI: ALTURA RIGOROSAMENTE FIXA!
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    paddingHorizontal: 12, 
    borderRadius: 16, 
    borderLeftWidth: 5, 
    shadowColor: '#000', 
    shadowOpacity: 0.05, 
    shadowRadius: 5, 
    elevation: 2 
  },
  imageBox: { 
    width: 60,  // <-- TAMANHO FIXO E MAIOR PARA HARMONIZAR COM A CAIXA DA DIREITA
    height: 60, 
    borderRadius: 12, 
    backgroundColor: '#F2F2F7', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12, 
    overflow: 'hidden' 
  },
  img: { width: '100%', height: '100%' },
  
  main: { 
    flex: 1, 
    height: 64, // Altura interna controlada
    justifyContent: 'center', // Centraliza automaticamente se não tiver validade/tags
    paddingRight: 10 
  },
  textContainer: { justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: '#1C1C1E' },
  brand: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  
  badgesRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 6,
    gap: 6 
  },
  tagsRow: { flexDirection: 'row', gap: 4 },
  tag: { backgroundColor: '#FF704320', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 0.5, borderColor: '#FF7043', maxWidth: 70 },
  tagText: { fontSize: 9, color: '#FF7043', fontWeight: '800', textTransform: 'uppercase' },

  qtyBadge: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#F2F2F7', 
    borderRadius: 12, 
    width: 65,  // <-- TAMANHO FIXO
    height: 60, // <-- TAMANHO FIXO COMBINANDO COM A IMAGEM
    paddingHorizontal: 2 
  },
  qtyValue: { fontSize: 16, fontWeight: '800', color: '#1C1C1E' },
  qtyUnit: { fontSize: 10, color: '#8E8E93', fontWeight: '700', marginTop: -2 },
  qtySub: { fontSize: 9, color: '#FF9500', fontWeight: '800', marginTop: 2 },
  
  expiry: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  expiryText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  
  actions: { flexDirection: 'row', width: 140, height: '100%' },
  actionBtn: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});