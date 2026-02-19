import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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

import { db } from "@/database/db";
import { templateItems } from "@/database/schema";
import { ProductRepository } from "@/repositories/productRepository";
import { ProductService } from "@/services/productService";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "@/contexts/ToastContext";
import { COLORS, SPACING, RADIUS } from "@/constants/theme";
import { Product } from "@/types";

export default function TemplateDetailScreen({ route, navigation }: any) {
  // Recebe o ID e o Nome da lista vindos do ecrã anterior de forma segura
  const templateId = route?.params?.templateId;
  const templateName = route?.params?.templateName || "Lista Fixa";

  const { showToast } = useToast();

  const [items, setItems] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "danger" as any,
    onConfirm: () => {},
    confirmText: "Confirmar",
  });

  const [catalog, setCatalog] = useState<Product[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [quantity, setQuantity] = useState("1");
  const [inputMode, setInputMode] = useState<"pack" | "measure">("pack");

  const loadItems = useCallback(async () => {
    // 1. ESCUDO DE PROTEÇÃO EXTREMA: Só avança se for uma string válida e com conteúdo
    if (
      !templateId ||
      typeof templateId !== "string" ||
      templateId.trim() === ""
    ) {
      return;
    }

    try {
      // 2. Tentar executar a query
      const data = await db
        .select()
        .from(templateItems)
        .where(eq(templateItems.templateId, String(templateId))) // Força para String para garantir que o Drizzle aceita
        .all();

      setItems(data || []);
    } catch (e: any) {
      console.error(
        "Erro SQL ao tentar buscar itens do template:",
        e.message || e,
      );
    }
  }, [templateId]);

  const loadCatalog = async () => {
    try {
      const products = await ProductRepository.findAll();
      setCatalog(products);
    } catch (e) {
      console.error(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadItems();
      loadCatalog();
    }, [loadItems]),
  );

  useEffect(() => {
    if (
      selectedProduct &&
      selectedProduct.packSize &&
      selectedProduct.packSize > 0
    ) {
      setInputMode("pack");
    } else {
      setInputMode("pack");
    }
  }, [selectedProduct]);

  const handleToggleMode = (newMode: "pack" | "measure") => {
    if (newMode === inputMode) return;

    if (
      selectedProduct &&
      selectedProduct.packSize &&
      selectedProduct.packSize > 0
    ) {
      const currentQty = parseFloat(quantity.replace(",", ".")) || 0;

      if (newMode === "measure") {
        const newWeight = currentQty * selectedProduct.packSize;
        setQuantity(
          Number.isInteger(newWeight)
            ? String(newWeight)
            : newWeight.toFixed(2),
        );
      } else if (newMode === "pack") {
        const newUnities = currentQty / selectedProduct.packSize;
        setQuantity(
          Number.isInteger(newUnities)
            ? String(newUnities)
            : newUnities.toFixed(2),
        );
      }
    }

    setInputMode(newMode);
  };

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
            defaultLocation: "pantry",
            defaultUnit: info.packUnit || "un",
            packSize: info.packSize,
            packUnit: info.packUnit,
            allergens: info.allergens,
          });
          const all = await ProductRepository.findAll();
          // CORREÇÃO DO ERRO DE TIPO: Garante que product nunca é undefined (usa null se não achar)
          product = all.find((p) => p.id === newId) || null;
          setCatalog(all);
          showToast("Produto adicionado ao catálogo!", "success");
        } else {
          return showToast("Produto não encontrado.", "error");
        }
      } catch (e) {
        return showToast("Falha na leitura.", "error");
      }
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
      return showToast("Selecione um produto.", "error");
    }

    const qtyInput = parseFloat(quantity.replace(",", ".")) || 0;

    let finalQuantity = qtyInput;
    let finalUnit = selectedProduct?.defaultUnit || "un";

    if (inputMode === "pack") {
      if (selectedProduct?.packSize && selectedProduct.packSize > 0) {
        finalQuantity = qtyInput * selectedProduct.packSize;
        finalUnit = selectedProduct.packUnit || selectedProduct.defaultUnit;
      } else {
        finalQuantity = qtyInput;
        finalUnit = "un";
      }
    } else {
      finalQuantity = qtyInput;
      finalUnit =
        selectedProduct?.packUnit || selectedProduct?.defaultUnit || "un";
    }

    try {
      if (editingItemId) {
        await db
          .update(templateItems)
          .set({
            name: selectedProduct?.name || query,
            quantity: finalQuantity,
            unit: finalUnit,
            category: selectedProduct?.category || "Outros",
          })
          .where(eq(templateItems.id, editingItemId));
        showToast("Item atualizado!", "success");
      } else {
        await db.insert(templateItems).values({
          id: uuidv4(),
          templateId: templateId,
          productId: selectedProduct?.id || null,
          name: selectedProduct?.name || query,
          quantity: finalQuantity,
          unit: finalUnit,
          category: selectedProduct?.category || "Outros",
        });
        showToast("Adicionado à lista fixa!", "success");
      }
      await loadItems();
      closeModal();
    } catch (e) {
      showToast("Erro ao guardar item", "error");
    }
  };

  const handleEdit = (item: any) => {
    setEditingItemId(item.id);
    setQuery(item.name);

    const originalProduct = catalog.find((p) => p.id === item.productId);

    let normalizedQuantity = item.quantity;
    const itemUnit = item.unit?.toLowerCase();
    const productUnit = (
      originalProduct?.packUnit ||
      originalProduct?.defaultUnit ||
      "un"
    ).toLowerCase();

    if (itemUnit === "kg" && productUnit === "g")
      normalizedQuantity = item.quantity * 1000;
    else if (itemUnit === "l" && productUnit === "ml")
      normalizedQuantity = item.quantity * 1000;
    else if (itemUnit === "g" && productUnit === "kg")
      normalizedQuantity = item.quantity / 1000;
    else if (itemUnit === "ml" && productUnit === "l")
      normalizedQuantity = item.quantity / 1000;

    let currentInputMode = "pack";

    if (originalProduct) {
      setSelectedProduct(originalProduct);
      if (originalProduct.packSize && originalProduct.packSize > 0) {
        const unities = normalizedQuantity / originalProduct.packSize;
        setQuantity(
          Number.isInteger(unities) ? String(unities) : unities.toFixed(2),
        );
        currentInputMode = "pack";
      } else {
        setQuantity(String(normalizedQuantity));
        currentInputMode = "pack";
      }
    } else {
      setSelectedProduct(null);
      setQuantity(String(normalizedQuantity));
      currentInputMode = "pack";
    }

    setInputMode(currentInputMode as any);
    setModalVisible(true);
  };

  const removeItem = async (id: string) => {
    try {
      await db.delete(templateItems).where(eq(templateItems.id, id));
      await loadItems();
      showToast("Item removido.", "success");
    } catch (error) {
      showToast("Erro ao remover", "error");
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingItemId(null);
    setQuery("");
    setSelectedProduct(null);
    setQuantity("1");
  };

  const grouped = items.reduce((acc: any, item: any) => {
    const cat = item.category || "Outros";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const sections = Object.keys(grouped).map((key) => ({
    title: key,
    data: grouped[key],
  }));

  const getLocationInfo = (loc: string) => {
    switch (loc) {
      case "fridge":
        return COLORS.locations.fridge;
      case "freezer":
        return COLORS.locations.freezer;
      default:
        return COLORS.locations.pantry;
    }
  };

  const getLocationLabel = (loc: string) => {
    switch (loc) {
      case "fridge":
        return "Geladeira";
      case "freezer":
        return "Freezer";
      default:
        return "Armário";
    }
  };

  const getCalculationPreview = () => {
    if (!selectedProduct || !quantity) return null;

    const qty = parseFloat(quantity.replace(",", ".")) || 0;

    let displayTotalQty = qty;
    let displayUnit = selectedProduct.defaultUnit || "un";
    let subInfo = "";

    if (
      inputMode === "pack" &&
      selectedProduct.packSize &&
      selectedProduct.packSize > 0
    ) {
      displayTotalQty = qty * selectedProduct.packSize;
      displayUnit = selectedProduct.packUnit || selectedProduct.defaultUnit;
      subInfo = `(${qty}x ${selectedProduct.packSize}${selectedProduct.packUnit})`;

      if (displayUnit === "g" && displayTotalQty >= 1000) {
        displayTotalQty = displayTotalQty / 1000;
        displayUnit = "kg";
      }
      if (displayUnit === "ml" && displayTotalQty >= 1000) {
        displayTotalQty = displayTotalQty / 1000;
        displayUnit = "L";
      }
    }

    return (
      <View style={styles.previewContainer}>
        <View style={styles.previewCol}>
          <Text style={styles.calcLabel}>Quantidade Registada:</Text>
          <Text style={styles.calcValue}>
            {displayTotalQty} {displayUnit}
          </Text>
          {subInfo ? <Text style={styles.calcSub}>{subInfo}</Text> : null}
        </View>
      </View>
    );
  };

  if (isScanning) {
    if (!permission?.granted)
      return (
        <View style={styles.center}>
          <TouchableOpacity onPress={requestPermission} style={styles.permBtn}>
            <Text style={{ color: COLORS.text.light }}>Permitir Câmara</Text>
          </TouchableOpacity>
        </View>
      );
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={handleBarCodeScanned}
        />
        <TouchableOpacity
          onPress={() => setIsScanning(false)}
          style={styles.closeCamera}
        >
          <Ionicons name="close" size={30} color={COLORS.text.light} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* CABEÇALHO COM O NOME DA LISTA */}
      <ScreenHeader
        title={templateName}
        subtitle={`${items.length} itens nesta lista`}
        icon="chevron-back"
        onIconPress={() => navigation.goBack()}
      />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 180 }}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <ShoppingItemCard
            item={item}
            // Nas listas fixas não usamos o checkbox, por isso onToggle não faz nada
            onToggle={() => {}}
            onEdit={() => handleEdit(item)}
            onDelete={() => {
              setAlertConfig({
                visible: true,
                title: "Remover Item",
                message: `Remover ${item.name} da lista ${templateName}?`,
                type: "danger",
                confirmText: "Sim, Remover",
                onConfirm: () => {
                  removeItem(item.id);
                  setAlertConfig((prev) => ({ ...prev, visible: false }));
                },
              });
            }}
          />
        )}
        renderSectionFooter={() => (
          <View style={{ marginBottom: SPACING.lg }} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="add-circle-outline"
                size={40}
                color={COLORS.text.secondary}
              />
            </View>
            <Text style={styles.emptyText}>Lista Limpa</Text>
            <Text style={styles.emptySub}>
              Comece a adicionar os itens desta lista.
            </Text>
          </View>
        }
      />

      <FloatingButton onPress={() => setModalVisible(true)} />

      <BottomSheetModal
        visible={modalVisible}
        onClose={closeModal}
        title={editingItemId ? "Editar Item" : "Adicionar à Lista Fixa"}
      >
        {editingItemId ? (
          <View style={{ marginBottom: SPACING.md }}>
            <Text style={styles.label}>Produto</Text>
            <Text style={styles.editingNameText}>{query}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.label}>Procurar Produto</Text>
            <View style={styles.searchRow}>
              <View style={{ flex: 1 }}>
                <Autocomplete
                  placeholder="Ex: Leite, Arroz..."
                  items={catalog} // CORREÇÃO: USANDO items EM VEZ DE data
                  value={query}
                  onChangeText={setQuery}
                  onSelect={selectProduct}
                  closeOnSelect={false}
                />
              </View>
              <TouchableOpacity
                style={styles.barcodeBtn}
                onPress={() => setIsScanning(true)}
              >
                <Ionicons
                  name="barcode-outline"
                  size={24}
                  color={COLORS.text.light}
                />
              </TouchableOpacity>
            </View>
          </>
        )}

        {selectedProduct && (
          <View style={styles.productDetailCard}>
            <View style={styles.prodHeader}>
              <Text style={styles.prodName}>{selectedProduct.name}</Text>
              <Text style={styles.prodBrand}>
                {selectedProduct.brand || "Geral"}
              </Text>
            </View>
            <View style={styles.prodRow}>
              {selectedProduct.packSize && selectedProduct.packSize > 0 && (
                <View style={styles.badge}>
                  <Ionicons
                    name="cube"
                    size={12}
                    color={COLORS.text.secondary}
                  />
                  <Text style={styles.badgeText}>
                    {selectedProduct.packSize}
                    {selectedProduct.packUnit} / un
                  </Text>
                </View>
              )}
              {(() => {
                const loc = getLocationInfo(
                  selectedProduct.defaultLocation || "pantry",
                );
                const label = getLocationLabel(
                  selectedProduct.defaultLocation || "pantry",
                );
                return (
                  <View style={[styles.badge, { backgroundColor: loc.bg }]}>
                    <Ionicons name="location" size={12} color={loc.icon} />
                    <Text style={[styles.badgeText, { color: loc.icon }]}>
                      {label}
                    </Text>
                  </View>
                );
              })()}
            </View>
          </View>
        )}

        {selectedProduct && (
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                inputMode === "pack" && styles.toggleBtnActive,
              ]}
              onPress={() => handleToggleMode("pack")}
            >
              <Text
                style={[
                  styles.toggleText,
                  inputMode === "pack" && styles.toggleTextActive,
                ]}
              >
                Por Unidade
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                inputMode === "measure" && styles.toggleBtnActive,
              ]}
              onPress={() => handleToggleMode("measure")}
            >
              <Text
                style={[
                  styles.toggleText,
                  inputMode === "measure" && styles.toggleTextActive,
                ]}
              >
                Por Peso/Vol
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* NOTA: Não há campo de preço nas Listas Fixas, apenas quantidade! */}
        <View
          style={{
            flexDirection: "row",
            gap: SPACING.md,
            marginTop: SPACING.md,
          }}
        >
          <View style={{ flex: 1 }}>
            <CustomInput
              label={
                inputMode === "pack"
                  ? "Qtd (Unidades)"
                  : `Qtd (${selectedProduct?.defaultUnit || "un"})`
              }
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              placeholder="1"
              style={{ marginBottom: 0 }}
            />
          </View>
        </View>

        {getCalculationPreview()}

        <PrimaryButton
          title={
            editingItemId ? "Guardar Alterações" : "Adicionar à Lista Fixa"
          }
          onPress={handleSave}
          containerStyle={{ marginTop: SPACING.lg }}
        />
      </BottomSheetModal>

      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        confirmText={alertConfig.confirmText}
        onCancel={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
        onConfirm={alertConfig.onConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  permBtn: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: RADIUS.md,
  },
  cameraContainer: { flex: 1, backgroundColor: "#000" },
  closeCamera: {
    position: "absolute",
    top: 50,
    right: 30,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: RADIUS.xl,
    padding: 10,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginLeft: 4,
  },

  empty: { alignItems: "center", marginTop: 60, paddingHorizontal: 40 },
  emptyIcon: {
    width: 80,
    height: 80,
    backgroundColor: COLORS.border,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: "center",
    lineHeight: 20,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text.secondary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  editingNameText: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text.primary,
    backgroundColor: COLORS.input,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  searchRow: { flexDirection: "row", gap: SPACING.sm, zIndex: 10 },
  barcodeBtn: {
    backgroundColor: COLORS.text.primary,
    borderRadius: RADIUS.lg,
    width: 54,
    justifyContent: "center",
    alignItems: "center",
  },
  productDetailCard: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  prodHeader: { marginBottom: 8 },
  prodName: { fontSize: 16, fontWeight: "700", color: COLORS.text.primary },
  prodBrand: { fontSize: 12, color: COLORS.text.secondary },
  prodRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 8 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  badgeText: { fontSize: 11, fontWeight: "600", color: "#555" },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: 4,
    marginTop: SPACING.lg,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: RADIUS.sm,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.card,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleText: { fontSize: 13, fontWeight: "600", color: COLORS.text.secondary },
  toggleTextActive: { color: COLORS.primary },
  previewContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACING.md,
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewCol: { flex: 1 },
  calcLabel: {
    fontSize: 11,
    color: COLORS.text.secondary,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  calcValue: { fontSize: 16, color: COLORS.text.primary, fontWeight: "800" },
  calcSub: { fontSize: 11, color: COLORS.text.secondary, marginTop: 2 }, // ESTILO ADICIONADO AQUI
});
