import React from 'react';
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
  };
  onIncrement?: (id: string) => void;
  onDecrement?: (id: string) => void;
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
};

export function InventoryItemCard({ item, onEdit, onDelete }: InventoryItemProps) {
  
  // --- CORES POR LOCALIZAÇÃO ---
  const getLocationColor = (loc?: string) => {
    switch(loc) {
      case 'fridge': return '#42A5F5'; // Azul (Geladeira)
      case 'freezer': return '#26C6DA'; // Ciano (Freezer)
      case 'pantry': 
      default: return '#FFB74D'; // Laranja Suave (Armário)
    }
  };

  const locationColor = getLocationColor(item.location);

  // --- LÓGICA DE VENCIMENTO (Badge Interno) ---
  const getExpiryStatus = (date?: Date | string | null) => {
    if (!date) return null;
    
    const expiry = new Date(date);
    expiry.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        const daysPast = Math.abs(diffDays);
        return { color: '#FF3B30', bg: '#FFEBEE', icon: 'alert-circle', label: daysPast === 1 ? 'Venceu ontem' : `Venceu há ${daysPast} d` };
    }
    if (diffDays === 0) return { color: '#D32F2F', bg: '#FFCDD2', icon: 'alarm', label: 'Vence hoje' };
    if (diffDays <= 3) return { color: '#FF9500', bg: '#FFF3E0', icon: 'warning', label: `Vence em ${diffDays} d` };

    // Futuro
    let label = '';
    if (diffDays < 30) label = `${diffDays} d`;
    else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        label = `${months} ${months === 1 ? 'mês' : 'meses'}`;
    } else {
        const years = Math.floor(diffDays / 365);
        label = `${years} ${years === 1 ? 'ano' : 'anos'}`;
    }

    return { color: '#34C759', bg: '#E8F5E9', icon: 'calendar-outline', label };
  };

  const status = getExpiryStatus(item.expiryDate);

  // --- LÓGICA DE QUANTIDADE ---
  const renderQuantityDisplay = () => {
    const qty = item.quantity;
    const pSize = item.packSize || 0;
    
    if (!pSize || pSize <= 0) {
      return (
        <View style={styles.quantityBadge}>
           <Text style={styles.qtyValue}>{qty}</Text>
           <Text style={styles.qtyUnit}>{item.unit}</Text>
        </View>
      );
    }

    const units = Math.floor(qty / pSize);
    const remainder = parseFloat((qty - (units * pSize)).toFixed(2));

    if (remainder === 0) {
       return (
        <View style={styles.quantityBadge}>
           <Text style={styles.qtyValue}>{units}</Text>
           <Text style={styles.qtyUnit}>UN</Text>
        </View>
       );
    }

    if (units === 0) {
       return (
        <View style={styles.quantityBadge}>
           <Text style={styles.qtyValue}>{remainder}</Text>
           <Text style={styles.qtyUnit}>{item.unit}</Text>
        </View>
       );
    }

    return (
      <View style={styles.quantityBadgeColumn}>
         <View style={{flexDirection:'row', alignItems:'baseline'}}>
            <Text style={styles.qtyValue}>{units}</Text>
            <Text style={styles.qtyUnit}> UN</Text>
         </View>
         <Text style={styles.qtyRemainder}>+ {remainder}{item.unit}</Text>
      </View>
    );
  };

  const renderRightActions = (_: any, dragX: any) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={() => onEdit(item)}>
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons name="pencil" size={24} color="#FFF" />
            <Text style={styles.actionText}>Editar</Text>
          </Animated.View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => onDelete(item.id)}>
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons name="trash" size={24} color="#FFF" />
            <Text style={styles.actionText}>Excluir</Text>
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions} containerStyle={styles.swipeContainer}>
      <View style={[styles.card, { borderLeftColor: locationColor }]}>
        
        {/* FOTO */}
        <View style={styles.iconBox}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.cardImage} />
          ) : (
            <Ionicons name="cube-outline" size={24} color="#007AFF" />
          )}
        </View>

        {/* INFO PRINCIPAL */}
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
          
          <View style={styles.metaColumn}>
            <Text style={styles.brandText}>
                {item.brand || "Genérico"}
            </Text>
            
            {/* BADGE DE VALIDADE (Pequeno) */}
            {status ? (
              <View style={[styles.expiryBadge, { backgroundColor: status.bg }]}>
                <Ionicons name={status.icon as any} size={10} color={status.color} style={{marginRight: 3}} />
                <Text style={[styles.expiryText, { color: status.color }]}>{status.label}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* QUANTIDADE */}
        {renderQuantityDisplay()}

      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 2,
    
    // --- BORDA ESQUERDA GROSSA ---
    borderLeftWidth: 6, // Define a espessura da cor do local
    // As outras bordas ficam fininhas
    borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1,
    borderColor: '#F2F2F7', 
  },
  iconBox: { 
    width: 50, height: 50, borderRadius: 14, 
    backgroundColor: '#F2F2F7', 
    justifyContent: 'center', alignItems: 'center', 
    marginRight: 12, overflow: 'hidden',
    marginLeft: 4 // Afasta um pouco da borda colorida
  },
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  
  content: { flex: 1, marginRight: 8, justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: '#1C1C1E', marginBottom: 4 },
  
  metaColumn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandText: { fontSize: 12, color: '#8E8E93', fontWeight: '500' },
  
  // Badge de Validade Compacto
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  expiryText: { fontSize: 10, fontWeight: '700' },

  // Badge de Quantidade
  quantityBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    minWidth: 55,
  },
  quantityBadgeColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    minWidth: 55,
  },
  qtyValue: { fontSize: 16, fontWeight: '800', color: '#1C1C1E' },
  qtyUnit: { fontSize: 9, color: '#8E8E93', fontWeight: '700', textTransform: 'uppercase' },
  qtyRemainder: { fontSize: 9, color: '#FF9500', fontWeight: '600', marginTop: -2 },

  // Actions
  actionsContainer: { flexDirection: 'row', width: 150, height: '100%' },
  actionBtn: { flex: 1, justifyContent: 'center', alignItems: 'center', height: '100%' },
  editBtn: { backgroundColor: '#FF9500' },
  deleteBtn: { backgroundColor: '#FF3B30' },
  actionText: { color: '#FFF', fontSize: 11, fontWeight: '700', marginTop: 4 },
});