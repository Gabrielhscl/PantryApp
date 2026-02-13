import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFocusEffect } from "@react-navigation/native";

import { useInventory } from "../hooks/useInventory";
import { InventoryItemCard } from "../components/InventoryItemCard";
import { Autocomplete } from "../components/Autocomplete";
import { ProductService } from "../services/productService";
import { NotificationService } from "../services/notificationService";
import { InventoryRepository } from "../repositories/inventoryRepository";
import { ProductRepository } from "../repositories/productRepository";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { FloatingButton } from "../components/ui/FloatingButton";
import { AlertModal } from "../components/modals/AlertModal";
import { InventoryDetailsModal } from "../components/modals/InventoryDetailsModal";

const LOCATIONS = [
  { id: "pantry", label: "Armário", icon: "cube-outline" },
  { id: "fridge", label: "Geladeira", icon: "thermometer-outline" },
  { id: "freezer", label: "Freezer", icon: "snow-outline" },
];

export default function InventoryScreen() {
  const { items, filter, setFilter, actions, refresh } = useInventory();

  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDateField, setActiveDateField] = useState<"expiry" | "purchase" | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [expiry, setExpiry] = useState(new Date());
  const [purchaseDate, setPurchaseDate] = useState(new Date());
  const [location, setLocation] = useState("pantry");
  const [query, setQuery] = useState("");
  
  // NOVO: Estado para carregar o catálogo de produtos
  const [catalog, setCatalog] = useState<any[]>([]);

  const [totalDisplay, setTotalDisplay] = useState("");
  const [detailItem, setDetailItem] = useState<any | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [alertConfig, setAlertConfig] = useState({
    visible: false, title: "", message: "", type: "info" as "info" | "danger" | "success", onConfirm: () => {},
  });

  // Carrega os dados do estoque e do catálogo ao focar na tela
  const loadAllData = useCallback(async () => {
    refresh(); // Refresh do estoque (via hook)
    const products = await ProductRepository.findAll();
    setCatalog(products);
  }, [refresh]);

  useFocusEffect(useCallback(() => { loadAllData(); }, [loadAllData]));

  useEffect(() => {
    if (selectedProduct) {
      const qty = parseFloat(quantity) || 0;
      const size = selectedProduct.packSize || 0;
      const unit = selectedProduct.packUnit || selectedProduct.defaultUnit || "un";

      if (size > 0) {
        const total = qty * size;
        if (unit === "g" && total >= 1000) setTotalDisplay(`Total: ${(total / 1000).toFixed(2)} kg`);
        else if (unit === "ml" && total >= 1000) setTotalDisplay(`Total: ${(total / 1000).toFixed(2)} L`);
        else setTotalDisplay(`Total: ${total} ${unit}`);
      } else {
        setTotalDisplay(`Total: ${qty} ${unit}`);
      }
    } else {
      setTotalDisplay("");
    }
  }, [quantity, selectedProduct]);

  const openDatePicker = (field: "expiry" | "purchase") => {
    setActiveDateField(field);
    setShowDatePicker(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (selectedDate) {
      if (activeDateField === "expiry") setExpiry(selectedDate);
      if (activeDateField === "purchase") setPurchaseDate(selectedDate);
    }
  };

  const showAlert = (title: string, message: string, onConfirm: () => void, type: "info" | "danger" = "info") => {
    setAlertConfig({ visible: true, title, message, onConfirm, type });
  };
  const closeAlert = () => setAlertConfig((prev) => ({ ...prev, visible: false }));

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setIsScanning(false);
    let product = await ProductRepository.findByBarcode(data);
    if (!product) {
      try {
        const info = await ProductService.fetchProductByBarcode(data);
        if (info.found && info.name) {
          const newId = await ProductRepository.createProduct({
            barcode: data, name: info.name, brand: info.brand, image: info.image, category: "Outros",
            defaultLocation: info.location || "pantry", packSize: info.packSize, packUnit: info.packUnit,
            unit: info.packUnit, calories: info.calories, carbs: info.carbs, protein: info.protein,
            fat: info.fat, fiber: info.fiber, sodium: info.sodium, allergens: info.allergens,
          });
          const allProducts = await ProductRepository.findAll();
          product = allProducts.find((p) => p.id === newId);
          Alert.alert("Sucesso", "Produto adicionado ao catálogo!");
        } else {
          Alert.alert("Aviso", "Cadastre este produto no catálogo primeiro.");
          return;
        }
      } catch (e) {
        Alert.alert("Erro", "Falha ao escanear.");
        return;
      }
    }
    if (product) selectProduct(product);
  };

  const selectProduct = (product: any) => {
    setSelectedProduct(product);
    setLocation(product.defaultLocation || "pantry");
    setQuery("");
    setModalVisible(true);
  };

  const handleEdit = (item: any) => {
    setEditingItemId(item.id);
    setSelectedProduct({
      id: item.productId, name: item.name, image: item.image, brand: item.brand,
      packSize: item.packSize || 0, defaultUnit: item.unit, packUnit: item.packUnit
    });
    setQuantity(String(item.quantity / (item.packSize || 1)));
    setLocation(item.location);
    if (item.expiryDate) setExpiry(new Date(item.expiryDate));
    if (item.createdAt) setPurchaseDate(new Date(item.createdAt));
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    showAlert("Remover Item", "Deseja retirar este item do estoque?", () => {
        actions.removeItem(id);
        closeAlert();
      }, "danger"
    );
  };

  const handleItemPress = (item: any) => {
    setDetailItem(item);
    setShowDetailModal(true);
  };

  const handleSave = async () => {
    if (!selectedProduct) return Alert.alert("Erro", "Selecione um produto.");
    if (!quantity) return Alert.alert("Erro", "Informe a quantidade.");

    try {
      const qtdInput = parseFloat(quantity);
      let finalQuantity = qtdInput;
      if (selectedProduct.packSize > 0) finalQuantity = qtdInput * selectedProduct.packSize;

      const data = {
        productId: selectedProduct.id,
        name: selectedProduct.name,
        quantity: finalQuantity,
        unit: selectedProduct.packUnit || selectedProduct.defaultUnit || "un",
        location,
        expiryDate: expiry,
        createdAt: purchaseDate,
      };

      if (editingItemId) {
        await InventoryRepository.updateItem(editingItemId, data);
      } else {
        await InventoryRepository.createItem(data);
        await NotificationService.scheduleExpiryNotification(selectedProduct.name, expiry);
      }
      setModalVisible(false);
      resetForm();
      loadAllData();
    } catch (error) {
      Alert.alert("Erro", "Falha ao salvar.");
    }
  };

  const resetForm = () => {
    setEditingItemId(null); setSelectedProduct(null); setQuantity("1");
    setExpiry(new Date()); setPurchaseDate(new Date()); setLocation("pantry");
    setQuery(""); setTotalDisplay("");
  };

  if (isScanning) {
    if (!permission?.granted) return <View style={styles.center}><Text>Permitir câmera?</Text><TouchableOpacity onPress={requestPermission}><Text style={{ color: "blue" }}>Sim</Text></TouchableOpacity></View>;
    return (
      <View style={styles.cameraContainer}>
        <CameraView style={StyleSheet.absoluteFillObject} onBarcodeScanned={handleBarCodeScanned} />
        <View style={styles.cameraOverlay}><TouchableOpacity onPress={() => setIsScanning(false)} style={styles.closeCameraButton}><Text style={{ color: "white", fontWeight: "bold" }}>Cancelar</Text></TouchableOpacity></View>
      </View>
    );
  }

  const displayItems = items.filter((i) => i.name.toLowerCase().includes(searchText.toLowerCase()));

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Meu Estoque" subtitle="Gerencie sua despensa" />

        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput style={styles.searchInput} placeholder="Buscar no estoque..." value={searchText} onChangeText={setSearchText} />
        </View>

        <View style={styles.filters}>
          {["all", "fridge", "pantry", "freezer"].map((f) => (
            <TouchableOpacity key={f} style={[styles.filterChip, filter === f && styles.filterChipActive]} onPress={() => setFilter(f as any)}>
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === "all" ? "Todos" : f === "fridge" ? "Geladeira" : f === "pantry" ? "Armário" : "Freezer"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={displayItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <InventoryItemCard item={item} onPress={handleItemPress} onEdit={handleEdit} onDelete={handleDelete} />}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          ListEmptyComponent={<View style={{ alignItems: "center", marginTop: 50 }}><Ionicons name="basket-outline" size={60} color="#ccc" /><Text style={{ color: "#999", marginTop: 10 }}>Estoque vazio</Text></View>}
        />

        <FloatingButton onPress={() => { resetForm(); setModalVisible(true); }} />

        <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
            
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingItemId ? "Ajustar Item" : "Novo Item"}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}><Ionicons name="close" size={24} color="#333" /></TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.section}>
                  {!selectedProduct ? (
                    <>
                      <View style={styles.searchRow}>
                        <View style={{ flex: 1 }}><Autocomplete placeholder="Buscar no catálogo..." value={query} onChangeText={setQuery} onSelect={selectProduct} /></View>
                        <TouchableOpacity style={styles.scanBtnMini} onPress={() => setIsScanning(true)}><Ionicons name="barcode-outline" size={24} color="#FFF" /></TouchableOpacity>
                      </View>

                      {/* NOVO: Lista de Atalhos do Catálogo */}
                      {catalog.length > 0 && (
                        <View style={{ marginTop: 20 }}>
                          <Text style={styles.label}>Ou selecione do cadastro:</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 5 }}>
                            {catalog.map((p) => (
                              <TouchableOpacity key={p.id} style={styles.quickCard} onPress={() => selectProduct(p)}>
                                {p.image ? (
                                  <Image source={{ uri: p.image }} style={styles.quickImg} />
                                ) : (
                                  <View style={styles.quickPlaceholder}><Ionicons name="cube-outline" size={20} color="#007AFF" /></View>
                                )}
                                <Text style={styles.quickName} numberOfLines={1}>{p.name}</Text>
                                <Text style={styles.quickBrand} numberOfLines={1}>{p.brand || 'Geral'}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={styles.productBadge}>
                        <View style={styles.productInfo}>
                            {selectedProduct.image ? <Image source={{ uri: selectedProduct.image }} style={styles.miniImg} /> : <View style={styles.placeholderImg}><Ionicons name="cube" size={20} color="#007AFF" /></View>}
                            <View>
                                <Text style={styles.productName}>{selectedProduct.name}</Text>
                                <Text style={styles.productSub}>{selectedProduct.brand} {selectedProduct.packSize > 0 ? `• ${selectedProduct.packSize}${selectedProduct.packUnit}` : ""}</Text>
                            </View>
                        </View>
                        {!editingItemId && <TouchableOpacity onPress={() => setSelectedProduct(null)}><Text style={styles.changeText}>Trocar</Text></TouchableOpacity>}
                    </View>
                  )}
                </View>

                {selectedProduct && (
                  <>
                    <View style={styles.section}>
                      <Text style={styles.label}>{selectedProduct.packSize > 0 ? "Quantas embalagens?" : "Quantidade"}</Text>
                      <View style={styles.qtyContainer}>
                        <TouchableOpacity onPress={() => setQuantity(Math.max(0, parseFloat(quantity) - 1).toString())} style={styles.qtyBtn}><Ionicons name="remove" size={22} color="#007AFF" /></TouchableOpacity>
                        <TextInput style={styles.qtyInput} value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
                        <TouchableOpacity onPress={() => setQuantity((parseFloat(quantity || "0") + 1).toString())} style={styles.qtyBtn}><Ionicons name="add" size={22} color="#007AFF" /></TouchableOpacity>
                      </View>
                      {totalDisplay ? <Text style={styles.totalHint}>{totalDisplay}</Text> : null}
                    </View>

                    <View style={styles.dateGrid}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Vencimento</Text>
                            <TouchableOpacity onPress={() => openDatePicker("expiry")} style={styles.dateBox}>
                                <Ionicons name="calendar-outline" size={18} color="#666" />
                                <Text style={styles.dateValueText}>{expiry.toLocaleDateString("pt-BR")}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Compra</Text>
                            <TouchableOpacity onPress={() => openDatePicker("purchase")} style={styles.dateBox}>
                                <Ionicons name="cart-outline" size={18} color="#666" />
                                <Text style={styles.dateValueText}>{purchaseDate.toLocaleDateString("pt-BR")}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.section}>
                      <Text style={styles.label}>Onde será guardado?</Text>
                      <View style={styles.locGrid}>
                        {LOCATIONS.map((loc) => (
                          <TouchableOpacity key={loc.id} style={[styles.locItem, location === loc.id && styles.locItemActive]} onPress={() => setLocation(loc.id)}>
                            <Ionicons name={loc.icon as any} size={22} color={location === loc.id ? "#FFF" : "#8E8E93"} />
                            <Text style={[styles.locLabel, location === loc.id && styles.locLabelActive]}>{loc.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </>
                )}
                <View style={{ height: 100 }} />
              </ScrollView>

              <View style={styles.footer}>
                <TouchableOpacity style={[styles.saveBtn, !selectedProduct && styles.saveBtnDisabled]} onPress={handleSave} disabled={!selectedProduct}>
                  <Text style={styles.saveText}>{editingItemId ? "Salvar Alterações" : "Adicionar ao Estoque"}</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {showDatePicker && (
          <DateTimePicker
            value={activeDateField === "expiry" ? expiry : purchaseDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleDateChange}
          />
        )}

        <AlertModal visible={alertConfig.visible} title={alertConfig.title} message={alertConfig.message} type={alertConfig.type} onCancel={closeAlert} onConfirm={alertConfig.onConfirm} confirmText={alertConfig.type === "danger" ? "Excluir" : "Confirmar"} />
        <InventoryDetailsModal visible={showDetailModal} item={detailItem} onClose={() => setShowDetailModal(false)} />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f2f7" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchBox: { flexDirection: "row", backgroundColor: "#fff", marginHorizontal: 16, padding: 12, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: "#e5e5ea" },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: "#333" },
  filters: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e5ea" },
  filterChipActive: { backgroundColor: "#007AFF", borderColor: "#007AFF" },
  filterText: { fontWeight: "600", color: "#666" },
  filterTextActive: { color: "white" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalContent: { backgroundColor: "#F8F9FA", borderTopLeftRadius: 28, borderTopRightRadius: 28, height: "90%", overflow: "hidden" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  modalTitle: { fontSize: 20, fontWeight: "800", color: '#1C1C1E' },
  closeBtn: { padding: 4, backgroundColor: '#F2F2F7', borderRadius: 20 },
  modalBody: { flex: 1, padding: 20 },
  
  section: { marginBottom: 24 },
  label: { fontSize: 13, fontWeight: "700", color: "#8E8E93", marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  searchRow: { flexDirection: "row", gap: 10 },
  scanBtnMini: { backgroundColor: "#1C1C1E", borderRadius: 12, width: 50, justifyContent: "center", alignItems: "center" },

  // Estilos dos Cards de Atalho (Quick Catalog)
  quickCard: { backgroundColor: '#FFF', padding: 10, borderRadius: 16, width: 110, borderWidth: 1, borderColor: '#EEE', alignItems: 'center' },
  quickImg: { width: 40, height: 40, borderRadius: 8, marginBottom: 6 },
  quickPlaceholder: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  quickName: { fontSize: 12, fontWeight: '700', color: '#1C1C1E', textAlign: 'center' },
  quickBrand: { fontSize: 10, color: '#8E8E93', textAlign: 'center' },

  productBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#EEE' },
  productInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  miniImg: { width: 44, height: 44, borderRadius: 10 },
  placeholderImg: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center' },
  productName: { fontSize: 16, fontWeight: '700', color: '#1C1C1E' },
  productSub: { fontSize: 12, color: '#8E8E93' },
  changeText: { color: '#FF3B30', fontWeight: '700', fontSize: 13 },

  qtyContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", borderRadius: 16, padding: 6, borderWidth: 1, borderColor: '#EEE' },
  qtyBtn: { width: 48, height: 48, justifyContent: "center", alignItems: "center", backgroundColor: "#F2F2F7", borderRadius: 12 },
  qtyInput: { flex: 1, textAlign: "center", fontSize: 22, fontWeight: "800", color: '#1C1C1E' },
  totalHint: { fontSize: 12, color: "#007AFF", marginTop: 8, fontWeight: "700", textAlign: 'center' },

  dateGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  dateBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#EEE' },
  dateValueText: { fontSize: 14, fontWeight: '600', color: '#1C1C1E' },

  locGrid: { flexDirection: "row", gap: 10 },
  locItem: { flex: 1, alignItems: "center", padding: 16, borderRadius: 16, backgroundColor: "#FFF", borderWidth: 1, borderColor: '#EEE', gap: 6 },
  locItemActive: { backgroundColor: "#007AFF", borderColor: "#007AFF" },
  locLabel: { fontSize: 12, fontWeight: "700", color: "#8E8E93" },
  locLabelActive: { color: "#FFF" },

  footer: { padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EEE' },
  saveBtn: { backgroundColor: "#007AFF", paddingVertical: 16, borderRadius: 18, alignItems: "center" },
  saveBtnDisabled: { backgroundColor: "#CCC" },
  saveText: { color: "white", fontSize: 18, fontWeight: "800" },

  cameraContainer: { flex: 1, backgroundColor: "black" },
  cameraOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end", paddingBottom: 50, alignItems: "center" },
  closeCameraButton: { backgroundColor: "rgba(255, 0, 0, 0.8)", paddingHorizontal: 30, paddingVertical: 15, borderRadius: 25 },
});