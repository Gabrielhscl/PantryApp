import React, { useState, useCallback, useEffect } from "react";
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera"; 
import { useFocusEffect } from "@react-navigation/native";

import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { FloatingButton } from "@/components/ui/FloatingButton";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { CustomInput } from "@/components/ui/CustomInput";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Autocomplete } from "@/components/Autocomplete";
import { ShoppingItemCard } from "@/components/ShoppingItemCard";
import { AlertModal } from "@/components/modals/AlertModal";

import { ShoppingRepository } from "@/repositories/shoppingRepository";
import { ProductRepository } from "@/repositories/productRepository";
import { InventoryRepository } from "@/repositories/inventoryRepository";
import { ProductService } from "@/services/productService";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useToast } from "@/contexts/ToastContext";
import { COLORS, SPACING, RADIUS } from "@/constants/theme";
import { Product } from "@/types";

export default function ShoppingListScreen({ navigation }: any) {
  const { items, refresh, toggleItem, removeItem } = useShoppingList();
  const { showToast } = useToast();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: "", message: "", id: "", name: "" });

  const [catalog, setCatalog] = useState<Product[]>([]);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [inputMode, setInputMode] = useState<'pack' | 'measure'>('pack');

  useFocusEffect(useCallback(() => { 
    refresh();
    loadCatalog();
  }, [refresh]));

  const loadCatalog = async () => {
    try {
      const products = await ProductRepository.findAll();
      setCatalog(products);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (selectedProduct && selectedProduct.packSize && selectedProduct.packSize > 0) {
      setInputMode('pack');
    } else {
      setInputMode('pack');
    }
  }, [selectedProduct]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setIsScanning(false);
    let product = await ProductRepository.findByBarcode(data);
    
    if (!product) {
      try {
        const info = await ProductService.fetchProductByBarcode(data);
        if (info.found && info.name) {
          const newId = await ProductRepository.createProduct({
            barcode: data, name: info.name, brand: info.brand, image: info.image,
            category: "Outros", defaultLocation: "pantry", defaultUnit: info.packUnit || "un",
            packSize: info.packSize, packUnit: info.packUnit, allergens: info.allergens
          });
          const all = await ProductRepository.findAll();
          product = all.find(p => p.id === newId);
          setCatalog(all);
          showToast("Produto adicionado ao catálogo!", "success");
        } else {
          return showToast("Produto não encontrado. Registe-o primeiro.", "error");
        }
      } catch (e) { return showToast("Falha na leitura do código.", "error"); }
    }
    
    if (product) {
      selectProduct(product);
      setModalVisible(true);
    }
  };

  const selectProduct = (product: Product) => {
    setSelectedProduct(product);
    setQuery(product.name);
  };

  const handleSave = async () => {
    if (!query.trim() && !selectedProduct) {
        showToast("Selecione um produto ou digite um nome", "error");
        return;
    }

    const qtyInput = parseFloat(quantity) || 0;
    let finalQuantity = qtyInput;
    let finalUnit = selectedProduct?.defaultUnit || 'un';

    if (inputMode === 'pack') {
      if (selectedProduct?.packSize && selectedProduct.packSize > 0) {
        finalQuantity = qtyInput * selectedProduct.packSize;
        finalUnit = selectedProduct.packUnit || selectedProduct.defaultUnit;
      } else {
        finalQuantity = qtyInput;
        finalUnit = 'un';
      }
    } else {
      finalQuantity = qtyInput;
      finalUnit = selectedProduct?.defaultUnit || 'un';
    }

    const data = {
      productId: selectedProduct?.id || null,
      name: selectedProduct?.name || query,
      quantity: finalQuantity,
      unit: finalUnit,
      category: selectedProduct?.category || 'Outros'
    };

    try {
      if (editingItemId) {
        await ShoppingRepository.updateItem(editingItemId, data);
        showToast("Item atualizado com sucesso!", "success");
      } else {
        await ShoppingRepository.addItem(data);
        showToast("Item adicionado à lista!", "success");
      }
      closeModal();
      refresh();
    } catch (e) { showToast("Erro ao guardar item", "error"); }
  };

  const handleEdit = (item: any) => {
    setEditingItemId(item.id);
    setQuery(item.name);
    
    const originalProduct = catalog.find(p => p.id === item.productId);
    
    if (originalProduct) {
        setSelectedProduct(originalProduct);
        setInputMode('measure'); 
        setQuantity(String(item.quantity));
    } else {
        setSelectedProduct(null);
        setQuantity(String(item.quantity));
    }
    
    setModalVisible(true);
  };

  const handleFinishShopping = async () => {
    const checkedItems = items.filter(i => i.isChecked);
    if (checkedItems.length === 0) return showToast("Marque os itens comprados antes de finalizar.", "warning");

    Alert.alert(
      "Finalizar Compras", 
      `Mover ${checkedItems.length} itens para o stock?`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Confirmar", onPress: async () => {
            for (const item of checkedItems) {
              const prod = catalog.find(p => p.id === item.productId);
              const loc = prod?.defaultLocation || 'pantry';

              await InventoryRepository.createItem({
                productId: item.productId,
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                location: loc,
                expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) 
              });
              await ShoppingRepository.deleteItem(item.id);
            }
            refresh();
            showToast("Stock atualizado com sucesso!", "success");
        }}
      ]
    );
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingItemId(null); setQuery(""); setSelectedProduct(null); setQuantity("1");
  };

  const grouped = items.reduce((acc: any, item: any) => {
    const cat = item.category || "Outros";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const getLocationInfo = (loc: string) => {
    switch (loc) {
      case 'fridge': return COLORS.locations.fridge;
      case 'freezer': return COLORS.locations.freezer;
      default: return COLORS.locations.pantry;
    }
  };

  const getLocationLabel = (loc: string) => {
    switch (loc) {
      case 'fridge': return 'Geladeira';
      case 'freezer': return 'Freezer';
      default: return 'Armário';
    }
  };

  const getCalculationPreview = () => {
    if (!selectedProduct || !quantity) return null;
    const qty = parseFloat(quantity) || 0;

    if (inputMode === 'pack') {
      if (selectedProduct.packSize && selectedProduct.packSize > 0) {
        const total = qty * selectedProduct.packSize;
        const unit = selectedProduct.packUnit || selectedProduct.defaultUnit;
        
        let displayTotal = total;
        let displayUnit = unit;
        if (unit === 'g' && total >= 1000) { displayTotal = total / 1000; displayUnit = 'kg'; }
        if (unit === 'ml' && total >= 1000) { displayTotal = total / 1000; displayUnit = 'L'; }

        return (
          <View style={styles.calcPreview}>
            <Text style={styles.calcLabel}>Total Calculado:</Text>
            <Text style={styles.calcValue}>{displayTotal}{displayUnit}</Text>
            <Text style={styles.calcSub}>({qty}x {selectedProduct.packSize}{selectedProduct.packUnit})</Text>
          </View>
        );
      } else {
        return (
          <View style={styles.calcPreview}>
            <Text style={styles.calcLabel}>Total:</Text>
            <Text style={styles.calcValue}>{qty} un</Text>
          </View>
        );
      }
    }
    
    return (
        <View style={styles.calcPreview}>
          <Text style={styles.calcLabel}>Quantidade Final:</Text>
          <Text style={styles.calcValue}>{qty} {selectedProduct.defaultUnit || 'un'}</Text>
        </View>
    );
  };

  if (isScanning) {
    if (!permission?.granted) return <View style={styles.center}><TouchableOpacity onPress={requestPermission} style={styles.permBtn}><Text style={{color: COLORS.text.light}}>Permitir Câmara</Text></TouchableOpacity></View>;
    return (
      <View style={styles.cameraContainer}>
        <CameraView style={StyleSheet.absoluteFillObject} onBarcodeScanned={handleBarCodeScanned} />
        <TouchableOpacity onPress={() => setIsScanning(false)} style={styles.closeCamera}><Ionicons name="close" size={30} color={COLORS.text.light} /></TouchableOpacity>
      </View>
    );
  }

  const checkedCount = items.filter(i => i.isChecked).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Lista de Compras" subtitle={`${items.length} itens planeados`} />

      <FlatList
        data={Object.keys(grouped)}
        keyExtractor={(cat) => cat}
        style={styles.list}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 180 }}
        ListHeaderComponent={
          <TouchableOpacity style={styles.templateBanner} activeOpacity={0.9} onPress={() => navigation.navigate('Templates')}>
            <View style={styles.bannerIcon}><Ionicons name="list" size={24} color={COLORS.text.light} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>As Minhas Listas Fixas</Text>
              <Text style={styles.bannerSub}>Gira as suas listas recorrentes...</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.text.light} opacity={0.8} />
          </TouchableOpacity>
        }
        renderItem={({ item: category }) => (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{category}</Text>
            {grouped[category].map((item: any) => (
              <ShoppingItemCard 
                key={item.id} item={item}
                onToggle={() => toggleItem(item.id, item.isChecked)}
                onEdit={() => handleEdit(item)}
                onDelete={() => setAlertConfig({ visible: true, title: "Remover", message: `Excluir ${item.name}?`, id: item.id, name: item.name })}
              />
            ))}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Ionicons name="cart-outline" size={40} color={COLORS.text.secondary} /></View>
            <Text style={styles.emptyText}>Lista vazia</Text>
            <Text style={styles.emptySub}>Adicione itens ou use as suas listas fixas.</Text>
          </View>
        }
      />

      <FloatingButton onPress={() => setModalVisible(true)} style={{ bottom: 110 }} />

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.finishBtn, checkedCount === 0 && styles.finishBtnDisabled]} 
          onPress={handleFinishShopping} disabled={checkedCount === 0}
        >
          <View style={styles.finishInfo}>
            <Text style={styles.finishText}>Finalizar Compras</Text>
            {checkedCount > 0 && <Text style={styles.finishSub}>{checkedCount} itens selecionados</Text>}
          </View>
          <View style={styles.arrowCircle}>
              <Ionicons name="arrow-forward" size={20} color={checkedCount > 0 ? COLORS.primary : COLORS.text.secondary} />
          </View>
        </TouchableOpacity>
      </View>

      <BottomSheetModal visible={modalVisible} onClose={closeModal} title={editingItemId ? "Editar Item" : "Adicionar à Lista"}>
        <Text style={styles.label}>Procurar Produto</Text>
        <View style={styles.searchRow}>
          <View style={{ flex: 1 }}>
            <Autocomplete 
              placeholder="Ex: Leite, Arroz..." data={catalog} value={query} 
              onChangeText={setQuery} onSelect={selectProduct} closeOnSelect={false}
            />
          </View>
          {!editingItemId && (
            <TouchableOpacity style={styles.barcodeBtn} onPress={() => setIsScanning(true)}>
              <Ionicons name="barcode-outline" size={24} color={COLORS.text.light} />
            </TouchableOpacity>
          )}
        </View>

        {selectedProduct && (
          <View style={styles.productDetailCard}>
            <View style={styles.prodHeader}>
                <Text style={styles.prodName}>{selectedProduct.name}</Text>
                <Text style={styles.prodBrand}>{selectedProduct.brand}</Text>
            </View>
            
            <View style={styles.prodRow}>
                {selectedProduct.packSize && selectedProduct.packSize > 0 && (
                    <View style={styles.badge}>
                        <Ionicons name="cube" size={12} color={COLORS.text.secondary} />
                        <Text style={styles.badgeText}>{selectedProduct.packSize}{selectedProduct.packUnit} / un</Text>
                    </View>
                )}
                {(() => {
                    const loc = getLocationInfo(selectedProduct.defaultLocation || 'pantry');
                    const label = getLocationLabel(selectedProduct.defaultLocation || 'pantry');
                    return (
                        <View style={[styles.badge, { backgroundColor: loc.bg }]}>
                            <Ionicons name="location" size={12} color={loc.icon} />
                            <Text style={[styles.badgeText, { color: loc.icon }]}>{label}</Text>
                        </View>
                    );
                })()}
            </View>

            {selectedProduct.allergens ? (
                <View style={styles.tagsRow}>
                    {selectedProduct.allergens.split(',').filter((t: string) => t.trim()).map((tag: string, index: number) => (
                        <View key={index} style={styles.tag}>
                            <Text style={styles.tagText}>{tag.trim()}</Text>
                        </View>
                    ))}
                </View>
            ) : null}
          </View>
        )}

        {selectedProduct && (
            <View style={styles.toggleContainer}>
                <TouchableOpacity 
                  style={[styles.toggleBtn, inputMode === 'pack' && styles.toggleBtnActive]} 
                  onPress={() => setInputMode('pack')}
                >
                  <Text style={[styles.toggleText, inputMode === 'pack' && styles.toggleTextActive]}>Por Unidade</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.toggleBtn, inputMode === 'measure' && styles.toggleBtnActive]} 
                  onPress={() => setInputMode('measure')}
                >
                  <Text style={[styles.toggleText, inputMode === 'measure' && styles.toggleTextActive]}>Por Peso/Vol</Text>
                </TouchableOpacity>
            </View>
        )}

        <CustomInput 
            label={inputMode === 'pack' ? "Quantas unidades?" : `Quantidade total (${selectedProduct?.defaultUnit || 'un'})`}
            value={quantity} onChangeText={setQuantity} keyboardType="numeric" placeholder="1"
            style={{ marginTop: SPACING.md }}
        />
        
        {getCalculationPreview()}

        <PrimaryButton 
            title={editingItemId ? "Guardar Alterações" : "Adicionar à Lista"}
            onPress={handleSave}
            containerStyle={{ marginTop: SPACING.lg }}
        />
      </BottomSheetModal>

      <AlertModal 
        visible={alertConfig.visible} title={alertConfig.title} message={alertConfig.message} type="danger"
        onCancel={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
        onConfirm={() => { removeItem(alertConfig.id); setAlertConfig(prev => ({ ...prev, visible: false })); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  permBtn: { backgroundColor: COLORS.primary, padding: 12, borderRadius: RADIUS.md },
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  closeCamera: { position: 'absolute', top: 50, right: 30, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: RADIUS.xl, padding: 10 },
  
  templateBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, padding: SPACING.md, borderRadius: RADIUS.lg, marginBottom: SPACING.lg, shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  bannerIcon: { width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
  bannerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text.light },
  bannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  
  section: { marginBottom: SPACING.lg },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: COLORS.text.secondary, textTransform: "uppercase", marginBottom: 10, letterSpacing: 1, marginLeft: 4 },
  
  empty: { alignItems: "center", marginTop: 60, paddingHorizontal: 40 },
  emptyIcon: { width: 80, height: 80, backgroundColor: COLORS.border, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
  emptyText: { fontSize: 18, fontWeight: '700', color: COLORS.text.primary, marginBottom: 8 },
  emptySub: { fontSize: 14, color: COLORS.text.secondary, textAlign: 'center', lineHeight: 20 },
  
  footer: { position: 'absolute', bottom: 0, width: '100%', padding: SPACING.lg, backgroundColor: 'rgba(255,255,255,0.95)', borderTopWidth: 1, borderTopColor: COLORS.border },
  finishBtn: { backgroundColor: COLORS.text.primary, padding: SPACING.md, borderRadius: RADIUS.lg, flexDirection: "row", justifyContent: "space-between", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  finishBtnDisabled: { backgroundColor: COLORS.border, shadowOpacity: 0 },
  finishInfo: { flex: 1 },
  finishText: { color: COLORS.text.light, fontSize: 17, fontWeight: "700" },
  finishSub: { color: "#AAA", fontSize: 12, marginTop: 2 },
  arrowCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center' },
  
  label: { fontSize: 13, fontWeight: '700', color: COLORS.text.secondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  searchRow: { flexDirection: 'row', gap: SPACING.sm },
  barcodeBtn: { backgroundColor: COLORS.text.primary, borderRadius: RADIUS.lg, width: 54, justifyContent: 'center', alignItems: 'center' },
  
  productDetailCard: { backgroundColor: COLORS.background, borderRadius: RADIUS.lg, padding: SPACING.md, marginTop: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  prodHeader: { marginBottom: 8 },
  prodName: { fontSize: 16, fontWeight: '700', color: COLORS.text.primary },
  prodBrand: { fontSize: 12, color: COLORS.text.secondary },
  prodRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.border, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm, gap: 4 },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#555' },
  
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  tag: { backgroundColor: '#FF704320', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 0.5, borderColor: '#FF7043' },
  tagText: { fontSize: 9, color: '#FF7043', fontWeight: '800', textTransform: 'uppercase' },

  toggleContainer: { flexDirection: 'row', backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: 4, marginTop: SPACING.lg },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: RADIUS.sm },
  toggleBtnActive: { backgroundColor: COLORS.card, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  toggleText: { fontSize: 13, fontWeight: '600', color: COLORS.text.secondary },
  toggleTextActive: { color: COLORS.primary },
  
  calcPreview: { marginTop: 12, alignItems: 'flex-end' },
  calcLabel: { fontSize: 11, color: COLORS.text.secondary, fontWeight: '600', textTransform: 'uppercase' },
  calcValue: { fontSize: 20, color: COLORS.primary, fontWeight: '800' },
  calcSub: { fontSize: 12, color: COLORS.text.secondary },
});