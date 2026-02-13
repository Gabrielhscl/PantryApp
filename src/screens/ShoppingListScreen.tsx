import React, { useState, useCallback } from "react";
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform, Image
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera"; 
import { useFocusEffect } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

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

  // Estados do Scanner
  const [isScanning, setIsScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // Estados de Formulário
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState("1");

  const [alertConfig, setAlertConfig] = useState({ visible: false, title: "", message: "", id: "", name: "" });

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setIsScanning(false);
    let product = await ProductRepository.findByBarcode(data);
    
    if (!product) {
      try {
        const info = await ProductService.fetchProductByBarcode(data);
        if (info.found && info.name) {
          const newId = await ProductRepository.createProduct({
            barcode: data, name: info.name, brand: info.brand, image: info.image,
            category: "Outros", defaultLocation: "pantry", defaultUnit: info.packUnit || "un"
          });
          const all = await ProductRepository.findAll();
          product = all.find(p => p.id === newId);
        } else {
          return Alert.alert("Ops!", "Produto não cadastrado no catálogo.");
        }
      } catch (e) { return Alert.alert("Erro", "Falha ao escanear."); }
    }
    
    if (product) {
      setSelectedProduct(product);
      setQuery(product.name);
      setModalVisible(true);
    }
  };

  const handleSave = async () => {
    if (!query.trim() && !selectedProduct) return Alert.alert("Erro", "Informe o item.");

    const data = {
      productId: selectedProduct?.id || null,
      name: selectedProduct?.name || query,
      quantity: parseFloat(quantity) || 1,
      unit: selectedProduct?.defaultUnit || 'un',
      category: selectedProduct?.category || 'Outros'
    };

    try {
      if (editingItemId) {
        await ShoppingRepository.updateItem(editingItemId, data);
      } else {
        await ShoppingRepository.addItem(data);
      }
      setModalVisible(false);
      resetForm();
      refresh();
    } catch (e) { Alert.alert("Erro", "Falha ao salvar."); }
  };

  const handleFinishShopping = async () => {
    const checkedItems = items.filter(i => i.isChecked);
    if (checkedItems.length === 0) return Alert.alert("Aviso", "Marque os itens que você comprou primeiro.");

    Alert.alert("Finalizar Compras", `Deseja mover ${checkedItems.length} itens para o estoque?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Sim, Mover", onPress: async () => {
          for (const item of checkedItems) {
            await InventoryRepository.createItem({
              productId: item.productId,
              name: item.name,
              quantity: item.quantity,
              unit: item.unit,
              location: 'pantry',
              expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Sugere 7 dias por padrão
            });
            await ShoppingRepository.deleteItem(item.id);
          }
          refresh();
          Alert.alert("Sucesso", "Estoque atualizado!");
      }}
    ]);
  };

  const resetForm = () => {
    setEditingItemId(null); setQuery(""); setSelectedProduct(null); setQuantity("1");
  };

  const grouped = items.reduce((acc: any, item) => {
    const cat = item.category || "Outros";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  if (isScanning) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView style={StyleSheet.absoluteFillObject} onBarcodeScanned={handleBarCodeScanned} />
        <TouchableOpacity onPress={() => setIsScanning(false)} style={styles.closeCamera}><Ionicons name="close" size={30} color="#FFF" /></TouchableOpacity>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Lista de Compras" subtitle={`${items.length} itens planejados`} />

        <View style={styles.templateAccessContainer}>
            <TouchableOpacity 
                style={styles.templateBtn} 
                onPress={() => navigation.navigate('Templates')}
            >
                <View style={styles.iconCircle}>
                    <Ionicons name="list" size={20} color="#007AFF" />
                </View>
                <View>
                    <Text style={styles.templateBtnTitle}>Listas Fixas (Templates)</Text>
                    <Text style={styles.templateBtnSub}>Feira mensal, Churrasco, etc.</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CCC" style={{marginLeft: 'auto'}} />
            </TouchableOpacity>
        </View>

        <FlatList
          data={Object.keys(grouped)}
          keyExtractor={(cat) => cat}
          contentContainerStyle={{ padding: 20, paddingBottom: 180 }}
          renderItem={({ item: category }) => (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{category}</Text>
              {grouped[category].map((item: any) => (
                <ShoppingItemCard 
                  key={item.id}
                  item={item}
                  onToggle={() => toggleItem(item.id, item.isChecked)}
                  onEdit={() => {
                    setEditingItemId(item.id);
                    setQuery(item.name);
                    setQuantity(String(item.quantity));
                    setSelectedProduct(item.productId ? { id: item.productId, name: item.name, category: item.category, defaultUnit: item.unit } : null);
                    setModalVisible(true);
                  }}
                  onDelete={() => setAlertConfig({ visible: true, title: "Remover", message: `Excluir ${item.name}?`, id: item.id, name: item.name })}
                />
              ))}
            </View>
          )}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="cart-outline" size={64} color="#CCC" /><Text style={styles.emptyText}>Lista vazia</Text></View>}
        />

        <FloatingButton onPress={() => { resetForm(); setModalVisible(true); }} style={{ bottom: 110 }} />

        <View style={styles.footer}>
          <TouchableOpacity style={[styles.finishBtn, items.filter(i => i.isChecked).length === 0 && { backgroundColor: '#A1A1A1' }]} onPress={handleFinishShopping}>
            <Text style={styles.finishText}>Finalizar Compras</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingItemId ? "Editar Item" : "Adicionar à Lista"}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color="#333" /></TouchableOpacity>
              </View>
              <View style={{ padding: 20 }}>
                <Text style={styles.label}>Produto</Text>
                <View style={styles.searchRow}>
                  <View style={{ flex: 1 }}><Autocomplete placeholder="Buscar catálogo..." value={query} onChangeText={setQuery} onSelect={(p) => { setSelectedProduct(p); setQuery(p.name); }} /></View>
                  {!editingItemId && <TouchableOpacity style={styles.barcodeBtn} onPress={() => setIsScanning(true)}><Ionicons name="barcode-outline" size={24} color="#FFF" /></TouchableOpacity>}
                </View>
                <Text style={[styles.label, { marginTop: 20 }]}>Quantidade</Text>
                <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
                <TouchableOpacity style={styles.addBtn} onPress={handleSave}><Text style={styles.addBtnText}>Salvar</Text></TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        <AlertModal 
          visible={alertConfig.visible} title={alertConfig.title} message={alertConfig.message} type="danger"
          onCancel={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
          onConfirm={() => { removeItem(alertConfig.id); setAlertConfig(prev => ({ ...prev, visible: false })); }}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: "#8E8E93", textTransform: "uppercase", marginBottom: 10, letterSpacing: 1 },
  empty: { alignItems: "center", marginTop: 100 },
  emptyText: { color: "#999", marginTop: 10, fontSize: 16 },
  footer: { position: 'absolute', bottom: 0, width: '100%', padding: 20, backgroundColor: 'rgba(255,255,255,0.95)', borderTopWidth: 1, borderTopColor: '#EEE' },
  finishBtn: { backgroundColor: "#007AFF", padding: 18, borderRadius: 18, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10 },
  finishText: { color: "#FFF", fontSize: 18, fontWeight: "800" },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  searchRow: { flexDirection: 'row', gap: 10 },
  barcodeBtn: { backgroundColor: '#1C1C1E', borderRadius: 12, width: 50, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 13, fontWeight: '700', color: '#8E8E93', marginBottom: 5 },
  input: { backgroundColor: '#F2F2F7', padding: 15, borderRadius: 12, fontSize: 16 },
  addBtn: { backgroundColor: '#007AFF', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 30 },
  addBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  closeCamera: { position: 'absolute', top: 50, right: 30, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 25, padding: 10 },
  templateAccessContainer: { paddingHorizontal: 20, marginBottom: 15 },
  templateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  templateBtnTitle: { fontSize: 15, fontWeight: '700', color: '#1C1C1E' },
  templateBtnSub: { fontSize: 12, color: '#8E8E93' },
});