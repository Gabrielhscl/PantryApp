import React, { useState, useMemo } from "react";
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

type Props = {
  visible: boolean;
  onClose: () => void;
  recipe: any;
  inventory: any[];
};

const TABS = [
  { id: 'all', label: 'Todos', icon: 'apps-outline' },
  { id: 'fridge', label: 'Geladeira', icon: 'thermometer-outline' },
  { id: 'pantry', label: 'Armário', icon: 'cube-outline' },
  { id: 'freezer', label: 'Freezer', icon: 'snow-outline' },
];

export function RecipeDetailsModal({ visible, onClose, recipe, inventory }: Props) {
  const [activeTab, setActiveTab] = useState('all');
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // 1. O Hook useMemo agora fica ANTES do 'if return'
  const groupedIngredients = useMemo(() => {
    // Verificamos se recipe e recipe.ingredients existem
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
  }, [recipe, activeTab]); // Adicionamos 'recipe' nas dependências

  // 2. AGORA SIM, colocamos o 'if return' (depois de todos os Hooks)
  if (!recipe) return null;

  const toggleStep = (index: number) => {
    setCompletedSteps(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const getIngredientStatus = (ing: any) => {
    const inStock = inventory.find((i) => i.productId === ing.productId);
    if (!inStock) return { has: false, current: 0, unit: ing.unit, approx: null };

    const { hasEnough, neededInBase } = RecipeService.checkIngredientAvailability(
      ing.quantity, ing.unit,
      inStock.quantity, inStock.unit
    );

    let approxLabel = null;
    if (ing.unit !== inStock.unit) {
       approxLabel = `(~${neededInBase}${inStock.unit})`;
    }

    return { has: hasEnough, current: inStock.quantity, unit: inStock.unit, approx: approxLabel };
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
              <View style={styles.placeholder}><Ionicons name="restaurant" size={40} color="#CCC" /></View>
            )}
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{recipe.name}</Text>
            
            <View style={styles.meta}>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color="#666" />
                <Text style={styles.metaText}>{recipe.preparationTime} min</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="people-outline" size={14} color="#666" />
                <Text style={styles.metaText}>{recipe.servings} porções</Text>
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
              <Text style={styles.sectionTitleCompact}>Ingredientes</Text>
              {Object.keys(groupedIngredients).length === 0 ? (
                <Text style={styles.emptyText}>Nenhum item aqui.</Text>
              ) : (
                Object.keys(groupedIngredients).map((category) => (
                  <View key={category}>
                    <Text style={styles.catHeader}>{category}</Text>
                    {groupedIngredients[category].map((ing: any, i: number) => {
                      const status = getIngredientStatus(ing);
                      return (
                        <View key={i} style={styles.ingRow}>
                          <Ionicons 
                            name={status.has ? "checkmark-circle" : "close-circle"} 
                            size={18} 
                            color={status.has ? "#34C759" : "#FF3B30"} 
                          />
                          <Text style={[styles.ingName, !status.has && { color: "#FF3B30" }]} numberOfLines={1}>
                            {ing.name}
                          </Text>
                          <Text style={styles.ingQty}>
                            {ing.quantity}{ing.unit}
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
            
            <View style={{ height: 100 }} />
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cookBtn}>
              <Text style={styles.cookText}>Cozinhar Agora</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  content: { backgroundColor: "#F2F2F7", height: "94%", borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: "hidden" },
  cover: { height: 180, backgroundColor: "#E5E5EA" },
  image: { width: "100%", height: "100%", resizeMode: 'cover' },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  closeBtn: { position: "absolute", top: 15, right: 15, backgroundColor: "rgba(255,255,255,0.8)", padding: 6, borderRadius: 20 },
  
  title: { fontSize: 22, fontWeight: "bold", color: "#1C1C1E", marginBottom: 4 },
  meta: { flexDirection: "row", gap: 15, marginBottom: 15 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: "#8E8E93", fontWeight: "600", fontSize: 13 },
  
  tabScroll: { marginBottom: 12 },
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: '#E5E5EA', marginRight: 8 },
  activeTab: { backgroundColor: '#007AFF' },
  tabText: { fontSize: 12, color: '#8E8E93', fontWeight: '700' },
  activeTabText: { color: '#FFF' },

  ingCard: { backgroundColor: "#FFF", padding: 12, borderRadius: 20, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5 },
  sectionTitleCompact: { fontSize: 14, fontWeight: "800", color: "#8E8E93", textTransform: "uppercase", marginBottom: 10, letterSpacing: 0.5 },
  catHeader: { fontSize: 11, fontWeight: "800", color: "#007AFF", marginTop: 8, marginBottom: 4, textTransform: 'uppercase' },
  ingRow: { flexDirection: "row", alignItems: "center", py: 4, marginBottom: 6 },
  ingName: { flex: 1, fontSize: 14, color: "#1C1C1E", fontWeight: "500", marginLeft: 8 },
  ingQty: { fontSize: 13, color: "#1C1C1E", fontWeight: "700" },
  approxText: { fontSize: 11, color: '#8E8E93', fontWeight: '400' },
  emptyText: { textAlign: 'center', color: '#CCC', paddingVertical: 10, fontSize: 12 },

  prepHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#1C1C1E" },
  badge: { backgroundColor: '#007AFF15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#007AFF' },
  
  stepsList: { gap: 8 },
  stepCard: { flexDirection: "row", backgroundColor: "#FFF", padding: 12, borderRadius: 16, alignItems: 'center' },
  stepCardCompleted: { opacity: 0.6, backgroundColor: '#F2F2F7' },
  stepDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#F2F2F7", justifyContent: "center", alignItems: "center", marginRight: 10 },
  stepDotCompleted: { backgroundColor: '#34C759' },
  stepIndex: { color: "#8E8E93", fontWeight: "800", fontSize: 11 },
  stepText: { flex: 1, fontSize: 14, color: "#1C1C1E", lineHeight: 20 },
  stepTextCompleted: { textDecorationLine: 'line-through', color: '#8E8E93' },

  footer: { position: 'absolute', bottom: 0, width: '100%', padding: 16, backgroundColor: '#F8F9FA', borderTopWidth: 1, borderTopColor: '#E5E5EA' },
  cookBtn: { backgroundColor: "#34C759", padding: 16, borderRadius: 16, alignItems: "center" },
  cookText: { color: "#FFF", fontWeight: "800", fontSize: 16 },
});