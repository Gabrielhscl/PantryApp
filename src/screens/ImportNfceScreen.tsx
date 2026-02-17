import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { NfceService, NfceItem } from '@/services/nfceService';
import { InventoryRepository } from '@/repositories/inventoryRepository';
import { useToast } from '@/contexts/ToastContext';

export default function ImportNfceScreen({ route, navigation }: any) {
  // A URL do QRCode que virá por parâmetro de navegação
  const { qrCodeUrl } = route.params; 
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NfceItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadReceipt();
  }, []);

  const loadReceipt = async () => {
    try {
      const data = await NfceService.fetchItemsFromQRUrl(qrCodeUrl);
      setItems(data);
      // Seleciona todos por padrão
      setSelectedItems(new Set(data.map(i => i.id)));
    } catch (e) {
      showToast("Erro ao ler nota fiscal", "error");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedItems(newSet);
  };

  const handleSaveAllToInventory = async () => {
    const itemsToSave = items.filter(i => selectedItems.has(i.id));
    if (itemsToSave.length === 0) return;

    try {
      for (const item of itemsToSave) {
        // Usa o repositório existente para guardar.
        // O app vai criar o produto se não existir, com o nome da nota.
        await InventoryRepository.createItem({
          name: item.originalName, // Futuramente: permitir trocar o nome aqui
          quantity: item.quantity,
          unit: item.unit.toLowerCase() === 'kg' ? 'kg' : 'un',
          location: 'pantry', 
          // Pode calcular a validade base +15 dias aqui
        });
      }
      showToast(`${itemsToSave.length} itens guardados no stock!`, "success");
      navigation.navigate('Estoque');
    } catch (e) {
      showToast("Erro ao guardar no stock", "error");
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: SPACING.md, color: COLORS.text.secondary }}>A extrair itens da SEFAZ...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader 
        title="Revisar Compra" 
        subtitle="Itens lidos da Nota Fiscal" 
        icon="close-outline"
        onIconPress={() => navigation.goBack()}
      />

      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={20} color={COLORS.primary} />
        <Text style={styles.infoText}>Desmarque o que não quiser guardar. Clique no nome para editar.</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: SPACING.md, paddingBottom: 100 }}
        renderItem={({ item }) => {
          const isSelected = selectedItems.has(item.id);
          return (
            <TouchableOpacity 
              style={[styles.card, !isSelected && styles.cardDisabled]}
              onPress={() => toggleSelection(item.id)}
            >
              <Ionicons 
                name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
                size={24} 
                color={isSelected ? COLORS.status.success : COLORS.border} 
                style={{ marginRight: SPACING.md }}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, !isSelected && { textDecorationLine: 'line-through', color: COLORS.text.secondary }]}>
                  {item.originalName}
                </Text>
                <Text style={styles.itemMeta}>Qtd: {item.quantity} {item.unit} • R$ {item.totalPrice.toFixed(2)}</Text>
              </View>
              {/* Botão para editar o item individualmente (Vincular com Catálogo) */}
              <TouchableOpacity style={styles.editBtn}>
                <Ionicons name="pencil" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            </TouchableOpacity>
          )
        }}
      />

      <View style={styles.footer}>
        <PrimaryButton 
          title={`Adicionar ${selectedItems.size} itens ao Stock`}
          onPress={handleSaveAllToInventory}
          disabled={selectedItems.size === 0}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  infoBanner: { flexDirection: 'row', backgroundColor: COLORS.locations.fridge.bg, padding: SPACING.md, margin: SPACING.md, borderRadius: RADIUS.md, alignItems: 'center', gap: 8 },
  infoText: { color: COLORS.primary, fontSize: 12, flex: 1 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, padding: SPACING.md, borderRadius: RADIUS.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  cardDisabled: { backgroundColor: '#F9F9F9', opacity: 0.7 },
  itemName: { fontSize: 14, fontWeight: 'bold', color: COLORS.text.primary },
  itemMeta: { fontSize: 12, color: COLORS.text.secondary, marginTop: 4 },
  editBtn: { padding: SPACING.sm, backgroundColor: COLORS.background, borderRadius: RADIUS.sm },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, backgroundColor: COLORS.card, borderTopWidth: 1, borderColor: COLORS.border }
});