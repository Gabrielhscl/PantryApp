import React, { useState, useCallback, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { TemplateRepository } from "@/repositories/templateRepository";
import { ShoppingRepository } from "@/repositories/shoppingRepository";
import { ProductRepository } from "@/repositories/productRepository";
import { useToast } from "@/contexts/ToastContext";

// UI e Tema
import { TemplateItemCard } from "@/components/TemplateItemCard";
import { Autocomplete } from "@/components/Autocomplete";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { CustomInput } from "@/components/ui/CustomInput";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { COLORS, SPACING, RADIUS } from "@/constants/theme";
import { Product } from "@/types";

export default function TemplateDetailScreen({ route, navigation }: any) {
  const { templateId, name } = route.params;
  const { showToast } = useToast();
  
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState("1");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
        const data = await TemplateRepository.getItemsWithStockStatus(templateId);
        setItems(data);
        const prodData = await ProductRepository.findAll();
        setCatalog(prodData);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [templateId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleAddItem = async () => {
    if (!query && !selectedProduct) return showToast("Selecione um produto.", "error");
    
    await TemplateRepository.addItemToTemplate(templateId, {
        productId: selectedProduct?.id || null,
        name: selectedProduct?.name || query,
        quantity: parseFloat(quantity),
        unit: selectedProduct?.defaultUnit || 'un',
        category: selectedProduct?.category || 'Outros'
    });
    showToast("Item adicionado à lista base.", "success");
    setModalVisible(false);
    setQuery(""); setSelectedProduct(null); setQuantity("1");
    loadData();
  };

  const handleGenerateList = async () => {
    const missingItems = items.filter(i => i.status !== 'ok');
    
    if (missingItems.length === 0) {
      return showToast("O seu stock já cobre todos os itens desta lista!", "success");
    }

    try {
        for (const item of missingItems) {
            const qtyNeeded = Math.max(item.targetQty - item.currentStock, item.targetQty); 
            await ShoppingRepository.addItem({
                productId: item.productId,
                name: item.name,
                quantity: qtyNeeded,
                unit: item.unit,
                category: item.category
            });
        }
        showToast(`${missingItems.length} itens enviados para o Carrinho!`, "success");
        navigation.navigate('Lista');
    } catch (e) {
        showToast("Erro ao gerar lista.", "error");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{name}</Text>
        <Text style={styles.subtitle}>{items.length} itens configurados</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <TemplateItemCard item={item} onDelete={() => { /* Opção para apagar item da lista fixa */ }} />
          )}
          ListEmptyComponent={<Text style={styles.empty}>Nenhum item configurado nesta lista.</Text>}
        />
      )}

      <View style={styles.fabContainer}>
          <TouchableOpacity style={styles.addFab} onPress={() => setModalVisible(true)}>
              <Ionicons name="add" size={30} color={COLORS.text.light} />
          </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <PrimaryButton 
            title="Gerar Lista de Compras" 
            onPress={handleGenerateList} 
            disabled={items.length === 0}
        />
      </View>

      <BottomSheetModal visible={modalVisible} onClose={() => setModalVisible(false)} title="Adicionar ao Modelo">
        <Text style={styles.label}>Produto</Text>
        <Autocomplete 
            placeholder="Procurar no catálogo..." 
            data={catalog}
            value={query} 
            onChangeText={setQuery}
            onSelect={(p: Product) => { setSelectedProduct(p); setQuery(p.name); }}
            closeOnSelect={false}
        />

        <CustomInput 
            label="Meta (Quantidade Ideal na despensa)" 
            value={quantity} 
            onChangeText={setQuantity} 
            keyboardType="numeric"
            style={{ marginTop: SPACING.md }}
        />

        <PrimaryButton title="Guardar na Lista" onPress={handleAddItem} containerStyle={{ marginTop: SPACING.md }} />
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: SPACING.lg, backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text.primary },
  subtitle: { fontSize: 14, color: COLORS.text.secondary, marginTop: 4 },
  empty: { textAlign: 'center', marginTop: 50, color: COLORS.text.secondary },
  
  footer: { position: 'absolute', bottom: 0, width: '100%', padding: SPACING.lg, backgroundColor: 'rgba(255,255,255,0.95)', borderTopWidth: 1, borderTopColor: COLORS.border },
  
  fabContainer: { position: 'absolute', bottom: 100, right: 20 },
  addFab: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.text.primary, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },

  label: { fontSize: 13, fontWeight: '700', color: COLORS.text.secondary, marginBottom: 8, textTransform: 'uppercase' },
});