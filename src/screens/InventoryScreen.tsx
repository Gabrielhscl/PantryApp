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

  // UI States
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);

  // --- CONTROLE DE DATAS ---
  // Precisamos saber QUAL data estamos editando (vencimento ou compra)
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDateField, setActiveDateField] = useState<
    "expiry" | "purchase" | null
  >(null);

  const [isScanning, setIsScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // Form States
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [expiry, setExpiry] = useState(new Date());
  const [purchaseDate, setPurchaseDate] = useState(new Date()); // NOVO
  const [location, setLocation] = useState("pantry");
  const [query, setQuery] = useState("");

  const [totalDisplay, setTotalDisplay] = useState("");
  const [detailItem, setDetailItem] = useState<any | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "info" as "info" | "danger" | "success",
    onConfirm: () => {},
  });

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, []),
  );

  useEffect(() => {
    if (selectedProduct) {
      const qty = parseFloat(quantity) || 0;
      const size = selectedProduct.packSize || 0;
      const unit =
        selectedProduct.packUnit || selectedProduct.defaultUnit || "un";

      if (size > 0) {
        const total = qty * size;
        if (unit === "g" && total >= 1000)
          setTotalDisplay(`Total: ${(total / 1000).toFixed(2)} kg`);
        else if (unit === "ml" && total >= 1000)
          setTotalDisplay(`Total: ${(total / 1000).toFixed(2)} L`);
        else setTotalDisplay(`Total: ${total} ${unit}`);
      } else {
        setTotalDisplay(`Total: ${qty} ${unit}`);
      }
    } else {
      setTotalDisplay("");
    }
  }, [quantity, selectedProduct]);

  // --- HANDLERS ---
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

  const showAlert = (
    title: string,
    message: string,
    onConfirm: () => void,
    type: "info" | "danger" = "info",
  ) => {
    setAlertConfig({ visible: true, title, message, onConfirm, type });
  };
  const closeAlert = () =>
    setAlertConfig((prev) => ({ ...prev, visible: false }));

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setIsScanning(false);
    let product = await ProductRepository.findByBarcode(data);
    if (!product) {
      try {
        const info = await ProductService.fetchProductByBarcode(data);
        if (info.found && info.name) {
          const newId = await ProductRepository.createProduct({
            barcode: data,
            name: info.name,
            brand: info.brand,
            image: info.image,
            category: "Outros",
            defaultLocation: info.location || "pantry",
            packSize: info.packSize,
            packUnit: info.packUnit,
            unit: info.packUnit,
            calories: info.calories,
            carbs: info.carbs,
            protein: info.protein,
            fat: info.fat,
            fiber: info.fiber,
            sodium: info.sodium,
            allergens: info.allergens,
          });
          const allProducts = await ProductRepository.findAll();
          product = allProducts.find((p) => p.id === newId);
          Alert.alert(
            "Novo Produto",
            "Adicionado ao catálogo! Defina a quantidade.",
          );
        } else {
          Alert.alert("Não encontrado", "Cadastre na aba Catálogo primeiro.");
          return;
        }
      } catch (e) {
        Alert.alert("Erro", "Falha ao buscar produto.");
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
      id: item.productId,
      name: item.name,
      image: item.image,
      brand: item.brand,
      packSize: 0,
      defaultUnit: item.unit,
    });
    setQuantity(String(item.quantity));
    setLocation(item.location);
    if (item.expiryDate) setExpiry(new Date(item.expiryDate));
    // Carrega a data de compra se existir, senão usa hoje
    if (item.createdAt) setPurchaseDate(new Date(item.createdAt));
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    showAlert(
      "Remover Item",
      "Tem certeza que deseja remover este item do estoque?",
      () => {
        actions.removeItem(id);
        closeAlert();
      },
      "danger",
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
      if (!editingItemId && selectedProduct.packSize > 0)
        finalQuantity = qtdInput * selectedProduct.packSize;

      const data = {
        productId: selectedProduct.id,
        name: selectedProduct.name,
        quantity: finalQuantity,
        unit: selectedProduct.packUnit || selectedProduct.defaultUnit || "un",
        location,
        expiryDate: expiry,
        createdAt: purchaseDate, // Salva a data de compra escolhida
      };

      if (editingItemId) {
        await InventoryRepository.updateItem(editingItemId, data);
        Alert.alert("Atualizado", "Estoque ajustado!");
      } else {
        await InventoryRepository.createItem(data);
        await NotificationService.scheduleExpiryNotification(
          selectedProduct.name,
          expiry,
        );
        Alert.alert("Adicionado", "Item salvo! 📦");
      }
      setModalVisible(false);
      resetForm();
      refresh();
    } catch (error) {
      Alert.alert("Erro", "Falha ao salvar.");
    }
  };

  const resetForm = () => {
    setEditingItemId(null);
    setSelectedProduct(null);
    setQuantity("1");
    setExpiry(new Date());
    setPurchaseDate(new Date()); // Reset data compra
    setLocation("pantry");
    setQuery("");
    setTotalDisplay("");
  };

  if (isScanning) {
    if (!permission?.granted)
      return (
        <View style={styles.center}>
          <Text>Permitir câmera?</Text>
          <TouchableOpacity onPress={requestPermission}>
            <Text style={{ color: "blue" }}>Sim</Text>
          </TouchableOpacity>
        </View>
      );
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={handleBarCodeScanned}
        />
        <View style={styles.cameraOverlay}>
          <TouchableOpacity
            onPress={() => setIsScanning(false)}
            style={styles.closeCameraButton}
          >
            <Text style={{ color: "white", fontWeight: "bold" }}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const displayItems = items.filter((i) =>
    i.name.toLowerCase().includes(searchText.toLowerCase()),
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Meu Estoque" subtitle="Gerencie sua despensa" />

        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar..."
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        <View style={styles.filters}>
          {["all", "fridge", "pantry", "freezer"].map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterChip,
                filter === f && styles.filterChipActive,
              ]}
              onPress={() => setFilter(f as any)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === f && styles.filterTextActive,
                ]}
              >
                {f === "all"
                  ? "Todos"
                  : f === "fridge"
                    ? "Geladeira"
                    : f === "pantry"
                      ? "Armário"
                      : "Freezer"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={displayItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <InventoryItemCard
              item={item}
              onPress={handleItemPress}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 50 }}>
              <Ionicons name="basket-outline" size={60} color="#ccc" />
              <Text style={{ color: "#999", marginTop: 10 }}>
                Estoque vazio
              </Text>
            </View>
          }
        />

        <FloatingButton
          onPress={() => {
            resetForm();
            setModalVisible(true);
          }}
        />

        {/* MODAL DE ADIÇÃO/EDIÇÃO */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              onPress={() => setModalVisible(false)}
            />
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingItemId ? "Ajustar Estoque" : "Adicionar Item"}
                </Text>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.closeBtn}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
              >
                <ScrollView
                  style={styles.modalBody}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.section}>
                    {!selectedProduct ? (
                      <View>
                        <Text style={styles.label}>Qual produto?</Text>
                        <View style={{ flexDirection: "row", gap: 10 }}>
                          <View style={{ flex: 1 }}>
                            <Autocomplete
                              placeholder="Digite o nome..."
                              value={query}
                              onChangeText={setQuery}
                              onSelect={selectProduct}
                            />
                          </View>
                          <TouchableOpacity
                            style={styles.scanBtnMini}
                            onPress={() => setIsScanning(true)}
                          >
                            <Ionicons
                              name="barcode-outline"
                              size={24}
                              color="#FFF"
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.selectedProductCard}>
                        {selectedProduct.image ? (
                          <Image
                            source={{ uri: selectedProduct.image }}
                            style={styles.selectedImage}
                          />
                        ) : (
                          <View style={styles.placeholderImage}>
                            <Ionicons name="cube" size={24} color="#007AFF" />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.selectedTitle}>
                            {selectedProduct.name}
                          </Text>
                          <Text style={styles.selectedSubtitle}>
                            {selectedProduct.brand}{" "}
                            {selectedProduct.packSize > 0
                              ? ` • ${selectedProduct.packSize}${selectedProduct.packUnit}`
                              : ""}
                          </Text>
                        </View>
                        {!editingItemId && (
                          <TouchableOpacity
                            onPress={() => setSelectedProduct(null)}
                            style={{ padding: 5 }}
                          >
                            <Text
                              style={{ color: "#FF3B30", fontWeight: "bold" }}
                            >
                              Trocar
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>

                  {selectedProduct && (
                    <>
                      <View style={styles.section}>
                        <Text style={styles.label}>
                          {editingItemId
                            ? "Quantidade Total"
                            : "Quantas embalagens?"}
                        </Text>
                        <View style={styles.qtyContainer}>
                          <TouchableOpacity
                            onPress={() =>
                              setQuantity(
                                Math.max(
                                  1,
                                  parseFloat(quantity) - 1,
                                ).toString(),
                              )
                            }
                            style={styles.qtyBtn}
                          >
                            <Ionicons name="remove" size={20} color="#007AFF" />
                          </TouchableOpacity>
                          <TextInput
                            style={styles.qtyInput}
                            value={quantity}
                            onChangeText={setQuantity}
                            keyboardType="numeric"
                          />
                          <TouchableOpacity
                            onPress={() =>
                              setQuantity((parseFloat(quantity) + 1).toString())
                            }
                            style={styles.qtyBtn}
                          >
                            <Ionicons name="add" size={20} color="#007AFF" />
                          </TouchableOpacity>
                        </View>
                        {totalDisplay ? (
                          <Text style={styles.totalHint}>{totalDisplay}</Text>
                        ) : null}
                      </View>

                      {/* LINHA DE DATAS DUPLA */}
                      <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.label}>Vence em</Text>
                          <TouchableOpacity
                            onPress={() => openDatePicker("expiry")}
                            style={styles.dateBtn}
                          >
                            <Ionicons
                              name="calendar-outline"
                              size={20}
                              color="#666"
                            />
                            <Text style={styles.dateText}>
                              {expiry.toLocaleDateString("pt-BR")}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.label}>Comprou em</Text>
                          <TouchableOpacity
                            onPress={() => openDatePicker("purchase")}
                            style={styles.dateBtn}
                          >
                            <Ionicons
                              name="cart-outline"
                              size={20}
                              color="#666"
                            />
                            <Text style={styles.dateText}>
                              {purchaseDate.toLocaleDateString("pt-BR")}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={styles.section}>
                        <Text style={styles.label}>Onde vai guardar?</Text>
                        <View style={{ flexDirection: "row", gap: 10 }}>
                          {LOCATIONS.map((loc) => (
                            <TouchableOpacity
                              key={loc.id}
                              style={[
                                styles.locCard,
                                location === loc.id && styles.locCardActive,
                              ]}
                              onPress={() => setLocation(loc.id)}
                            >
                              <Ionicons
                                name={loc.icon as any}
                                size={24}
                                color={location === loc.id ? "#FFF" : "#666"}
                              />
                              <Text
                                style={[
                                  styles.locText,
                                  location === loc.id && styles.locTextActive,
                                ]}
                              >
                                {loc.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    </>
                  )}
                  <View style={{ height: 50 }} />
                </ScrollView>
              </KeyboardAvoidingView>
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    !selectedProduct && { backgroundColor: "#ccc" },
                  ]}
                  onPress={handleSave}
                  disabled={!selectedProduct}
                >
                  <Text style={styles.saveText}>
                    {editingItemId
                      ? "Salvar Alterações"
                      : "Adicionar ao Estoque"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* DATE PICKER GENÉRICO */}
        {showDatePicker && (
          <DateTimePicker
            value={activeDateField === "expiry" ? expiry : purchaseDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleDateChange}
          />
        )}
        {showDatePicker && Platform.OS === "ios" && (
          <Modal transparent animationType="fade">
            <View style={styles.iosDateOverlay}>
              <View style={styles.iosDateContent}>
                <Text style={styles.iosDateTitle}>
                  {activeDateField === "expiry"
                    ? "Data de Vencimento"
                    : "Data da Compra"}
                </Text>
                <DateTimePicker
                  value={activeDateField === "expiry" ? expiry : purchaseDate}
                  mode="date"
                  display="inline"
                  onChange={(_, d) =>
                    d &&
                    (activeDateField === "expiry"
                      ? setExpiry(d)
                      : setPurchaseDate(d))
                  }
                />
                <TouchableOpacity
                  onPress={() => setShowDatePicker(false)}
                  style={styles.iosDateBtn}
                >
                  <Text style={styles.iosDateText}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        <AlertModal
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          onCancel={closeAlert}
          onConfirm={alertConfig.onConfirm}
          confirmText={alertConfig.type === "danger" ? "Excluir" : "Confirmar"}
        />
        <InventoryDetailsModal
          visible={showDetailModal}
          item={detailItem}
          onClose={() => setShowDetailModal(false)}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f2f7" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchBox: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e5ea",
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: "#333" },
  filters: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e5ea",
  },
  filterChipActive: { backgroundColor: "#007AFF", borderColor: "#007AFF" },
  filterText: { fontWeight: "600", color: "#666" },
  filterTextActive: { color: "white" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalBackdrop: { flex: 1 },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "85%",
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: { fontSize: 20, fontWeight: "bold" },
  closeBtn: { padding: 5, backgroundColor: "#f2f2f7", borderRadius: 20 },
  modalBody: { flex: 1, padding: 20 },
  modalFooter: { padding: 20, borderTopWidth: 1, borderTopColor: "#f0f0f0" },
  saveBtn: {
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  saveText: { color: "white", fontSize: 18, fontWeight: "bold" },
  scanBtnMini: {
    backgroundColor: "#333",
    borderRadius: 12,
    width: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedProductCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  selectedImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: "#FFF",
  },
  placeholderImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedTitle: { fontSize: 16, fontWeight: "bold", color: "#333" },
  selectedSubtitle: { fontSize: 12, color: "#666" },
  label: { fontSize: 13, fontWeight: "600", color: "#666", marginBottom: 6 },
  section: { marginBottom: 20 },
  row: { flexDirection: "row", gap: 15, marginBottom: 20 },
  qtyContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    padding: 4,
  },
  qtyBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  qtyInput: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "bold" },
  totalHint: {
    fontSize: 11,
    color: "#007AFF",
    marginTop: 5,
    fontWeight: "600",
  },
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
    padding: 12,
    borderRadius: 12,
    height: 48,
  },
  dateText: { marginLeft: 8, fontSize: 14, color: "#333", fontWeight: "500" },
  locCard: {
    flex: 1,
    alignItems: "center",
    padding: 15,
    borderRadius: 12,
    backgroundColor: "#F2F2F7",
    gap: 5,
  },
  locCardActive: { backgroundColor: "#007AFF" },
  locText: { fontSize: 12, fontWeight: "600", color: "#666" },
  locTextActive: { color: "#FFF" },
  iosDateOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  iosDateContent: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 20,
    width: "80%",
    alignItems: "center",
  },
  iosDateTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  iosDateBtn: { marginTop: 10, padding: 10 },
  iosDateText: { color: "#007AFF", fontSize: 18, fontWeight: "bold" },
  cameraContainer: { flex: 1, backgroundColor: "black" },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    paddingBottom: 50,
    alignItems: "center",
  },
  closeCameraButton: {
    backgroundColor: "rgba(255, 0, 0, 0.8)",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
});
