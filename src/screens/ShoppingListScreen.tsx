import React, { useState, useCallback, useEffect } from "react";
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera"; 
import { useFocusEffect } from "@react-navigation/native";

import { ScreenHeader } from "../components/ui/ScreenHeader";
import { FloatingButton } from "../components/ui/FloatingButton";
import { Autocomplete } from "../components/Autocomplete";
import { ShoppingItemCard } from "../components/ShoppingItemCard";
import { AlertModal } from "../components/modals/AlertModal";

import { ShoppingRepository } from "../repositories/shoppingRepository";
import { ProductRepository } from "../repositories/productRepository";
import { InventoryRepository } from "../repositories/inventoryRepository";
import { ProductService } from "../services/productService";
import { useShoppingList } from "../hooks/useShoppingList";

export default function ShoppingListScreen({ navigation }: any) {
  const { items, refresh, toggleItem, removeItem } = useShoppingList();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: "", message: "", id: "", name: "" });

  const [catalog, setCatalog] = useState<any[]>([]);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
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
    if (selectedProduct && selectedProduct.packSize > 0) {
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
        } else {
          return Alert.alert("Ops!", "Produto não encontrado. Cadastre-o primeiro.");
        }
      } catch (e) { return Alert.alert("Erro", "Falha na leitura."); }
    }
    
    if (product) {
      selectProduct(product);
      setModalVisible(true);
    }
  };

  const selectProduct = (product: any) => {
    setSelectedProduct(product);
    setQuery(product.name);
  };

  const handleSave = async () => {
    if (!query.trim() && !selectedProduct) return;

    const qtyInput = parseFloat(quantity) || 0;
    let finalQuantity = qtyInput;
    let finalUnit = selectedProduct?.defaultUnit || 'un';

    if (inputMode === 'pack') {
      if (selectedProduct?.packSize > 0) {
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
      } else {
        await ShoppingRepository.addItem(data);
      }
      closeModal();
      refresh();
    } catch (e) { Alert.alert("Erro", "Falha ao salvar."); }
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
    if (checkedItems.length === 0) return Alert.alert("Lista Vazia", "Marque os itens comprados antes de finalizar.");

    Alert.alert(
      "Finalizar Compras", 
      `Mover ${checkedItems.length} itens para o estoque?`,
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
            Alert.alert("Sucesso", "Estoque atualizado!");
        }}
      ]
    );
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingItemId(null); setQuery(""); setSelectedProduct(null); setQuantity("1");
  };

  const grouped = items.reduce((acc: any, item) => {
    const cat = item.category || "Outros";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const getLocationInfo = (loc: string) => {
    switch (loc) {
      case 'fridge': return { label: 'Geladeira', icon: 'thermometer-outline', color: '#007AFF', bg: '#E3F2FD' };
      case 'freezer': return { label: 'Freezer', icon: 'snow-outline', color: '#00BCD4', bg: '#E0F7FA' };
      default: return { label: 'Armário', icon: 'cube-outline', color: '#FF9500', bg: '#FFF3E0' };
    }
  };

  const getCalculationPreview = () => {
    if (!selectedProduct || !quantity) return null;
    const qty = parseFloat(quantity) || 0;

    if (inputMode === 'pack') {
      if (selectedProduct.packSize > 0) {
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
    if (!permission?.granted) return <View style={styles.center}><TouchableOpacity onPress={requestPermission} style={styles.permBtn}><Text style={{color:'#FFF'}}>Permitir Câmera</Text></TouchableOpacity></View>;
    return (
      <View style={styles.cameraContainer}>
        <CameraView style={StyleSheet.absoluteFillObject} onBarcodeScanned={handleBarCodeScanned} />
        <TouchableOpacity onPress={() => setIsScanning(false)} style={styles.closeCamera}><Ionicons name="close" size={30} color="#FFF" /></TouchableOpacity>
      </View>
    );
  }

  const checkedCount = items.filter(i => i.isChecked).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Lista de Compras" subtitle={`${items.length} itens planejados`} />

      <FlatList
        data={Object.keys(grouped)}
        keyExtractor={(cat) => cat}
        style={styles.list}
        contentContainerStyle={{ padding: 20, paddingBottom: 180 }}
        ListHeaderComponent={
          <TouchableOpacity 
            style={styles.templateBanner} 
            activeOpacity={0.9}
            onPress={() => navigation.navigate('Templates')}
          >
            <View style={styles.bannerIcon}>
              <Ionicons name="list" size={24} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Minhas Listas Fixas</Text>
              <Text style={styles.bannerSub}>Gerencie suas listas recorrentes...</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FFF" opacity={0.8} />
          </TouchableOpacity>
        }
        renderItem={({ item: category }) => (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{category}</Text>
            {grouped[category].map((item: any) => (
              <ShoppingItemCard 
                key={item.id}
                item={item}
                onToggle={() => toggleItem(item.id, item.isChecked)}
                onEdit={() => handleEdit(item)}
                onDelete={() => setAlertConfig({ visible: true, title: "Remover", message: `Excluir ${item.name}?`, id: item.id, name: item.name })}
              />
            ))}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Ionicons name="cart-outline" size={40} color="#CCC" /></View>
            <Text style={styles.emptyText}>Lista vazia</Text>
            <Text style={styles.emptySub}>Adicione itens ou use suas listas fixas.</Text>
          </View>
        }
      />

      <FloatingButton onPress={() => setModalVisible(true)} style={{ bottom: 110 }} />

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.finishBtn, checkedCount === 0 && styles.finishBtnDisabled]} 
          onPress={handleFinishShopping}
          disabled={checkedCount === 0}
        >
          <View style={styles.finishInfo}>
            <Text style={styles.finishText}>Finalizar Compras</Text>
            {checkedCount > 0 && <Text style={styles.finishSub}>{checkedCount} itens selecionados</Text>}
          </View>
          <View style={styles.arrowCircle}>
              <Ionicons name="arrow-forward" size={20} color={checkedCount > 0 ? "#007AFF" : "#999"} />
          </View>
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.backdrop} onPress={closeModal} />
          
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingItemId ? "Editar Item" : "Adicionar à Lista"}</Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color="#555" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Buscar Produto</Text>
              <View style={styles.searchRow}>
                <View style={{ flex: 1 }}>
                  <Autocomplete 
                    placeholder="Ex: Leite, Arroz..." 
                    data={catalog}
                    value={query} 
                    onChangeText={setQuery} 
                    onSelect={selectProduct}
                    closeOnSelect={false}
                  />
                </View>
                {!editingItemId && (
                  <TouchableOpacity style={styles.barcodeBtn} onPress={() => setIsScanning(true)}>
                    <Ionicons name="barcode-outline" size={24} color="#FFF" />
                  </TouchableOpacity>
                )}
              </View>

              {/* CARD DETALHES DO PRODUTO */}
              {selectedProduct && (
                <View style={styles.productDetailCard}>
                  <View style={styles.prodHeader}>
                      <Text style={styles.prodName}>{selectedProduct.name}</Text>
                      <Text style={styles.prodBrand}>{selectedProduct.brand}</Text>
                  </View>
                  
                  <View style={styles.prodRow}>
                      {selectedProduct.packSize > 0 && (
                          <View style={styles.badge}>
                              <Ionicons name="cube" size={12} color="#555" />
                              <Text style={styles.badgeText}>
                                  {selectedProduct.packSize}{selectedProduct.packUnit} / un
                              </Text>
                          </View>
                      )}

                      {(() => {
                          const loc = getLocationInfo(selectedProduct.defaultLocation);
                          return (
                              <View style={[styles.badge, { backgroundColor: loc.bg }]}>
                                  <Ionicons name={loc.icon as any} size={12} color={loc.color} />
                                  <Text style={[styles.badgeText, { color: loc.color }]}>{loc.label}</Text>
                              </View>
                          );
                      })()}
                  </View>

                  {/* TAGS DE ALERTAS (Visual Consistente) */}
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

              {/* TOGGLE SEMPRE VISÍVEL */}
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

              <Text style={[styles.label, { marginTop: 20 }]}>
                {inputMode === 'pack' ? "Quantas unidades?" : `Quantidade total (${selectedProduct?.defaultUnit || 'un'})`}
              </Text>
              
              <TextInput 
                  style={styles.qtyInput} 
                  value={quantity} 
                  onChangeText={setQuantity} 
                  keyboardType="numeric" 
                  placeholder="1"
              />
              
              {getCalculationPreview()}

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveText}>{editingItemId ? "Salvar Alterações" : "Adicionar à Lista"}</Text>
              </TouchableOpacity>
              <View style={{height: 20}} />
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <AlertModal 
        visible={alertConfig.visible} title={alertConfig.title} message={alertConfig.message} type="danger"
        onCancel={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
        onConfirm={() => { removeItem(alertConfig.id); setAlertConfig(prev => ({ ...prev, visible: false })); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  list: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  permBtn: { backgroundColor: '#007AFF', padding: 12, borderRadius: 10 },
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  closeCamera: { position: 'absolute', top: 50, right: 30, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 25, padding: 10 },
  templateBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007AFF', padding: 16, borderRadius: 20, marginBottom: 25, shadowColor: "#007AFF", shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  bannerIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  bannerTitle: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  bannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: "#8E8E93", textTransform: "uppercase", marginBottom: 10, letterSpacing: 1, marginLeft: 4 },
  empty: { alignItems: "center", marginTop: 60, paddingHorizontal: 40 },
  emptyIcon: { width: 80, height: 80, backgroundColor: '#E5E5EA', borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#1C1C1E', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#8E8E93', textAlign: 'center', lineHeight: 20 },
  footer: { position: 'absolute', bottom: 0, width: '100%', padding: 20, backgroundColor: 'rgba(255,255,255,0.95)', borderTopWidth: 1, borderTopColor: '#EEE' },
  finishBtn: { backgroundColor: "#1C1C1E", padding: 16, borderRadius: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  finishBtnDisabled: { backgroundColor: "#E5E5EA", shadowOpacity: 0 },
  finishInfo: { flex: 1 },
  finishText: { color: "#FFF", fontSize: 17, fontWeight: "700" },
  finishSub: { color: "#AAA", fontSize: 12, marginTop: 2 },
  arrowCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%', shadowColor: "#000", shadowOffset: {width: 0, height: -4}, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1C1C1E' },
  closeBtn: { padding: 6, backgroundColor: '#F2F2F7', borderRadius: 20 },
  modalBody: { padding: 24 },
  label: { fontSize: 13, fontWeight: '700', color: '#8E8E93', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  searchRow: { flexDirection: 'row', gap: 12 },
  barcodeBtn: { backgroundColor: '#1C1C1E', borderRadius: 16, width: 54, justifyContent: 'center', alignItems: 'center' },
  qtyInput: { backgroundColor: '#F2F2F7', padding: 16, borderRadius: 16, fontSize: 18, fontWeight: '600', color: '#1C1C1E' },
  saveBtn: { backgroundColor: '#007AFF', paddingVertical: 18, borderRadius: 18, alignItems: 'center', marginTop: 25, shadowColor: "#007AFF", shadowOpacity: 0.25, shadowRadius: 8 },
  saveText: { color: '#FFF', fontWeight: 'bold', fontSize: 17 },
  productDetailCard: { backgroundColor: '#F9F9F9', borderRadius: 16, padding: 16, marginTop: 15, borderWidth: 1, borderColor: '#EEE' },
  prodHeader: { marginBottom: 8 },
  prodName: { fontSize: 16, fontWeight: '700', color: '#1C1C1E' },
  prodBrand: { fontSize: 12, color: '#8E8E93' },
  prodRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#555' },
  
  // ESTILOS DAS TAGS (IGUAL AO ESTOQUE)
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  tag: { backgroundColor: '#FF704320', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 0.5, borderColor: '#FF7043' },
  tagText: { fontSize: 9, color: '#FF7043', fontWeight: '800', textTransform: 'uppercase' },

  toggleContainer: { flexDirection: 'row', backgroundColor: '#F2F2F7', borderRadius: 12, padding: 4, marginTop: 20 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  toggleBtnActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  toggleText: { fontSize: 13, fontWeight: '600', color: '#8E8E93' },
  toggleTextActive: { color: '#007AFF' },
  calcPreview: { marginTop: 12, alignItems: 'flex-end' },
  calcLabel: { fontSize: 11, color: '#8E8E93', fontWeight: '600', textTransform: 'uppercase' },
  calcValue: { fontSize: 20, color: '#007AFF', fontWeight: '800' },
  calcSub: { fontSize: 12, color: '#8E8E93' },
});