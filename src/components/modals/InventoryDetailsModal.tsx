import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  onClose: () => void;
  item: any;
};

const BULK_CATEGORIES = ["Carnes", "Frutas", "Legumes", "Grãos", "Frios"];

export function InventoryDetailsModal({ visible, onClose, item }: Props) {
  if (!item) return null;

  // --- HELPERS ---
  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return "--/--/--";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const getDaysLeft = (date?: string | Date) => {
    if (!date) return "";
    const diff = Math.ceil((new Date(date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    if (diff < 0) return `Venceu há ${Math.abs(diff)} dias`;
    if (diff === 0) return "Vence hoje!";
    return `Faltam ${diff} dias`;
  };

  // --- LÓGICA DE QUANTIDADE ---
  const renderQuantity = () => {
    const qty = item.quantity;
    const pSize = item.packSize || 0;
    const isBulk = BULK_CATEGORIES.some((cat: string) => item.category?.includes(cat));

    if (isBulk) {
        let displayQty = qty;
        let displayUnit = item.unit;
        if (item.unit === 'g' && qty >= 1000) { displayQty = parseFloat((qty / 1000).toFixed(2)); displayUnit = 'kg'; }
        else if (item.unit === 'ml' && qty >= 1000) { displayQty = parseFloat((qty / 1000).toFixed(2)); displayUnit = 'L'; }
        return <Text style={styles.bigQty}>{displayQty}<Text style={styles.smallUnit}>{displayUnit}</Text></Text>;
    }

    if (!pSize || pSize <= 0) {
        return <Text style={styles.bigQty}>{qty}<Text style={styles.smallUnit}>{item.unit}</Text></Text>;
    }

    const units = Math.floor(qty / pSize);
    const remainder = parseFloat((qty - (units * pSize)).toFixed(2));

    if (remainder === 0) return <Text style={styles.bigQty}>{units}<Text style={styles.smallUnit}> UN</Text></Text>;
    if (units === 0) return <Text style={styles.bigQty}>{remainder}<Text style={styles.smallUnit}>{item.unit}</Text></Text>;

    return (
        <View style={{alignItems: 'center'}}>
            <Text style={styles.bigQty}>{units}<Text style={styles.smallUnit}> UN</Text></Text>
            <Text style={styles.subQty}>+ {remainder} {item.unit} (aberto)</Text>
        </View>
    );
  };

  const locInfo = (() => {
      switch(item.location) {
          case 'fridge': return { label: 'Geladeira', icon: 'thermometer', color: '#42A5F5', bg: '#E3F2FD' };
          case 'freezer': return { label: 'Freezer', icon: 'snow', color: '#26C6DA', bg: '#E0F7FA' };
          default: return { label: 'Armário', icon: 'cube', color: '#FFB74D', bg: '#FFF3E0' };
      }
  })();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />
        
        <View style={styles.content}>
          
          {/* HEADER HEADER */}
          <View style={styles.header}>
             <View style={styles.imageContainer}>
                {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.image} />
                ) : (
                    <Ionicons name="cube-outline" size={32} color="#007AFF" />
                )}
             </View>
             <View style={{flex: 1}}>
                 <Text style={styles.categoryLabel}>{item.category || "Geral"}</Text>
                 <Text style={styles.title} numberOfLines={2}>{item.name}</Text>
                 <Text style={styles.brand}>{item.brand || "Marca genérica"}</Text>
             </View>
             <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                 <Ionicons name="close" size={20} color="#555" />
             </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 30}}>
            
            {/* CARTÃO DE STATUS PRINCIPAL */}
            <View style={styles.statusRow}>
                {/* Quantidade */}
                <View style={[styles.statusCard, {flex: 1.5}]}>
                    <Text style={styles.label}>Estoque Atual</Text>
                    {renderQuantity()}
                </View>
                
                {/* Local */}
                <View style={[styles.statusCard, {flex: 1, backgroundColor: locInfo.bg}]}>
                    <Ionicons name={locInfo.icon as any} size={24} color={locInfo.color} style={{marginBottom: 5}}/>
                    <Text style={[styles.locText, {color: locInfo.color}]}>{locInfo.label}</Text>
                </View>
            </View>

            {/* DATAS (COMPRA E VALIDADE) */}
            <View style={styles.datesContainer}>
                <View style={styles.dateRow}>
                    <View style={[styles.iconCircle, {backgroundColor: '#E8F5E9'}]}>
                        <Ionicons name="cart-outline" size={20} color="#2E7D32" />
                    </View>
                    <View style={{flex: 1}}>
                        <Text style={styles.dateLabel}>Data da Compra</Text>
                        <Text style={styles.dateValue}>{formatDate(item.createdAt)}</Text>
                    </View>
                </View>
                
                <View style={styles.divider} />

                <View style={styles.dateRow}>
                    <View style={[styles.iconCircle, {backgroundColor: '#FFEBEE'}]}>
                        <Ionicons name="calendar-outline" size={20} color="#C62828" />
                    </View>
                    <View style={{flex: 1}}>
                        <Text style={styles.dateLabel}>Vencimento</Text>
                        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                            <Text style={styles.dateValue}>{formatDate(item.expiryDate)}</Text>
                            <View style={styles.daysLeftBadge}>
                                <Text style={styles.daysLeftText}>{getDaysLeft(item.expiryDate)}</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </View>

            {/* NUTRIÇÃO */}
            <Text style={styles.sectionTitle}>Tabela Nutricional (100g)</Text>
            <View style={styles.nutritionGrid}>
                <NutriItem label="Kcal" value={item.calories} />
                <NutriItem label="Carbo" value={item.carbs} unit="g" />
                <NutriItem label="Prot." value={item.protein} unit="g" />
                <NutriItem label="Gord." value={item.fat} unit="g" />
                <NutriItem label="Fibras" value={item.fiber} unit="g" />
                <NutriItem label="Sódio" value={item.sodium} unit="mg" />
            </View>

            {/* ETIQUETAS */}
            {item.allergens ? (
                <View style={{marginTop: 20}}>
                    <Text style={styles.sectionTitle}>Alertas</Text>
                    <View style={styles.tagsContainer}>
                        {item.allergens.split(',').map((tag: string, index: number) => (
                            <View key={index} style={styles.tagBadge}>
                                <Text style={styles.tagText}>{tag.trim()}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            ) : null}

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const NutriItem = ({ label, value, unit="" }: {label:string, value:any, unit?:string}) => (
    <View style={styles.nutriItem}>
        <Text style={styles.nutriValue}>{value || "-"}<Text style={styles.nutriUnit}>{unit}</Text></Text>
        <Text style={styles.nutriLabel}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  backdrop: { flex: 1 },
  content: { backgroundColor: '#F8F9FA', borderTopLeftRadius: 30, borderTopRightRadius: 30, height: '85%', padding: 24, paddingBottom: 0 },
  
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  imageContainer: { width: 64, height: 64, borderRadius: 18, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  image: { width: '100%', height: '100%', borderRadius: 18 },
  categoryLabel: { fontSize: 12, fontWeight: '700', color: '#007AFF', textTransform: 'uppercase', marginBottom: 2 },
  title: { fontSize: 22, fontWeight: '800', color: '#1C1C1E', lineHeight: 26 },
  brand: { fontSize: 14, color: '#8E8E93', marginTop: 2, fontWeight: '500' },
  closeBtn: { padding: 8, backgroundColor: '#E5E5EA', borderRadius: 50 },

  statusRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statusCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8 },
  label: { fontSize: 11, fontWeight: '700', color: '#8E8E93', textTransform: 'uppercase', marginBottom: 6 },
  bigQty: { fontSize: 28, fontWeight: '800', color: '#1C1C1E' },
  smallUnit: { fontSize: 14, fontWeight: '600', color: '#8E8E93' },
  subQty: { fontSize: 12, color: '#FF9500', fontWeight: '700', marginTop: -2 },
  locText: { fontSize: 14, fontWeight: '700' },

  datesContainer: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  dateLabel: { fontSize: 12, color: '#8E8E93', fontWeight: '600', marginBottom: 2 },
  dateValue: { fontSize: 16, fontWeight: '700', color: '#1C1C1E' },
  divider: { height: 1, backgroundColor: '#F2F2F7', marginVertical: 12, marginLeft: 52 },
  daysLeftBadge: { backgroundColor: '#FFEBEE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  daysLeftText: { fontSize: 11, color: '#D32F2F', fontWeight: '700' },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1C1C1E', marginBottom: 12 },
  nutritionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  nutriItem: { width: '30%', backgroundColor: '#FFF', paddingVertical: 12, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 4 },
  nutriValue: { fontSize: 16, fontWeight: '800', color: '#1C1C1E' },
  nutriUnit: { fontSize: 10, color: '#8E8E93', fontWeight: '600' },
  nutriLabel: { fontSize: 11, color: '#8E8E93', marginTop: 2, fontWeight: '600' },

  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagBadge: { backgroundColor: '#FFF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#E5E5EA' },
  tagText: { color: '#555', fontWeight: '700', fontSize: 12 },
});