import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
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
import { templateItems, shoppingListItems, inventoryItems } from "@/database/schema"; 
import { ProductRepository } from "@/repositories/productRepository";
import { ProductService } from "@/services/productService";
import { SyncService } from "@/services/SyncService"; 
import { useAuth } from "@/contexts/AuthContext"; 
import { supabase } from "@/lib/supabase"; // <-- IMPORTANTE: ADICIONADO AQUI
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "@/contexts/ToastContext";
import { COLORS, SPACING, RADIUS } from "@/constants/theme";
import { Product } from "@/types";

export default function TemplateDetailScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const templateId = route?.params?.templateId;
  const templateName = route?.params?.templateName || "Lista Fixa";
  
  const { showToast } = useToast();

  const [items, setItems] = useState<any[]>([]);
  
  // ESTADO PARA O FILTRO
  const [activeFilter, setActiveFilter] = useState<'all' | 'missing' | 'ok'>('all');

  const [modalVisible, setModalVisible] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const [alertConfig, setAlertConfig] = useState({
    visible: false, title: "", message: "", type: "danger" as any,
    onConfirm: () => {}, confirmText: "Confirmar",
  });

  const [catalog, setCatalog] = useState<Product[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [quantity, setQuantity] = useState("1");
  const [inputMode, setInputMode] = useState<"pack" | "measure">("pack");

  // MÁGICA DE ESTOQUE INTEGRADA NA BUSCA
  const loadItems = useCallback(async () => {
    if (!templateId || typeof templateId !== 'string' || templateId.trim() === '') return; 
    try {
      const data = await db.select().from(templateItems).where(eq(templateItems.templateId, String(templateId))).all();
      const inventory = await db.select().from(inventoryItems).all();

      const augmentedData = data.map(item => {
        let currentStock = 0;
        if (item.productId) {
           const stockItems = inventory.filter(inv => inv.productId === item.productId);
           currentStock = stockItems.reduce((acc, curr) => acc + curr.quantity, 0);
        }
        return { ...item, currentStock };
      });

      setItems(augmentedData || []);
    } catch (e: any) {
      console.error("Erro SQL:", e.message || e);
    }
  }, [templateId]);

  const loadCatalog = async () => {
    try {
      const products = await ProductRepository.findAll();
      setCatalog(products);
    } catch (e) { console.error(e); }
  };

  useFocusEffect(useCallback(() => { loadItems(); loadCatalog(); }, [loadItems]));

  useEffect(() => {
    if (selectedProduct && selectedProduct.packSize && selectedProduct.packSize > 0) setInputMode("pack");
    else setInputMode("pack");
  }, [selectedProduct]);

  const handleToggleMode = (newMode: "pack" | "measure") => {
    if (newMode === inputMode) return;
    if (selectedProduct && selectedProduct.packSize && selectedProduct.packSize > 0) {
      const currentQty = parseFloat(quantity.replace(",", ".")) || 0;
      if (newMode === "measure") {
        const newWeight = currentQty * selectedProduct.packSize;
        setQuantity(Number.isInteger(newWeight) ? String(newWeight) : newWeight.toFixed(2));
      } else if (newMode === "pack") {
        const newUnities = currentQty / selectedProduct.packSize;
        setQuantity(Number.isInteger(newUnities) ? String(newUnities) : newUnities.toFixed(2));
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
            barcode: data, name: info.name, brand: info.brand, image: info.image,
            category: "Outros", defaultLocation: "pantry", defaultUnit: info.packUnit || "un",
            packSize: info.packSize, packUnit: info.packUnit, allergens: info.allergens,
          });
          const all = await ProductRepository.findAll();
          product = all.find((p) => p.id === newId) || null;
          setCatalog(all);
          if (user) SyncService.notifyChanges(user.id); 
          showToast("Produto adicionado ao catálogo!", "success");
        } else return showToast("Produto não encontrado.", "error");
      } catch (e) { return showToast("Falha na leitura.", "error"); }
    }
    if (product) { selectProduct(product); setModalVisible(true); }
  };

  const selectProduct = (product: Product) => { setSelectedProduct(product); setQuery(product.name); };

  const handleSave = async () => {
    if (!query.trim() && !selectedProduct) return showToast("Selecione um produto.", "error");
    const qtyInput = parseFloat(quantity.replace(",", ".")) || 0;
    let finalQuantity = qtyInput;
    let finalUnit = selectedProduct?.defaultUnit || "un";

    if (inputMode === "pack") {
      if (selectedProduct?.packSize && selectedProduct.packSize > 0) {
        finalQuantity = qtyInput * selectedProduct.packSize;
        finalUnit = selectedProduct.packUnit || selectedProduct.defaultUnit;
      } else { finalQuantity = qtyInput; finalUnit = "un"; }
    } else {
      finalQuantity = qtyInput;
      finalUnit = selectedProduct?.packUnit || selectedProduct?.defaultUnit || "un";
    }

    try {
      if (editingItemId) {
        await db.update(templateItems)
          .set({
            name: selectedProduct?.name || query, quantity: finalQuantity, unit: finalUnit,
            category: selectedProduct?.category || "Outros", updatedAt: new Date(), isSynced: false
          })
          .where(eq(templateItems.id, editingItemId));
        showToast("Item atualizado!", "success");
      } else {
        await db.insert(templateItems).values({
          id: uuidv4(), templateId: templateId, productId: selectedProduct?.id || null,
          name: selectedProduct?.name || query, quantity: finalQuantity, unit: finalUnit,
          category: selectedProduct?.category || "Outros",
          createdAt: new Date(), updatedAt: new Date(), isSynced: false
        });
        showToast("Adicionado à lista fixa!", "success");
      }

      if (user) SyncService.notifyChanges(user.id); 

      await loadItems(); closeModal();
    } catch (e) { showToast("Erro ao guardar item", "error"); }
  };

  const handleEdit = (item: any) => {
    setEditingItemId(item.id); setQuery(item.name);
    const originalProduct = catalog.find((p) => p.id === item.productId);

    let normalizedQuantity = item.quantity;
    const itemUnit = item.unit?.toLowerCase();
    const productUnit = (originalProduct?.packUnit || originalProduct?.defaultUnit || "un").toLowerCase();

    if (itemUnit === "kg" && productUnit === "g") normalizedQuantity = item.quantity * 1000;
    else if (itemUnit === "l" && productUnit === "ml") normalizedQuantity = item.quantity * 1000;
    else if (itemUnit === "g" && productUnit === "kg") normalizedQuantity = item.quantity / 1000;
    else if (itemUnit === "ml" && productUnit === "l") normalizedQuantity = item.quantity / 1000;

    let currentInputMode = "pack";
    if (originalProduct) {
      setSelectedProduct(originalProduct);
      if (originalProduct.packSize && originalProduct.packSize > 0) {
        const unities = normalizedQuantity / originalProduct.packSize;
        setQuantity(Number.isInteger(unities) ? String(unities) : unities.toFixed(2));
      } else setQuantity(String(normalizedQuantity));
    } else { setSelectedProduct(null); setQuantity(String(normalizedQuantity)); }
    setInputMode(currentInputMode as any); setModalVisible(true);
  };

  const toggleItem = async (id: string, currentStatus: boolean) => {
    try {
      await db.update(templateItems).set({ isChecked: !currentStatus, updatedAt: new Date(), isSynced: false }).where(eq(templateItems.id, id));
      if (user) SyncService.notifyChanges(user.id); 
      await loadItems();
    } catch (error) { showToast("Erro ao marcar o item.", "error"); }
  };

  // --- CORREÇÃO: DELETE REMOVENDO DA NUVEM DIRETAMENTE ---
  const removeItem = async (id: string) => {
    try { 
      // 1. Apaga do SQLite
      await db.delete(templateItems).where(eq(templateItems.id, id)); 
      
      // 2. Apaga do Supabase para não voltar como fantasma
      if (user) {
        await supabase.from('template_items_v2').delete().eq('id', id);
        SyncService.notifyChanges(user.id); 
      }

      await loadItems(); 
      showToast("Item removido.", "success");
    } catch (error) { showToast("Erro ao remover", "error"); }
  };

  const closeModal = () => { setModalVisible(false); setEditingItemId(null); setQuery(""); setSelectedProduct(null); setQuantity("1"); };

  const handleAddToShoppingList = async (onlyMissing: boolean) => {
    try {
      const currentShoppingList = await db.select().from(shoppingListItems).all();
      let inventory: any[] = [];
      if (onlyMissing) inventory = await db.select().from(inventoryItems).all();

      let addedCount = 0; let updatedCount = 0; let skippedCount = 0;

      for (const item of items) {
        if (onlyMissing && item.productId) {
          const stockItems = inventory.filter(inv => inv.productId === item.productId);
          const currentStock = stockItems.reduce((acc, curr) => acc + curr.quantity, 0);
          if (currentStock >= item.quantity) { skippedCount++; continue; } 
        }

        const existingItem = currentShoppingList.find(c => 
          (item.productId && c.productId === item.productId) || 
          (!item.productId && c.name.toLowerCase() === item.name.toLowerCase())
        );

        const realCategory = item.category || "Outros";
        const compoundCategory = `${realCategory}|[Fixo] ${templateName}`;

        let qtyToAdd = item.quantity;
        if (onlyMissing && item.currentStock > 0) {
            qtyToAdd = Math.max(0, item.quantity - item.currentStock);
        }

        if (existingItem) {
          const newQuantity = existingItem.quantity + qtyToAdd;
          await db.update(shoppingListItems).set({ quantity: newQuantity, category: compoundCategory, updatedAt: new Date(), isSynced: false }).where(eq(shoppingListItems.id, existingItem.id));
          updatedCount++;
        } else {
          await db.insert(shoppingListItems).values({
            id: uuidv4(), productId: item.productId, name: item.name, quantity: qtyToAdd,
            unit: item.unit, category: compoundCategory, price: 0, isChecked: false, createdAt: new Date(), updatedAt: new Date(), isSynced: false
          });
          addedCount++;
        }
      }

      if ((addedCount > 0 || updatedCount > 0) && user) {
        SyncService.notifyChanges(user.id); 
      }

      let msg = `${addedCount} novos e ${updatedCount} somados no Carrinho!`;
      if (onlyMissing && skippedCount > 0) msg += `\n${skippedCount} ignorados (já tinha em casa).`;
      else if (onlyMissing && addedCount === 0 && updatedCount === 0) msg = "Todos os itens já estão no estoque em casa!";

      showToast(msg, "success");
      setActionSheetVisible(false);
    } catch (e) { showToast("Erro ao adicionar à lista de compras.", "error"); }
  };

  const formatQuantityFriendly = (qty: number, unit: string) => {
      let dQty = qty; let dUnit = unit.toLowerCase();
      if (dUnit === 'g' && qty >= 1000) { dQty = qty / 1000; dUnit = 'kg'; }
      if (dUnit === 'ml' && qty >= 1000) { dQty = qty / 1000; dUnit = 'L'; }
      return `${Number.isInteger(dQty) ? dQty : dQty.toFixed(2)}${dUnit}`;
  };

  // FILTRO INTELIGENTE ANTES DO AGRUPAMENTO
  const filteredItems = items.filter(item => {
      const missing = Math.max(0, item.quantity - (item.currentStock || 0));
      const isMissing = missing > 0;
      
      if (activeFilter === 'missing') return isMissing;
      if (activeFilter === 'ok') return !isMissing;
      return true; // 'all'
  });

  const grouped = filteredItems.reduce((acc: any, item: any) => {
    const cat = item.category || "Outros";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const sections = Object.keys(grouped).map((key) => ({ title: key, data: grouped[key] }));

  const getLocationInfo = (loc: string) => {
    switch (loc) { case "fridge": return COLORS.locations.fridge; case "freezer": return COLORS.locations.freezer; default: return COLORS.locations.pantry; }
  };
  const getLocationLabel = (loc: string) => {
    switch (loc) { case "fridge": return "Geladeira"; case "freezer": return "Freezer"; default: return "Armário"; }
  };
  const getCalculationPreview = () => {
    if (!selectedProduct || !quantity) return null;
    const qty = parseFloat(quantity.replace(",", ".")) || 0;
    let displayTotalQty = qty; let displayUnit = selectedProduct.defaultUnit || "un"; let subInfo = "";
    if (inputMode === "pack" && selectedProduct.packSize && selectedProduct.packSize > 0) {
      displayTotalQty = qty * selectedProduct.packSize;
      displayUnit = selectedProduct.packUnit || selectedProduct.defaultUnit;
      subInfo = `(${qty}x ${selectedProduct.packSize}${selectedProduct.packUnit})`;
      if (displayUnit === "g" && displayTotalQty >= 1000) { displayTotalQty = displayTotalQty / 1000; displayUnit = "kg"; }
      if (displayUnit === "ml" && displayTotalQty >= 1000) { displayTotalQty = displayTotalQty / 1000; displayUnit = "L"; }
    }
    return (
      <View style={styles.previewContainer}>
        <View style={styles.previewCol}>
          <Text style={styles.calcLabel}>Quantidade Registada:</Text>
          <Text style={styles.calcValue}>{displayTotalQty} {displayUnit}</Text>
          {subInfo ? <Text style={styles.calcSub}>{subInfo}</Text> : null}
        </View>
      </View>
    );
  };

  if (isScanning) {
    if (!permission?.granted) return <View style={styles.center}><TouchableOpacity onPress={requestPermission} style={styles.permBtn}><Text style={{ color: COLORS.text.light }}>Permitir Câmara</Text></TouchableOpacity></View>;
    return (
      <View style={styles.cameraContainer}>
        <CameraView style={StyleSheet.absoluteFillObject} onBarcodeScanned={handleBarCodeScanned} />
        <TouchableOpacity onPress={() => setIsScanning(false)} style={styles.closeCamera}><Ionicons name="close" size={30} color={COLORS.text.light} /></TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={templateName} subtitle={`${items.length} itens nesta lista`} icon="chevron-back" onIconPress={() => navigation.goBack()} />

      {/* --- BARRA DE FILTROS DE ESTOQUE --- */}
      {items.length > 0 && (
        <View style={styles.filtersWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
            <TouchableOpacity style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActiveAll]} onPress={() => setActiveFilter('all')}>
              <Text style={[styles.filterChipText, activeFilter === 'all' && styles.filterChipTextActiveAll]}>Todos os Itens</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.filterChip, activeFilter === 'missing' && styles.filterChipActiveMissing]} onPress={() => setActiveFilter('missing')}>
              <Ionicons name="warning" size={14} color={activeFilter === 'missing' ? '#E15241' : COLORS.text.secondary} style={{marginRight: 4}}/>
              <Text style={[styles.filterChipText, activeFilter === 'missing' && styles.filterChipTextActiveMissing]}>Em Falta</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.filterChip, activeFilter === 'ok' && styles.filterChipActiveOk]} onPress={() => setActiveFilter('ok')}>
              <Ionicons name="checkmark-circle" size={14} color={activeFilter === 'ok' ? '#34C759' : COLORS.text.secondary} style={{marginRight: 4}}/>
              <Text style={[styles.filterChipText, activeFilter === 'ok' && styles.filterChipTextActiveOk]}>No Estoque</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 220 }}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeaderRow}><Text style={styles.sectionTitle}>{title}</Text></View>
        )}
        renderItem={({ item }) => {
          // LÓGICA DO BADGE VISUAL DE ESTOQUE
          const currentStock = item.currentStock || 0;
          const missing = Math.max(0, item.quantity - currentStock);
          const hasStock = currentStock > 0;
          const isOk = missing === 0;

          const reqStr = formatQuantityFriendly(item.quantity, item.unit);
          const stockStr = formatQuantityFriendly(currentStock, item.unit);
          const missingStr = formatQuantityFriendly(missing, item.unit);

          let badgeColor = isOk ? '#34C759' : (hasStock ? '#FF9500' : '#E15241');
          let badgeIcon = isOk ? 'checkmark-circle' : 'warning';
          let badgeText = isOk ? `Estoque OK (${stockStr})` : (hasStock ? `Falta ${missingStr} (Tem ${stockStr})` : `Em falta (Tem 0)`);

          return (
            <View style={styles.itemWrapper}>
              
              {/* ETIQUETA FLUTUANTE DE STATUS DO ESTOQUE */}
              <View style={[styles.stockBadge, { backgroundColor: badgeColor + '15', borderColor: badgeColor }]}>
                 <Ionicons name={badgeIcon as any} size={14} color={badgeColor} />
                 <Text style={[styles.stockBadgeText, { color: badgeColor }]}>{badgeText}</Text>
              </View>

              <ShoppingItemCard
                item={item}
                onToggle={() => toggleItem(item.id, item.isChecked)}
                onEdit={() => handleEdit(item)}
                onDelete={() => {
                  setAlertConfig({
                    visible: true, title: "Remover Item", message: `Remover ${item.name}?`,
                    type: "danger", confirmText: "Sim, Remover",
                    onConfirm: () => { removeItem(item.id); setAlertConfig((prev) => ({ ...prev, visible: false })); },
                  });
                }}
              />
            </View>
          );
        }}
        renderSectionFooter={() => <View style={{ marginBottom: SPACING.lg }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Ionicons name="add-circle-outline" size={40} color={COLORS.text.secondary} /></View>
            <Text style={styles.emptyText}>Lista Limpa</Text>
            <Text style={styles.emptySub}>Comece a adicionar os itens desta lista.</Text>
          </View>
        }
      />

      <FloatingButton onPress={() => setModalVisible(true)} style={{ bottom: 100 }} />

      {items.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.useBtn} onPress={() => setActionSheetVisible(true)}>
            <View style={styles.useInfo}>
              <Text style={styles.useText}>Adicionar ao Carrinho</Text>
              <Text style={styles.useSub}>Enviar os itens para as compras</Text>
            </View>
            <View style={styles.arrowCircle}>
                <Ionicons name="cart-outline" size={20} color={COLORS.primary} />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* O POPUP ELEGANTE PARA ESCOLHER COMO ADICIONAR */}
      <BottomSheetModal visible={actionSheetVisible} onClose={() => setActionSheetVisible(false)} title="Enviar para Compras">
        <Text style={styles.actionSheetText}>Como deseja adicionar os itens desta lista ao seu carrinho?</Text>
        
        <TouchableOpacity style={styles.actionOptionCard} onPress={() => handleAddToShoppingList(true)}>
          <View style={[styles.actionOptionIcon, { backgroundColor: '#FF950015' }]}>
            <Ionicons name="funnel-outline" size={24} color="#FF9500" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionOptionTitle}>Apenas o que Falta</Text>
            <Text style={styles.actionOptionSub}>A app verifica o seu estoque e ignora o que já tem quantidade suficiente em casa.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.text.secondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionOptionCard} onPress={() => handleAddToShoppingList(false)}>
          <View style={[styles.actionOptionIcon, { backgroundColor: COLORS.border }]}>
            <Ionicons name="list" size={24} color={COLORS.text.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionOptionTitle}>Adicionar Tudo</Text>
            <Text style={styles.actionOptionSub}>Envia todos os itens da lista para o carrinho ignorando o estoque da despensa.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.text.secondary} />
        </TouchableOpacity>
      </BottomSheetModal>

      <BottomSheetModal visible={modalVisible} onClose={closeModal} title={editingItemId ? "Editar Item" : "Adicionar à Lista Fixa"}>
        {editingItemId ? (
          <View style={{ marginBottom: SPACING.md }}><Text style={styles.label}>Produto</Text><Text style={styles.editingNameText}>{query}</Text></View>
        ) : (
          <><Text style={styles.label}>Procurar Produto</Text><View style={styles.searchRow}><View style={{ flex: 1 }}><Autocomplete placeholder="Ex: Leite, Arroz..." data={catalog} value={query} onChangeText={setQuery} onSelect={selectProduct} closeOnSelect={false} /></View><TouchableOpacity style={styles.barcodeBtn} onPress={() => setIsScanning(true)}><Ionicons name="barcode-outline" size={24} color={COLORS.text.light} /></TouchableOpacity></View></>
        )}
        {selectedProduct && (
          <View style={styles.productDetailCard}>
            <View style={styles.prodHeader}><Text style={styles.prodName}>{selectedProduct.name}</Text><Text style={styles.prodBrand}>{selectedProduct.brand || "Geral"}</Text></View>
            <View style={styles.prodRow}>
              {selectedProduct.packSize && selectedProduct.packSize > 0 && ( <View style={styles.badge}><Ionicons name="cube" size={12} color={COLORS.text.secondary} /><Text style={styles.badgeText}>{selectedProduct.packSize}{selectedProduct.packUnit} / un</Text></View> )}
              {(() => { const loc = getLocationInfo(selectedProduct.defaultLocation || "pantry"); const label = getLocationLabel(selectedProduct.defaultLocation || "pantry"); return ( <View style={[styles.badge, { backgroundColor: loc.bg }]}><Ionicons name="location" size={12} color={loc.icon} /><Text style={[styles.badgeText, { color: loc.icon }]}>{label}</Text></View> ); })()}
            </View>
          </View>
        )}
        {selectedProduct && (
          <View style={styles.toggleContainer}>
            <TouchableOpacity style={[styles.toggleBtn, inputMode === "pack" && styles.toggleBtnActive]} onPress={() => handleToggleMode("pack")}><Text style={[styles.toggleText, inputMode === "pack" && styles.toggleTextActive]}>Por Unidade</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.toggleBtn, inputMode === "measure" && styles.toggleBtnActive]} onPress={() => handleToggleMode("measure")}><Text style={[styles.toggleText, inputMode === "measure" && styles.toggleTextActive]}>Por Peso/Vol</Text></TouchableOpacity>
          </View>
        )}
        <View style={{ flexDirection: "row", gap: SPACING.md, marginTop: SPACING.md }}><View style={{ flex: 1 }}><CustomInput label={inputMode === "pack" ? "Qtd (Unidades)" : `Qtd (${selectedProduct?.defaultUnit || "un"})`} value={quantity} onChangeText={setQuantity} keyboardType="numeric" placeholder="1" style={{ marginBottom: 0 }} /></View></View>
        {getCalculationPreview()}
        <PrimaryButton title={editingItemId ? "Guardar Alterações" : "Adicionar à Lista Fixa"} onPress={handleSave} containerStyle={{ marginTop: SPACING.lg }} />
      </BottomSheetModal>

      <AlertModal visible={alertConfig.visible} title={alertConfig.title} message={alertConfig.message} type={alertConfig.type} confirmText={alertConfig.confirmText} onCancel={() => setAlertConfig((prev) => ({ ...prev, visible: false }))} onConfirm={alertConfig.onConfirm} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  permBtn: { backgroundColor: COLORS.primary, padding: 12, borderRadius: RADIUS.md },
  cameraContainer: { flex: 1, backgroundColor: "#000" },
  closeCamera: { position: "absolute", top: 50, right: 30, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: RADIUS.xl, padding: 10 },

  // --- ESTILOS DO NOVO FILTRO SUPERIOR ---
  filtersWrapper: { paddingBottom: SPACING.sm, backgroundColor: COLORS.background },
  filtersScroll: { paddingHorizontal: SPACING.lg, gap: 8, alignItems: 'center' },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  filterChipText: { fontSize: 13, fontWeight: '600', color: COLORS.text.secondary },
  
  filterChipActiveAll: { backgroundColor: COLORS.primary + '15', borderColor: COLORS.primary },
  filterChipTextActiveAll: { color: COLORS.primary, fontWeight: '700' },
  
  filterChipActiveMissing: { backgroundColor: '#E1524115', borderColor: '#E15241' },
  filterChipTextActiveMissing: { color: '#E15241', fontWeight: '700' },

  filterChipActiveOk: { backgroundColor: '#34C75915', borderColor: '#34C759' },
  filterChipTextActiveOk: { color: '#34C759', fontWeight: '700' },

  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, marginTop: 12 },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: COLORS.text.secondary, textTransform: "uppercase", letterSpacing: 1, marginLeft: 4 },

  // --- ESTILOS DA ETIQUETA DE ESTOQUE (NOVO) ---
  itemWrapper: { marginBottom: SPACING.sm },
  stockBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderTopLeftRadius: RADIUS.md, borderTopRightRadius: RADIUS.md, borderWidth: 1, borderBottomWidth: 0, alignSelf: 'flex-start', marginLeft: 8, marginBottom: -4, zIndex: 1 },
  stockBadgeText: { fontSize: 11, fontWeight: '700', marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },

  empty: { alignItems: "center", marginTop: 60, paddingHorizontal: 40 },
  emptyIcon: { width: 80, height: 80, backgroundColor: COLORS.border, borderRadius: 40, justifyContent: "center", alignItems: "center", marginBottom: SPACING.md },
  emptyText: { fontSize: 18, fontWeight: "700", color: COLORS.text.primary, marginBottom: 8 },
  emptySub: { fontSize: 14, color: COLORS.text.secondary, textAlign: "center", lineHeight: 20 },

  footer: { position: 'absolute', bottom: 0, width: '100%', padding: SPACING.lg, backgroundColor: 'rgba(255,255,255,0.95)', borderTopWidth: 1, borderTopColor: COLORS.border },
  useBtn: { backgroundColor: '#000', padding: SPACING.md, borderRadius: RADIUS.lg, flexDirection: "row", justifyContent: "space-between", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  useInfo: { flex: 1 },
  useText: { color: COLORS.text.light, fontSize: 17, fontWeight: "700" },
  useSub: { color: "#AAA", fontSize: 12, marginTop: 2 },
  arrowCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center' },

  actionSheetText: { fontSize: 14, color: COLORS.text.secondary, marginBottom: SPACING.lg, lineHeight: 20 },
  actionOptionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md },
  actionOptionIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
  actionOptionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text.primary, marginBottom: 4 },
  actionOptionSub: { fontSize: 12, color: COLORS.text.secondary, lineHeight: 18 },

  label: { fontSize: 13, fontWeight: "700", color: COLORS.text.secondary, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  editingNameText: { fontSize: 18, fontWeight: "bold", color: COLORS.text.primary, backgroundColor: COLORS.input, padding: SPACING.md, borderRadius: RADIUS.md },
  searchRow: { flexDirection: "row", gap: SPACING.sm, zIndex: 10 },
  barcodeBtn: { backgroundColor: COLORS.text.primary, borderRadius: RADIUS.lg, width: 54, justifyContent: "center", alignItems: "center" },
  productDetailCard: { backgroundColor: COLORS.background, borderRadius: RADIUS.lg, padding: SPACING.md, marginTop: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  prodHeader: { marginBottom: 8 },
  prodName: { fontSize: 16, fontWeight: "700", color: COLORS.text.primary },
  prodBrand: { fontSize: 12, color: COLORS.text.secondary },
  prodRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 8 },
  badge: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.border, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm, gap: 4 },
  badgeText: { fontSize: 11, fontWeight: "600", color: "#555" },
  toggleContainer: { flexDirection: "row", backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: 4, marginTop: SPACING.lg },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: RADIUS.sm },
  toggleBtnActive: { backgroundColor: COLORS.card, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  toggleText: { fontSize: 13, fontWeight: "600", color: COLORS.text.secondary },
  toggleTextActive: { color: COLORS.primary },
  previewContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: SPACING.md, backgroundColor: COLORS.card, padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  previewCol: { flex: 1 },
  calcLabel: { fontSize: 11, color: COLORS.text.secondary, fontWeight: "600", textTransform: "uppercase", marginBottom: 4 },
  calcValue: { fontSize: 16, color: COLORS.text.primary, fontWeight: "800" },
  calcSub: { fontSize: 11, color: COLORS.text.secondary, marginTop: 2 },
});