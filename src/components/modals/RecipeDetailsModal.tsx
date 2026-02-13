import React from "react";
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

type Props = {
  visible: boolean;
  onClose: () => void;
  recipe: any;
  inventory: any[];
};

export function RecipeDetailsModal({
  visible,
  onClose,
  recipe,
  inventory,
}: Props) {
  if (!recipe) return null;

  const checkItem = (ing: any) => {
    const inStock = inventory.find((i) => i.productId === ing.productId);
    const toBase = (qty: number, unit: string) => {
      if (unit === "kg" || unit === "L") return qty * 1000;
      return qty;
    };
    if (!inStock) return { has: false, current: 0 };
    const stockQty = toBase(inStock.quantity, inStock.unit);
    const neededQty = toBase(ing.quantity, ing.unit);
    return {
      has: stockQty >= neededQty,
      current: inStock.quantity,
      stockUnit: inStock.unit,
    };
  };

  // Separa a string de instruções em passos
  const steps = recipe.instructions
    ? recipe.instructions.split("\n").filter((s: string) => s.trim())
    : [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          {/* CAPA */}
          <View style={styles.cover}>
            {recipe.image ? (
              <Image source={{ uri: recipe.image }} style={styles.image} />
            ) : (
              <View style={styles.placeholder}>
                <Ionicons name="restaurant" size={40} color="#FFF" />
              </View>
            )}
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text style={styles.title}>{recipe.name}</Text>
            <View style={styles.meta}>
              <Text style={styles.metaText}>
                ⏱ {recipe.preparationTime} min
              </Text>
              <Text style={styles.metaText}>👥 {recipe.servings} porções</Text>
            </View>

            {/* INGREDIENTES */}
            <Text style={styles.sectionTitle}>Ingredientes</Text>
            <View style={styles.list}>
              {recipe.ingredients.map((ing: any, i: number) => {
                const status = checkItem(ing);
                return (
                  <View key={i} style={styles.row}>
                    <Ionicons
                      name={status.has ? "checkmark-circle" : "close-circle"}
                      size={20}
                      color={status.has ? "#34C759" : "#FF3B30"}
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text
                        style={[
                          styles.ingName,
                          !status.has && { color: "#FF3B30" },
                        ]}
                      >
                        {ing.name}
                      </Text>
                      <Text style={styles.subText}>
                        {ing.quantity}
                        {ing.unit}
                        {!status.has && status.current !== undefined
                          ? ` (Tem: ${status.current}${status.stockUnit})`
                          : ""}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* MODO DE PREPARO (PASSO A PASSO) */}
            <Text style={styles.sectionTitle}>Modo de Preparo</Text>
            <View style={styles.stepsContainer}>
              {steps.map((step: string, index: number) => (
                <View key={index} style={styles.stepRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepIndex}>{index + 1}</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                </View>
              ))}
              {steps.length === 0 && (
                <Text style={{ color: "#999" }}>
                  Nenhuma instrução cadastrada.
                </Text>
              )}
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          <TouchableOpacity style={styles.cookBtn}>
            <Text style={styles.cookText}>Iniciar Cozimento</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  content: {
    backgroundColor: "#FFF",
    height: "90%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  cover: { height: 200, backgroundColor: "#EEE" },
  image: { width: "100%", height: "100%" },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#CCC",
  },
  closeBtn: {
    position: "absolute",
    top: 20,
    right: 20,
    backgroundColor: "#FFF",
    padding: 8,
    borderRadius: 20,
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#1C1C1E", marginTop: 10 },
  meta: { flexDirection: "row", gap: 15, marginTop: 5, marginBottom: 20 },
  metaText: { color: "#666", fontWeight: "500" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    marginTop: 10,
  },
  list: { backgroundColor: "#F9F9F9", padding: 15, borderRadius: 12 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  ingName: { fontSize: 15, color: "#333", fontWeight: "500" },
  subText: { fontSize: 12, color: "#888" },

  // ESTILOS DE PASSOS
  stepsContainer: { paddingLeft: 5 },
  stepRow: { flexDirection: "row", marginBottom: 20 },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
    zIndex: 1,
  },
  stepIndex: { color: "#FFF", fontWeight: "bold", fontSize: 14 },
  stepContent: { flex: 1, paddingTop: 2 },
  stepText: { fontSize: 16, lineHeight: 24, color: "#333" },

  cookBtn: {
    margin: 20,
    backgroundColor: "#34C759",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  cookText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
});
