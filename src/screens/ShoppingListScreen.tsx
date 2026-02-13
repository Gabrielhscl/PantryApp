import React, { useState, useCallback } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera"; // Importado para o scanner
import { useFocusEffect } from "@react-navigation/native";

import { ScreenHeader } from "../components/ui/ScreenHeader";
import { FloatingButton } from "../components/ui/FloatingButton";
import { Autocomplete } from "../components/Autocomplete";
import { ShoppingRepository } from "../repositories/shoppingRepository";
import { ProductRepository } from "../repositories/productRepository";
import { ProductService } from "../services/productService";
import { useShoppingList } from "../hooks/useShoppingList";

export default function ShoppingListScreen() {
  const { items, refresh, toggleItem } = useShoppingList();
  const [modalVisible, setModalVisible] = useState(false);

  // --- ESTADOS DO SCANNER ---
  const [isScanning, setIsScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // Estados do Modal
  const [query, setQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState("1");

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  // --- LÓGICA DO SCANNER ---
  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setIsScanning(false);
    let product = await ProductRepository.findByBarcode(data);
    
    if (!product) {
      try {
        const info = await ProductService.fetchProductByBarcode(data);
        if (info.found && info.name) {
          // Cria o produto no catálogo se for novo
          const newId = await ProductRepository.createProduct({
            barcode: data, name: info.name, brand: info.brand, image: info.image,
            category: "Outros", defaultLocation: "pantry", defaultUnit: info.packUnit || "un"
          });
          const all = await ProductRepository.findAll();
          product = all.find(p => p.id === newId);
        } else {
          return Alert.alert("Não encontrado", "Este produto não está no catálogo. Cadastre-o primeiro.");
        }
      } catch (e) {
        return Alert.alert("Erro", "Falha ao buscar produto.");
      }
    }
    
    if (product) {
      setSelectedProduct(product);
      setQuery(product.name);
      setModalVisible(true);
    }
  };

  const handleAddItem = async () => {
    if (!selectedProduct && !query.trim()) return Alert.alert("Erro", "Digite o nome do item.");
    
    await ShoppingRepository.addItem({
      productId: selectedProduct?.id || null,
      name: selectedProduct?.name || query,
      quantity: parseFloat(quantity) || 1,
      unit: selectedProduct?.defaultUnit || 'un',
      category: selectedProduct?.category || 'Outros'
    });

    setModalVisible(false);
    resetForm();
    refresh();
  };

  const resetForm = () => {
    setQuery("");
    setSelectedProduct(null);
    setQuantity("1");
  };

  const grouped = items.reduce((acc: any, item) => {
    const cat = item.category || "Outros";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  // --- UI DO SCANNER ---
  if (isScanning) {
    if (!permission?.granted) {
      return (
        <View style={styles.center}>
          <Text style={{marginBottom: 20}}>Precisamos de acesso à câmera</Text>
          <TouchableOpacity onPress={requestPermission} style={styles.permBtn}>
            <Text style={{color: '#FFF', fontWeight: 'bold'}}>Permitir</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.cameraContainer}>
        <CameraView style={StyleSheet.absoluteFillObject} onBarcodeScanned={handleBarCodeScanned} />
        <TouchableOpacity onPress={() => setIsScanning(false)} style={styles.closeCamera}>
          <Ionicons name="close" size={30} color="#FFF" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Lista de Compras" subtitle={`${items.length} itens planejados`} />

      <FlatList
        data={Object.keys(grouped)}
        keyExtractor={(cat) => cat}
        contentContainerStyle={{ padding: 20, paddingBottom: 160 }}
        renderItem={({ item: category }) => (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{category}</Text>
            {grouped[category].map((item: any) => (
              <TouchableOpacity key={item.id} style={styles.itemRow} onPress={() => toggleItem(item.id, item.isChecked)}>
                <View style={[styles.checkbox, item.isChecked && styles.checked]}>
                  {item.isChecked && <Ionicons name="checkmark" size={16} color="#FFF" />}
                </View>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, item.isChecked && styles.textStrikethrough]}>{item.name}</Text>
                  <Text style={styles.itemQty}>{item.quantity} {item.unit}</Text>
                </View>
                <TouchableOpacity onPress={() => { ShoppingRepository.deleteItem(item.id); refresh(); }}>
                   <Ionicons name="trash-outline" size={20} color="#FF3B30" opacity={0.5} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
      />

      <FloatingButton onPress={() => setModalVisible(true)} style={{ bottom: 110 }} />

      <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.finishBtn, items.length === 0 && { backgroundColor: '#CCC' }]}
            disabled={items.length === 0}
            onPress={() => Alert.alert("Sucesso", "Itens comprados adicionados ao estoque!")}
          >
             <Text style={styles.finishText}>Finalizar Compras</Text>
             <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adicionar à Lista</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color="#333" /></TouchableOpacity>
            </View>
            
            <View style={{ padding: 20 }}>
              <Text style={styles.label}>Produto</Text>
              <View style={styles.searchRow}>
                <View style={{ flex: 1 }}>
                  <Autocomplete 
                    placeholder="Nome ou buscar catálogo..." 
                    value={query} 
                    onChangeText={setQuery} 
                    onSelect={(p) => { setSelectedProduct(p); setQuery(p.name); }} 
                  />
                </View>
                <TouchableOpacity style={styles.barcodeBtn} onPress={() => setIsScanning(true)}>
                  <Ionicons name="barcode-outline" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, { marginTop: 20 }]}>Quantidade</Text>
              <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType="numeric" placeholder="Ex: 2" />

              <TouchableOpacity style={styles.addBtn} onPress={handleAddItem}>
                <Text style={styles.addBtnText}>Adicionar Item</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  permBtn: { backgroundColor: '#007AFF', padding: 12, borderRadius: 10 },
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  closeCamera: { position: 'absolute', top: 50, right: 30, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 25, padding: 10 },
  
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: "#8E8E93", textTransform: "uppercase", marginBottom: 10, letterSpacing: 1 },
  itemRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", padding: 16, borderRadius: 16, marginBottom: 8 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: "#007AFF", marginRight: 15, justifyContent: "center", alignItems: "center" },
  checked: { backgroundColor: "#34C759", borderColor: "#34C759" },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: "600", color: "#1C1C1E" },
  itemQty: { fontSize: 12, color: "#8E8E93", marginTop: 2 },
  textStrikethrough: { textDecorationLine: "line-through", color: "#8E8E93" },
  
  footer: { position: 'absolute', bottom: 0, width: '100%', padding: 20, backgroundColor: 'rgba(255,255,255,0.95)', borderTopWidth: 1, borderTopColor: '#EEE' },
  finishBtn: { backgroundColor: "#007AFF", padding: 18, borderRadius: 18, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10 },
  finishText: { color: "#FFF", fontSize: 18, fontWeight: "800" },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  
  searchRow: { flexDirection: 'row', gap: 10 },
  barcodeBtn: { backgroundColor: '#1C1C1E', borderRadius: 12, width: 50, justifyContent: 'center', alignItems: 'center' },
  
  label: { fontSize: 13, fontWeight: '700', color: '#8E8E93', marginBottom: 5 },
  input: { backgroundColor: '#F2F2F7', padding: 15, borderRadius: 12, fontSize: 16 },
  addBtn: { backgroundColor: '#007AFF', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 30 },
  addBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});