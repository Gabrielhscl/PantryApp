import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RecipeService } from "../../services/recipeService";
import { InventoryRepository } from "../../repositories/inventoryRepository";
import { ShoppingRepository } from "../../repositories/shoppingRepository";
import { useToast } from "../../contexts/ToastContext";
import { AlertModal } from "./AlertModal";
import { COLORS, SPACING, RADIUS } from "../../constants/theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  recipe: any;
  inventory: any[];
  onCooked?: () => void;
};

const TABS = [
  { id: 'all', label: 'Todos', icon: 'apps-outline' },
  { id: 'fridge', label: 'Geladeira', icon: 'thermometer-outline' },
  { id: 'pantry', label: 'Armário', icon: 'cube-outline' },
  { id: 'freezer', label: 'Freezer', icon: 'snow-outline' },
];

export function RecipeDetailsModal({ visible, onClose, recipe, inventory, onCooked }: Props) {
  const [activeTab, setActiveTab] = useState('all');
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const { showToast } = useToast();
  const [alertConfig, setAlertConfig] = useState<any>({ visible: false });

  // Controlo de Porções (Multiplicador)
  const [targetServings, setTargetServings] = useState<number>(1);

  useEffect(() => {
    if (recipe && recipe.servings) {
      setTargetServings(recipe.servings);
    } else {
      setTargetServings(1);
    }
    setCompletedSteps([]); // Reseta os passos ao abrir nova receita
  }, [recipe]);

  const multiplier = useMemo(() => {
    if (!recipe || !recipe.servings || recipe.servings <= 0) return 1;
    return targetServings / recipe.servings;
  }, [recipe, targetServings]);

  const groupedIngredients = useMemo(() => {
    if (!recipe || !recipe.ingredients) return {};

    const filtered = activeTab === 'all' 
      ? recipe.ingredients 
      : recipe.ingredients.filter((ing: any) => ing.defaultLocation === activeTab);

    return filtered.reduce((acc: any, ing: any) => {
      const category = ing.category || "Outros";
      if (!acc[category]) acc[category] = [];
      acc[category].push(ing);
      return acc;
    }, {});
  }, [recipe, activeTab]);

  if (!recipe) return null;

  const toggleStep = (index: number) => {
    setCompletedSteps(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const getIngredientStatus = (ing: any) => {
    const requiredQty = ing.quantity * multiplier;
    const inStock = inventory.find((i) => i.productId === ing.productId);
    
    if (!inStock) return { has: false, current: 0, unit: ing.unit, approx: null, required: requiredQty };

    const { hasEnough, neededInBase } = RecipeService.checkIngredientAvailability(
      requiredQty, ing.unit,
      inStock.quantity, inStock.unit
    );

    let approxLabel = null;
    if (ing.unit !== inStock.unit) {
       approxLabel = `(~${neededInBase}${inStock.unit})`;
    }

    return { has: hasEnough, current: inStock.quantity, unit: inStock.unit, approx: approxLabel, required: requiredQty };
  };

  const missingIngredients = recipe.ingredients.filter((ing: any) => {
    const status = getIngredientStatus(ing);
    return !status.has;
  });

  const hasMissingItems = missingIngredients.length > 0;

  // --- FUNÇÃO ATUALIZADA: AGORA COM A CATEGORIA SENDO O NOME DA RECEITA ---
  const handleGenerateShoppingList = async () => {
    try {
      let itemsAdded = 0;

      for (const ing of missingIngredients) {
        const status = getIngredientStatus(ing);
        let qtyToBuy = status.required; 
        
        if (status.current > 0 && status.unit === ing.unit) {
          qtyToBuy = status.required - status.current;
        }

        if (qtyToBuy > 0) {
          // TRUQUE: Juntamos a categoria original e o nome da receita
          const originalCategory = ing.category || "Outros";
          const compoundCategory = `${originalCategory}|${recipe.name}`;

          await ShoppingRepository.addItem({
            productId: ing.productId,
            name: ing.name,
            quantity: Number(qtyToBuy.toFixed(2)),
            unit: ing.unit,
            category: compoundCategory // Guarda "Carnes|Lasanha"
          });
          itemsAdded++;
        }
      }

      showToast(`${itemsAdded} itens adicionados à Lista de Compras para "${recipe.name}"!`, "success");
      onClose(); 
    } catch (error) {
      showToast("Erro ao gerar a lista de compras.", "error");
    }
  };

  const handleCook = () => {
    if (hasMissingItems) {
      setAlertConfig({
        visible: true,
        title: "Faltam Ingredientes ⚠️",
        message: "Não tem stock suficiente para as porções selecionadas. Deseja cozinhar assim mesmo e abater o que for possível?",
        type: "warning",
        onConfirm: () => {
          setAlertConfig({ visible: false });
          executeCook();
        },
        onCancel: () => setAlertConfig({ visible: false })
      });
    } else {
      executeCook();
    }
  };

  const executeCook = async () => {
    try {
      for (const ing of recipe.ingredients) {
        const requiredQty = ing.quantity * multiplier;
        const inStockItem = inventory.find(i => i.productId === ing.productId);
        
        if (inStockItem) {
          const { neededInBase } = RecipeService.checkIngredientAvailability(
            requiredQty, ing.unit,
            inStockItem.quantity, inStockItem.unit
          );

          const newQuantity = inStockItem.quantity - neededInBase;

          if (newQuantity <= 0) {
            await InventoryRepository.deleteItem(inStockItem.id);
          } else {
            await InventoryRepository.updateQuantity(inStockItem.id, newQuantity);
          }
        }
      }
      
      showToast(`Prato preparado (${targetServings} porções)! Stock atualizado.`, "success");
      setCompletedSteps([]); 
      if(onCooked) onCooked(); 
      onClose(); 
    } catch (error) {
      showToast("Erro ao atualizar o stock.", "error");
    }
  };

  const steps = recipe.instructions ? recipe.instructions.split("\n").filter((s: string) => s.trim()) : [];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.cover}>
            {recipe.image ? (
              <Image source={{ uri: recipe.image }} style={styles.image} />
            ) : (
              <View style={styles.placeholder}><Ionicons name="restaurant" size={40} color={COLORS.border} /></View>
            )}
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={COLORS.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: SPACING.md }} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{recipe.name}</Text>
            
            <View style={styles.meta}>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color={COLORS.text.secondary} />
                <Text style={styles.metaText}>{recipe.preparationTime} min</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="people-outline" size={14} color={COLORS.text.secondary} />
                <Text style={styles.metaText}>{recipe.servings} porções originais</Text>
              </View>
            </View>

            <View style={styles.servingsControl}>
              <Text style={styles.servingsLabel}>Quantas porções vai cozinhar?</Text>
              <View style={styles.servingsAdjuster}>
                <TouchableOpacity 
                  style={styles.servingsBtn} 
                  onPress={() => setTargetServings(Math.max(1, targetServings - 1))}
                >
                  <Ionicons name="remove" size={20} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.servingsValue}>{targetServings}</Text>
                <TouchableOpacity 
                  style={styles.servingsBtn} 
                  onPress={() => setTargetServings(targetServings + 1)}
                >
                  <Ionicons name="add" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
              {TABS.map((tab) => (
                <TouchableOpacity 
                  key={tab.id} 
                  onPress={() => setActiveTab(tab.id)}
                  style={[styles.tab, activeTab === tab.id && styles.activeTab]}
                >
                  <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>{tab.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.ingCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={styles.sectionTitleCompact}>Ingredientes</Text>
                {multiplier !== 1 && (
                  <Text style={styles.multiplierBadge}>x {multiplier.toFixed(1)}</Text>
                )}
              </View>

              {Object.keys(groupedIngredients).length === 0 ? (
                <Text style={styles.emptyText}>Nenhum item aqui.</Text>
              ) : (
                Object.keys(groupedIngredients).map((category) => (
                  <View key={category}>
                    <Text style={styles.catHeader}>{category}</Text>
                    {groupedIngredients[category].map((ing: any, i: number) => {
                      const status = getIngredientStatus(ing);
                      const formattedQty = Number.isInteger(status.required) ? status.required : status.required.toFixed(1);
                      
                      return (
                        <View key={i} style={styles.ingRow}>
                          <Ionicons 
                            name={status.has ? "checkmark-circle" : "close-circle"} 
                            size={18} 
                            color={status.has ? COLORS.status.success : COLORS.status.danger} 
                          />
                          <Text style={[styles.ingName, !status.has && { color: COLORS.status.danger }]} numberOfLines={1}>
                            {ing.name}
                          </Text>
                          <Text style={styles.ingQty}>
                            {formattedQty}{ing.unit}
                            {status.approx && <Text style={styles.approxText}> {status.approx}</Text>}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ))
              )}
            </View>

            <View style={styles.prepHeader}>
              <Text style={styles.sectionTitle}>Modo de Preparo</Text>
              <View style={styles.badge}><Text style={styles.badgeText}>{completedSteps.length}/{steps.length}</Text></View>
            </View>

            <View style={styles.stepsList}>
              {steps.map((step: string, index: number) => {
                const isCompleted = completedSteps.includes(index);
                return (
                  <TouchableOpacity 
                    key={index} 
                    activeOpacity={0.7} 
                    onPress={() => toggleStep(index)}
                    style={[styles.stepCard, isCompleted && styles.stepCardCompleted]}
                  >
                    <View style={[styles.stepDot, isCompleted && styles.stepDotCompleted]}>
                      {!isCompleted && <Text style={styles.stepIndex}>{index + 1}</Text>}
                      {isCompleted && <Ionicons name="checkmark" size={12} color="#FFF" />}
                    </View>
                    <Text style={[styles.stepText, isCompleted && styles.stepTextCompleted]}>{step}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            
            <View style={{ height: 120 }} />
          </ScrollView>

          <View style={styles.footer}>
            {hasMissingItems && (
              <TouchableOpacity style={styles.shopBtn} onPress={handleGenerateShoppingList}>
                <Ionicons name="cart" size={20} color="#FFF" />
                <Text style={styles.shopText}>Gerar Lista</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={styles.cookBtn} onPress={handleCook}>
              <Ionicons name="restaurant" size={20} color="#FFF" />
              <Text style={styles.cookText}>Cozinhar ({targetServings})</Text>
            </TouchableOpacity>
          </View>
        </View>

        <AlertModal
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          onConfirm={alertConfig.onConfirm}
          onCancel={alertConfig.onCancel}
          confirmText="Cozinhar Mesmo Assim"
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  content: { backgroundColor: COLORS.background, height: "94%", borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: "hidden" },
  cover: { height: 180, backgroundColor: COLORS.border },
  image: { width: "100%", height: "100%", resizeMode: 'cover' },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  closeBtn: { position: "absolute", top: 15, right: 15, backgroundColor: "rgba(255,255,255,0.8)", padding: 6, borderRadius: RADIUS.xl },
  
  title: { fontSize: 22, fontWeight: "bold", color: COLORS.text.primary, marginBottom: 4 },
  meta: { flexDirection: "row", gap: 15, marginBottom: SPACING.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: COLORS.text.secondary, fontWeight: "600", fontSize: 13 },
  
  servingsControl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.card, padding: SPACING.md, borderRadius: RADIUS.lg, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  servingsLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text.primary },
  servingsAdjuster: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: 4 },
  servingsBtn: { padding: 8, backgroundColor: COLORS.card, borderRadius: RADIUS.sm, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  servingsValue: { fontSize: 16, fontWeight: 'bold', color: COLORS.text.primary, width: 30, textAlign: 'center' },
  multiplierBadge: { fontSize: 12, fontWeight: 'bold', color: COLORS.primary, backgroundColor: COLORS.primary + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm },

  tabScroll: { marginBottom: SPACING.md },
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.md, backgroundColor: COLORS.border, marginRight: 8 },
  activeTab: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 12, color: COLORS.text.secondary, fontWeight: '700' },
  activeTabText: { color: COLORS.text.light },

  ingCard: { backgroundColor: COLORS.card, padding: SPACING.md, borderRadius: RADIUS.lg, marginBottom: SPACING.lg, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5 },
  sectionTitleCompact: { fontSize: 14, fontWeight: "800", color: COLORS.text.secondary, textTransform: "uppercase", letterSpacing: 0.5 },
  catHeader: { fontSize: 11, fontWeight: "800", color: COLORS.primary, marginTop: 8, marginBottom: 4, textTransform: 'uppercase' },
  ingRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4, marginBottom: 6 },
  ingName: { flex: 1, fontSize: 14, color: COLORS.text.primary, fontWeight: "500", marginLeft: 8 },
  ingQty: { fontSize: 13, color: COLORS.text.primary, fontWeight: "700" },
  approxText: { fontSize: 11, color: COLORS.text.secondary, fontWeight: '400' },
  emptyText: { textAlign: 'center', color: COLORS.text.secondary, paddingVertical: 10, fontSize: 12 },

  prepHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text.primary },
  badge: { backgroundColor: '#007AFF15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.sm },
  badgeText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  
  stepsList: { gap: 8 },
  stepCard: { flexDirection: "row", backgroundColor: COLORS.card, padding: SPACING.md, borderRadius: RADIUS.lg, alignItems: 'center' },
  stepCardCompleted: { opacity: 0.6, backgroundColor: COLORS.background },
  stepDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.background, justifyContent: "center", alignItems: "center", marginRight: 10 },
  stepDotCompleted: { backgroundColor: COLORS.status.success },
  stepIndex: { color: COLORS.text.secondary, fontWeight: "800", fontSize: 11 },
  stepText: { flex: 1, fontSize: 14, color: COLORS.text.primary, lineHeight: 20 },
  stepTextCompleted: { textDecorationLine: 'line-through', color: COLORS.text.secondary },

  footer: { 
    position: 'absolute', bottom: 0, width: '100%', 
    padding: SPACING.lg, backgroundColor: COLORS.card, 
    borderTopWidth: 1, borderTopColor: COLORS.border,
    flexDirection: 'row', gap: SPACING.md
  },
  cookBtn: { flex: 1, backgroundColor: COLORS.status.success, padding: 16, borderRadius: RADIUS.lg, flexDirection: 'row', alignItems: "center", justifyContent: 'center', shadowColor: COLORS.status.success, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4, gap: 8 },
  cookText: { color: COLORS.text.light, fontWeight: "800", fontSize: 15 },
  
  shopBtn: { flex: 1, backgroundColor: COLORS.primary, padding: 16, borderRadius: RADIUS.lg, flexDirection: 'row', alignItems: "center", justifyContent: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4, gap: 8 },
  shopText: { color: COLORS.text.light, fontWeight: "800", fontSize: 15, textAlign: 'center' },
});