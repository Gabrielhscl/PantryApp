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

import { ShoppingRepository } from "@/repositories/shoppingRepository";
import { ProductRepository } from "@/repositories/productRepository";
import { InventoryRepository } from "@/repositories/inventoryRepository";
import { ProductService } from "@/services/productService";
import { SyncService } from "@/services/SyncService"; // --- IMPORT NOVO
import { useAuth } from "@/contexts/AuthContext"; // --- IMPORT NOVO
import { useShoppingList } from "@/hooks/useShoppingList";
import { useToast } from "@/contexts/ToastContext";
import { COLORS, SPACING, RADIUS } from "@/constants/theme";
import { Product } from "@/types";

export default function ShoppingListScreen({ navigation }: any) {
  const { user } = useAuth(); // --- NOVO: PEGA O UTILIZADOR
  const { items, refresh, toggleItem, removeItem } = useShoppingList();
  const { showToast } = useToast();

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
  const [price, setPrice] = useState("");
  const [inputMode, setInputMode] = useState<"pack" | "measure">("pack");

  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
      loadCatalog();
    }, [refresh]),
  );

  const loadCatalog = async () => {
    try {
      const products = await ProductRepository.findAll();
      setCatalog(products);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleMode = (newMode: "pack" | "measure") => {
    if (newMode === inputMode) return;
    if (
      selectedProduct &&
      selectedProduct.packSize &&
      selectedProduct.packSize > 0
    ) {
      const currentQty = parseFloat(quantity.replace(",", ".")) || 0;
      const currentPrice =
        parseFloat(price.replace(/\./g, "").replace(",", ".")) || 0;

      if (newMode === "measure") {
        const newWeight = currentQty * selectedProduct.packSize;
        setQuantity(
          Number.isInteger(newWeight)
            ? String(newWeight)
            : newWeight.toFixed(2),
        );
        const totalPrc = currentQty * currentPrice;
        setPrice(formatCurrency((totalPrc * 100).toFixed(0)));
      } else if (newMode === "pack") {
        const newUnities = currentQty / selectedProduct.packSize;
        setQuantity(
          Number.isInteger(newUnities)
            ? String(newUnities)
            : newUnities.toFixed(2),
        );
        const unitPrc = newUnities > 0 ? currentPrice / newUnities : 0;
        setPrice(formatCurrency((unitPrc * 100).toFixed(0)));
      }
    }
    setInputMode(newMode);
  };

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

  const formatCurrency = (value: string) => {
    let numericValue = value.replace(/\D/g, "");
    if (!numericValue) return "";
    const number = (parseInt(numericValue, 10) / 100).toFixed(2);
    return number.replace(".", ",").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
  };

  const handlePriceChange = (text: string) => {
    setPrice(formatCurrency(text));
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
          product = all.find((p) => p.id === newId) || null;
          setCatalog(all);
          
          if (user) SyncService.notifyChanges(user.id); // --- SYNC AUTO
          
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

  // --- FUNÇÃO COM SYNC AUTO
  const handleSave = async () => {
    if (!query.trim() && !selectedProduct)
      return showToast("Selecione um produto.", "error");

    const qtyInput = parseFloat(quantity.replace(",", ".")) || 0;
    const cleanPrice = price.replace(/\./g, "").replace(",", ".");
    const priceInput = parseFloat(cleanPrice) || 0;

    let finalQuantity = qtyInput;
    let finalUnit = selectedProduct?.defaultUnit || "un";
    let totalMoney = 0;

    if (inputMode === "pack") {
      totalMoney = qtyInput * priceInput;
      if (selectedProduct?.packSize && selectedProduct.packSize > 0) {
        finalQuantity = qtyInput * selectedProduct.packSize;
        finalUnit = selectedProduct.packUnit || selectedProduct.defaultUnit;
      } else {
        finalQuantity = qtyInput;
        finalUnit = "un";
      }
    } else {
      totalMoney = priceInput;
      finalQuantity = qtyInput;
      finalUnit =
        selectedProduct?.packUnit || selectedProduct?.defaultUnit || "un";
    }

    let saveCategory = selectedProduct?.category || "Outros";
    if (editingItemId) {
      const oldItem = items.find((i) => i.id === editingItemId);
      if (oldItem && oldItem.category && oldItem.category.includes("|")) {
        const [realCat, recipeName] = oldItem.category.split("|");
        saveCategory = `${saveCategory}|${recipeName}`;
      }
    }

    const data = {
      productId: selectedProduct?.id || null,
      name: selectedProduct?.name || query,
      quantity: finalQuantity,
      unit: finalUnit,
      category: saveCategory,
      price: totalMoney,
    };

    try {
      if (editingItemId)
        await ShoppingRepository.updateItem(editingItemId, data);
      else await ShoppingRepository.addItem(data);
      
      if (user) SyncService.notifyChanges(user.id); // --- SYNC AUTO
      
      await refresh();
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

    if (originalProduct) {
      setSelectedProduct(originalProduct);
      if (originalProduct.packSize && originalProduct.packSize > 0) {
        const unities = normalizedQuantity / originalProduct.packSize;
        setQuantity(
          Number.isInteger(unities) ? String(unities) : unities.toFixed(2),
        );
        setInputMode("pack");

        if (item.price && item.price > 0) {
          const unitPrice = item.price / unities;
          setPrice(formatCurrency((unitPrice * 100).toFixed(0)));
        } else setPrice("");
      } else {
        setQuantity(String(normalizedQuantity));
        setInputMode("pack");
        if (item.price && item.price > 0)
          setPrice(
            formatCurrency(
              ((item.price / normalizedQuantity) * 100).toFixed(0),
            ),
          );
        else setPrice("");
      }
    } else {
      setSelectedProduct(null);
      setQuantity(String(normalizedQuantity));
      setInputMode("pack");
      if (item.price && item.price > 0)
        setPrice(
          formatCurrency(((item.price / normalizedQuantity) * 100).toFixed(0)),
        );
      else setPrice("");
    }

    setModalVisible(true);
  };

  // --- FUNÇÃO COM SYNC AUTO
  const confirmFinishShopping = async (checkedItems: any[]) => {
    for (const item of checkedItems) {
      const prod = catalog.find((p) => p.id === item.productId);
      const loc = prod?.defaultLocation || "pantry";

      await InventoryRepository.createItem({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        location: loc,
        expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      });
      await ShoppingRepository.deleteItem(item.id);
    }
    
    if (user) SyncService.notifyChanges(user.id); // --- SYNC AUTO
    
    await refresh();
    setAlertConfig((prev) => ({ ...prev, visible: false }));
    showToast("Compras guardadas no stock!", "success");
  };

  const handleFinishShoppingClick = () => {
    const checkedItems = items.filter((i) => i.isChecked);
    if (checkedItems.length === 0)
      return showToast(
        "Marque os itens comprados antes de finalizar.",
        "warning",
      );

    const totalSpent = checkedItems.reduce(
      (acc, item) => acc + (item.price || 0),
      0,
    );

    setAlertConfig({
      visible: true,
      title: "Finalizar Compras",
      message: `Irá mover ${checkedItems.length} itens para o seu stock.\n\nTotal Gasto: R$ ${totalSpent.toFixed(2).replace(".", ",")}`,
      type: "info",
      confirmText: "Sim, Guardar",
      onConfirm: () => confirmFinishShopping(checkedItems),
    });
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingItemId(null);
    setQuery("");
    setSelectedProduct(null);
    setQuantity("1");
    setPrice("");
  };

  const availableFilters = new Set<string>();
  items.forEach((item) => {
    const cat = item.category || "Outros";
    if (cat.includes("|")) {
      const [realCat, recipeName] = cat.split("|");
      availableFilters.add(realCat);
      availableFilters.add(recipeName); 
    } else {
      availableFilters.add(cat);
    }
  });
  const filterTabs = Array.from(availableFilters).sort();

  const filteredItems = items.filter((item) => {
    if (!activeFilter) return true; 

    const cat = item.category || "Outros";
    if (cat.includes("|")) {
      const [realCat, recipeName] = cat.split("|");
      return realCat === activeFilter || recipeName === activeFilter;
    }
    return cat === activeFilter;
  });

  const grouped = filteredItems.reduce((acc: any, item: any) => {
    let displayCat = item.category || "Outros";

    if (displayCat.includes("|")) {
      displayCat = displayCat.split("|")[0];
    }

    if (!acc[displayCat]) {
      acc[displayCat] = { items: [], categoryTotal: 0 };
    }
    acc[displayCat].items.push(item);
    acc[displayCat].categoryTotal += item.price || 0;
    return acc;
  }, {});

  const sections = Object.keys(grouped).map((key) => ({
    title: key,
    data: grouped[key].items,
    total: grouped[key].categoryTotal,
  }));

  const listTotal = filteredItems.reduce(
    (acc, item) => acc + (item.price || 0),
    0,
  );

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
    const prc = parseFloat(price.replace(/\./g, "").replace(",", ".")) || 0;

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

    const totalMoney = inputMode === "pack" ? qty * prc : prc;

    return (
      <View style={styles.previewContainer}>
        <View style={styles.previewCol}>
          <Text style={styles.calcLabel}>Quantidade Final:</Text>
          <Text style={styles.calcValue}>
            {displayTotalQty} {displayUnit}
          </Text>
          {subInfo ? <Text style={styles.calcSub}>{subInfo}</Text> : null}
        </View>

        <View style={[styles.previewCol, { alignItems: "flex-end" }]}>
          <Text style={styles.calcLabel}>Total (R$):</Text>
          <Text style={styles.calcMoney}>
            R$ {totalMoney.toFixed(2).replace(".", ",")}
          </Text>
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

  const checkedCount = items.filter((i) => i.isChecked).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Lista de Compras"
        subtitle={
          listTotal > 0
            ? `Total: R$ ${listTotal.toFixed(2).replace(".", ",")}`
            : `${items.length} itens planeados`
        }
      />

      {filterTabs.length > 0 && (
        <View style={styles.filtersWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScroll}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                activeFilter === null && styles.filterChipActive,
              ]}
              onPress={() => setActiveFilter(null)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === null && styles.filterChipTextActive,
                ]}
              >
                Todas as Compras
              </Text>
            </TouchableOpacity>

            {filterTabs.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.filterChip,
                  activeFilter === tab && styles.filterChipActive,
                ]}
                onPress={() => setActiveFilter(tab)}
              >
                {![
                  "Grãos",
                  "Massas",
                  "Laticínios",
                  "Carnes",
                  "Frutas",
                  "Legumes",
                  "Bebidas",
                  "Molhos",
                  "Doces",
                  "Padaria",
                  "Limpeza",
                  "Outros",
                ].includes(tab) && (
                  <Ionicons
                    name="restaurant-outline"
                    size={14}
                    color={
                      activeFilter === tab
                        ? COLORS.primary
                        : COLORS.text.secondary
                    }
                    style={{ marginRight: 4 }}
                  />
                )}
                <Text
                  style={[
                    styles.filterChipText,
                    activeFilter === tab && styles.filterChipTextActive,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 180 }}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <>
            <TouchableOpacity
              style={styles.templateBanner}
              activeOpacity={0.9}
              onPress={() => navigation.navigate("Templates")}
            >
              <View style={styles.bannerIcon}>
                <Ionicons name="list" size={24} color={COLORS.text.light} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>As Minhas Listas Fixas</Text>
                <Text style={styles.bannerSub}>
                  Gira as suas listas recorrentes...
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={COLORS.text.light}
                opacity={0.8}
              />
            </TouchableOpacity>

            {listTotal > 0 && (
              <View style={styles.dashboardCard}>
                <View>
                  <Text style={styles.dashboardLabel}>
                    Valor Estimado da Compra
                  </Text>
                  <Text style={styles.dashboardValue}>
                    R$ {listTotal.toFixed(2).replace(".", ",")}
                  </Text>
                </View>
                <View style={styles.dashboardIconBox}>
                  <Ionicons
                    name="wallet-outline"
                    size={24}
                    color={COLORS.primary}
                  />
                </View>
              </View>
            )}
          </>
        }
        renderSectionHeader={({ section: { title, total } }) => (
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {total > 0 && (
              <View style={styles.sectionTotalBadge}>
                <Text style={styles.sectionTotalText}>
                  R$ {total.toFixed(2).replace(".", ",")}
                </Text>
              </View>
            )}
          </View>
        )}
        renderItem={({ item }) => (
          <ShoppingItemCard
            item={item}
            // --- SYNC AUTO NO TOGGLE
            onToggle={async () => {
              await toggleItem(item.id, item.isChecked);
              if (user) SyncService.notifyChanges(user.id);
            }}
            onEdit={() => handleEdit(item)}
            // --- SYNC AUTO AO APAGAR
            onDelete={() => {
              setAlertConfig({
                visible: true,
                title: "Remover Item",
                message: `Tem certeza que quer apagar ${item.name} da lista?`,
                type: "danger",
                confirmText: "Sim, Excluir",
                onConfirm: async () => {
                  await removeItem(item.id);
                  if (user) SyncService.notifyChanges(user.id);
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
                name="cart-outline"
                size={40}
                color={COLORS.text.secondary}
              />
            </View>
            <Text style={styles.emptyText}>Lista vazia</Text>
            <Text style={styles.emptySub}>
              Adicione itens ou use as suas listas fixas.
            </Text>
          </View>
        }
      />

      <FloatingButton
        onPress={() => setModalVisible(true)}
        style={{ bottom: 110 }}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.finishBtn,
            checkedCount === 0 && styles.finishBtnDisabled,
          ]}
          onPress={handleFinishShoppingClick}
          disabled={checkedCount === 0}
        >
          <View style={styles.finishInfo}>
            <Text style={styles.finishText}>Finalizar Compras</Text>
            {checkedCount > 0 && (
              <Text style={styles.finishSub}>
                {checkedCount} itens selecionados
              </Text>
            )}
          </View>
          <View style={styles.arrowCircle}>
            <Ionicons
              name="arrow-forward"
              size={20}
              color={checkedCount > 0 ? COLORS.primary : COLORS.text.secondary}
            />
          </View>
        </TouchableOpacity>
      </View>

      <BottomSheetModal
        visible={modalVisible}
        onClose={closeModal}
        title={editingItemId ? "Editar Item" : "Adicionar à Lista"}
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
                  data={catalog}
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
          <View style={{ flex: 1 }}>
            <CustomInput
              label={
                inputMode === "pack" ? "Preço Unit (R$)" : "Preço Total (R$)"
              }
              value={price}
              onChangeText={handlePriceChange}
              keyboardType="numeric"
              placeholder="0,00"
              style={{ marginBottom: 0 }}
            />
          </View>
        </View>

        {getCalculationPreview()}

        <PrimaryButton
          title={editingItemId ? "Guardar Alterações" : "Adicionar à Lista"}
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

  filtersWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.background,
  },
  filtersScroll: {
    paddingHorizontal: SPACING.lg,
    gap: 8,
    alignItems: "center",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary + "15",
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text.secondary,
  },
  filterChipTextActive: { color: COLORS.primary, fontWeight: "700" },

  templateBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  bannerTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text.light },
  bannerSub: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 },

  dashboardCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.card,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 5,
  },
  dashboardLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  dashboardValue: { fontSize: 24, fontWeight: "800", color: COLORS.primary },
  dashboardIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + "15",
    justifyContent: "center",
    alignItems: "center",
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
  sectionTotalBadge: {
    backgroundColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  sectionTotalText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text.primary,
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

  footer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    padding: SPACING.lg,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  finishBtn: {
    backgroundColor: COLORS.text.primary,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  finishBtnDisabled: { backgroundColor: COLORS.border, shadowOpacity: 0 },
  finishInfo: { flex: 1 },
  finishText: { color: COLORS.text.light, fontSize: 17, fontWeight: "700" },
  finishSub: { color: "#AAA", fontSize: 12, marginTop: 2 },
  arrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    justifyContent: "center",
    alignItems: "center",
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
  calcMoney: { fontSize: 18, color: COLORS.status.success, fontWeight: "800" },
  calcSub: { fontSize: 11, color: COLORS.text.secondary, marginTop: 2 },
});