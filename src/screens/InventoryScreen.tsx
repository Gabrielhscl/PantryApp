import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFocusEffect } from "@react-navigation/native";

import { useInventory } from "@/hooks/useInventory";
import { InventoryItemCard } from "@/components/InventoryItemCard";
import { Autocomplete } from "@/components/Autocomplete";
import { ProductService } from "@/services/productService";
import { NotificationService } from "@/services/notificationService";
import { InventoryRepository } from "@/repositories/inventoryRepository";
import { ProductRepository } from "@/repositories/productRepository";
import { SyncService } from "@/services/SyncService"; // IMPORTADO

// COMPONENTES REUTILIZÁVEIS E TEMA
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { FloatingButton } from "@/components/ui/FloatingButton";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { AlertModal } from "@/components/modals/AlertModal";
import { InventoryDetailsModal } from "@/components/modals/InventoryDetailsModal";
import { useToast } from "@/contexts/ToastContext";
import { COLORS, SPACING, RADIUS } from "@/constants/theme";
import { Product } from "@/types";
import { useNavigation } from '@react-navigation/native';
import { useAuth } from "@/contexts/AuthContext";

const LOCATIONS = [
  { id: "pantry", label: "Armário", icon: "cube-outline" },
  { id: "fridge", label: "Geladeira", icon: "thermometer-outline" },
  { id: "freezer", label: "Freezer", icon: "snow-outline" },
];

export default function InventoryScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { items, filter, setFilter, actions, refresh } = useInventory();
  const { showToast } = useToast();

  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDateField, setActiveDateField] = useState<"expiry" | "purchase" | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [expiry, setExpiry] = useState(new Date());
  const [purchaseDate, setPurchaseDate] = useState(new Date());
  const [location, setLocation] = useState("pantry");
  const [query, setQuery] = useState("");

  const [catalog, setCatalog] = useState<Product[]>([]);
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

  const loadAllData = useCallback(async () => {
    refresh();
    const products = await ProductRepository.findAll();
    setCatalog(products);
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, [loadAllData]),
  );

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
            allergens: info.allergens,
          });
          const allProducts = await ProductRepository.findAll();
          product = allProducts.find((p) => p.id === newId);
          showToast("Produto adicionado ao catálogo!", "success");
        } else {
          showToast("Registe este produto no catálogo primeiro.", "warning");
          return;
        }
      } catch (e) {
        showToast("Falha ao efetuar a leitura.", "error");
        return;
      }
    }
    if (product) selectProduct(product);
  };

  const selectProduct = (product: Product) => {
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
      packSize: item.packSize || 0,
      defaultUnit: item.unit,
      packUnit: item.packUnit,
    });
    setQuantity(String(item.quantity / (item.packSize || 1)));
    setLocation(item.location);
    if (item.expiryDate) setExpiry(new Date(item.expiryDate));
    if (item.createdAt) setPurchaseDate(new Date(item.createdAt));
    setModalVisible(true);
  };

  // --- DELETE COM SYNC AUTOMÁTICO ---
  const handleDelete = (id: string) => {
    showAlert(
      "Remover Item",
      "Deseja retirar este item do stock?",
      async () => {
        await actions.removeItem(id);
        if (user) SyncService.notifyChanges(user.id); // SYNC AUTO
        showToast("Item removido do stock.", "info");
        closeAlert();
      },
      "danger",
    );
  };

  // --- SAVE COM SYNC AUTOMÁTICO ---
  const handleSave = async () => {
    if (!selectedProduct) return showToast("Selecione um produto.", "error");
    if (!quantity) return showToast("Informe a quantidade.", "error");

    try {
      const qtdInput = parseFloat(quantity);
      let finalQuantity = qtdInput;
      if (selectedProduct.packSize && selectedProduct.packSize > 0) {
        finalQuantity = qtdInput * selectedProduct.packSize;
      }

      const itemData = {
        productId: selectedProduct.id,
        name: selectedProduct.name,
        quantity: finalQuantity,
        unit: selectedProduct.packUnit || selectedProduct.defaultUnit || "un",
        location,
        expiryDate: expiry,
        createdAt: purchaseDate,
      };

      if (editingItemId) {
        await InventoryRepository.updateItem(editingItemId, itemData);
        showToast("Stock atualizado!", "success");
      } else {
        await InventoryRepository.createItem(itemData);
        await NotificationService.scheduleExpiryNotification(selectedProduct.name, expiry);
        showToast("Adicionado ao stock!", "success");
      }

      // DISPARA SINCRONIZAÇÃO IMEDIATA
      if (user) {
        SyncService.notifyChanges(user.id);
      }

      setModalVisible(false);
      resetForm();
      loadAllData();
    } catch (error) {
      showToast("Falha ao guardar.", "error");
    }
  };

  const resetForm = () => {
    setEditingItemId(null);
    setSelectedProduct(null);
    setQuantity("1");
    setExpiry(new Date());
    setPurchaseDate(new Date());
    setLocation("pantry");
    setQuery("");
    setTotalDisplay("");
  };

  if (isScanning) {
    if (!permission?.granted)
      return (
        <View style={styles.center}>
          <Text>Permitir câmara?</Text>
          <TouchableOpacity onPress={requestPermission}>
            <Text style={{ color: COLORS.primary }}>Sim</Text>
          </TouchableOpacity>
        </View>
      );
    return (
      <View style={styles.cameraContainer}>
        <CameraView style={StyleSheet.absoluteFillObject} onBarcodeScanned={handleBarCodeScanned} />
        <View style={styles.cameraOverlay}>
          <TouchableOpacity onPress={() => setIsScanning(false)} style={styles.closeCameraButton}>
            <Text style={{ color: COLORS.text.light, fontWeight: "bold" }}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const displayItems = items.filter((i) => i.name.toLowerCase().includes(searchText.toLowerCase()));

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <ScreenHeader
          title="O Meu Stock"
          subtitle={`${items.length} itens no stock`}
          rightIcon="grid-outline"
          onRightIconPress={() => navigation.navigate("Products")}
        />

        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={COLORS.text.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Procurar no stock..."
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        <View style={styles.filters}>
          {["all", "fridge", "pantry", "freezer"].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f as any)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === "all" ? "Todos" : f === "fridge" ? "Geladeira" : f === "pantry" ? "Armário" : "Freezer"}
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
              onPress={() => {
                setDetailItem(item);
                setShowDetailModal(true);
              }}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
          contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 50 }}>
              <Ionicons name="basket-outline" size={60} color={COLORS.border} />
              <Text style={{ color: COLORS.text.secondary, marginTop: 10 }}>Stock vazio</Text>
            </View>
          }
        />

        <FloatingButton onPress={() => { resetForm(); setModalVisible(true); }} />

        <BottomSheetModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          title={editingItemId ? "Ajustar Item" : "Novo Item"}
        >
          <View style={styles.section}>
            {!selectedProduct ? (
              <>
                <View style={styles.searchRow}>
                  <View style={{ flex: 1 }}>
                    <Autocomplete
                      placeholder="Procurar no catálogo..."
                      data={catalog}
                      value={query}
                      onChangeText={setQuery}
                      onSelect={selectProduct}
                    />
                  </View>
                  <TouchableOpacity style={styles.scanBtnMini} onPress={() => setIsScanning(true)}>
                    <Ionicons name="barcode-outline" size={24} color={COLORS.text.light} />
                  </TouchableOpacity>
                </View>

                {catalog.length > 0 && (
                  <View style={{ marginTop: SPACING.lg }}>
                    <Text style={styles.label}>Ou selecione do registo:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 5 }}>
                      {catalog.map((p) => (
                        <TouchableOpacity key={p.id} style={styles.quickCard} onPress={() => selectProduct(p)}>
                          {p.image ? (
                            <Image source={{ uri: p.image }} style={styles.quickImg} />
                          ) : (
                            <View style={styles.quickPlaceholder}>
                              <Ionicons name="cube-outline" size={20} color={COLORS.primary} />
                            </View>
                          )}
                          <Text style={styles.quickName} numberOfLines={1}>{p.name}</Text>
                          <Text style={styles.quickBrand} numberOfLines={1}>{p.brand || "Geral"}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.productBadge}>
                <View style={styles.productInfo}>
                  {selectedProduct.image ? (
                    <Image source={{ uri: selectedProduct.image }} style={styles.miniImg} />
                  ) : (
                    <View style={styles.placeholderImg}>
                      <Ionicons name="cube" size={20} color={COLORS.primary} />
                    </View>
                  )}
                  <View>
                    <Text style={styles.productName}>{selectedProduct.name}</Text>
                    <Text style={styles.productSub}>
                      {selectedProduct.brand} {selectedProduct.packSize ? `• ${selectedProduct.packSize}${selectedProduct.packUnit}` : ""}
                    </Text>
                  </View>
                </View>
                {!editingItemId && (
                  <TouchableOpacity onPress={() => setSelectedProduct(null)}>
                    <Text style={styles.changeText}>Trocar</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {selectedProduct && (
            <>
              <View style={styles.section}>
                <Text style={styles.label}>
                  {selectedProduct.packSize && selectedProduct.packSize > 0 ? "Quantas embalagens?" : "Quantidade"}
                </Text>
                <View style={styles.qtyContainer}>
                  <TouchableOpacity
                    onPress={() => setQuantity(Math.max(0, parseFloat(quantity) - 1).toString())}
                    style={styles.qtyBtn}
                  >
                    <Ionicons name="remove" size={22} color={COLORS.primary} />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.qtyInput}
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="numeric"
                  />
                  <TouchableOpacity
                    onPress={() => setQuantity((parseFloat(quantity || "0") + 1).toString())}
                    style={styles.qtyBtn}
                  >
                    <Ionicons name="add" size={22} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
                {totalDisplay ? <Text style={styles.totalHint}>{totalDisplay}</Text> : null}
              </View>

              <View style={styles.dateGrid}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Validade</Text>
                  <TouchableOpacity onPress={() => openDatePicker("expiry")} style={styles.dateBox}>
                    <Ionicons name="calendar-outline" size={18} color={COLORS.text.secondary} />
                    <Text style={styles.dateValueText}>{expiry.toLocaleDateString("pt-BR")}</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Compra</Text>
                  <TouchableOpacity onPress={() => openDatePicker("purchase")} style={styles.dateBox}>
                    <Ionicons name="cart-outline" size={18} color={COLORS.text.secondary} />
                    <Text style={styles.dateValueText}>{purchaseDate.toLocaleDateString("pt-BR")}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>Onde será guardado?</Text>
                <View style={styles.locGrid}>
                  {LOCATIONS.map((loc) => (
                    <TouchableOpacity
                      key={loc.id}
                      style={[styles.locItem, location === loc.id && styles.locItemActive]}
                      onPress={() => setLocation(loc.id)}
                    >
                      <Ionicons
                        name={loc.icon as any}
                        size={22}
                        color={location === loc.id ? COLORS.text.light : COLORS.text.secondary}
                      />
                      <Text style={[styles.locLabel, location === loc.id && styles.locLabelActive]}>{loc.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <PrimaryButton
                title={editingItemId ? "Guardar Alterações" : "Adicionar ao Stock"}
                onPress={handleSave}
                disabled={!selectedProduct}
                containerStyle={{ marginTop: 10 }}
              />
            </>
          )}
        </BottomSheetModal>

        {showDatePicker && (
          <DateTimePicker
            value={activeDateField === "expiry" ? expiry : purchaseDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleDateChange}
          />
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
        <InventoryDetailsModal visible={showDetailModal} item={detailItem} onClose={() => setShowDetailModal(false)} />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// ... Estilos permanecem iguais

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchBox: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    marginHorizontal: SPACING.md,
    padding: 12,
    borderRadius: RADIUS.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  filters: {
    flexDirection: "row",
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: { fontWeight: "600", color: COLORS.text.secondary },
  filterTextActive: { color: COLORS.text.light },

  section: { marginBottom: SPACING.lg },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text.secondary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  searchRow: { flexDirection: "row", gap: SPACING.sm },
  scanBtnMini: {
    backgroundColor: COLORS.text.primary,
    borderRadius: RADIUS.md,
    width: 50,
    justifyContent: "center",
    alignItems: "center",
  },

  quickCard: {
    backgroundColor: COLORS.card,
    padding: 10,
    borderRadius: RADIUS.lg,
    width: 110,
    borderWidth: 1,
    borderColor: COLORS.background,
    alignItems: "center",
  },
  quickImg: { width: 50, height: 50, borderRadius: 10, marginBottom: 8 },
  quickPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickName: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text.primary,
    textAlign: "center",
  },
  quickBrand: {
    fontSize: 10,
    color: COLORS.text.secondary,
    textAlign: "center",
    marginTop: 2,
  },

  productBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  productInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  miniImg: { width: 40, height: 40, borderRadius: 8, marginRight: 12 },
  placeholderImg: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  productName: { fontSize: 16, fontWeight: "bold", color: COLORS.text.primary },
  productSub: { fontSize: 13, color: COLORS.text.secondary, marginTop: 2 },
  changeText: {
    color: COLORS.primary,
    fontWeight: "bold",
    fontSize: 14,
    marginLeft: 10,
  },

  qtyContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: 8,
  },
  qtyBtn: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  qtyInput: {
    flex: 1,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.text.primary,
  },
  totalHint: {
    textAlign: "right",
    marginTop: 8,
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 13,
  },

  dateGrid: { flexDirection: "row", gap: SPACING.md, marginBottom: SPACING.lg },
  dateBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: 8,
  },
  dateValueText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text.primary,
  },

  locGrid: { flexDirection: "row", gap: 10 },
  locItem: {
    flex: 1,
    alignItems: "center",
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: "transparent",
  },
  locItemActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  locLabel: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text.secondary,
  },
  locLabelActive: { color: COLORS.text.light },

  cameraContainer: { flex: 1, backgroundColor: "black" },
  cameraOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
    padding: 40,
  },
  closeCameraButton: {
    backgroundColor: COLORS.status.danger,
    padding: 15,
    borderRadius: RADIUS.sm,
    alignItems: "center",
  },
});
