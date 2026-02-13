import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  visible: boolean;
  onClose: () => void;
  recipe: any;
};

export function RecipeDetailsModal({ visible, onClose, recipe }: Props) {
  if (!recipe) return null;

  // Função para verificar status do estoque
  const getStockStatus = (required: number, available: number) => {
    if (available >= required) {
      return { icon: "checkmark-circle", color: "#34C759", text: "Em estoque" };
    } else if (available > 0) {
      return {
        icon: "alert-circle",
        color: "#FF9500",
        text: `Falta ${required - available}`,
      };
    } else {
      return { icon: "close-circle", color: "#FF3B30", text: "Em falta" };
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>
            {recipe.name}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#1C1C1E" />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* BADGES */}
          <View style={styles.metaRow}>
            <View style={styles.badge}>
              <Ionicons name="time-outline" size={16} color="#007AFF" />
              <Text style={styles.badgeText}>
                {recipe.preparationTime || 0} min
              </Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="people-outline" size={16} color="#007AFF" />
              <Text style={styles.badgeText}>
                {recipe.servings || 1} porções
              </Text>
            </View>
          </View>

          {/* LISTA DE INGREDIENTES COM STATUS DE ESTOQUE */}
          <Text style={styles.sectionTitle}>Ingredientes</Text>
          <View style={styles.ingredientsCard}>
            {recipe.ingredients &&
              recipe.ingredients.map((ing: any, i: number) => {
                const stock = ing.stockQuantity || 0;
                const status = getStockStatus(ing.quantity, stock);

                return (
                  <View key={i} style={styles.ingRow}>
                    {/* Informação do Ingrediente */}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ingText}>{ing.name}</Text>
                      <Text style={styles.ingQty}>
                        Receita pede: {ing.quantity} {ing.unit}
                      </Text>
                    </View>

                    {/* Status do Estoque (Direita) */}
                    <View style={styles.stockStatus}>
                      <Text style={[styles.stockText, { color: status.color }]}>
                        {stock >= ing.quantity
                          ? "OK"
                          : `${stock}/${ing.quantity}`}
                      </Text>
                      <Ionicons
                        name={status.icon as any}
                        size={20}
                        color={status.color}
                      />
                    </View>
                  </View>
                );
              })}
          </View>

          {/* MODO DE PREPARO */}
          <Text style={styles.sectionTitle}>Modo de Preparo</Text>
          <View style={styles.stepsContainer}>
            {recipe.instructions ? (
              recipe.instructions
                .split("\n")
                .filter((line: string) => line.trim().length > 0)
                .map((step: string, index: number) => (
                  <View key={index} style={styles.stepRow}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepNumber}>{index + 1}</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  </View>
                ))
            ) : (
              <Text style={styles.emptyText}>
                Nenhuma instrução cadastrada.
              </Text>
            )}
          </View>

          {/* BOTÃO COZINHAR */}
          <TouchableOpacity
            style={styles.cookBtn}
            onPress={() =>
              Alert.alert(
                "Cozinhar",
                "Em breve: isso vai descontar os itens do seu estoque!",
              )
            }
          >
            <Ionicons
              name="flame"
              size={20}
              color="#FFF"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.cookBtnText}>Cozinhar Agora</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 24,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F7",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1C1C1E",
    flex: 1,
    marginRight: 10,
  },
  closeBtn: { padding: 8, backgroundColor: "#F2F2F7", borderRadius: 20 },
  content: { padding: 24 },

  metaRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  badgeText: { fontSize: 14, fontWeight: "600", color: "#1C1C1E" },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 16,
    marginTop: 8,
  },

  ingredientsCard: {
    backgroundColor: "#F9F9FB",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },

  // Linha do Ingrediente Repaginada
  ingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EDEDED",
    paddingBottom: 8,
  },
  ingText: { fontSize: 16, fontWeight: "600", color: "#333" },
  ingQty: { fontSize: 13, color: "#8E8E93", marginTop: 2 },

  stockStatus: { flexDirection: "row", alignItems: "center", gap: 6 },
  stockText: { fontSize: 12, fontWeight: "bold" },

  stepsContainer: { marginBottom: 30 },
  stepRow: { flexDirection: "row", marginBottom: 20 },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1C1C1E",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    marginTop: 2,
  },
  stepNumber: { color: "#FFF", fontWeight: "bold", fontSize: 14 },
  stepContent: {
    flex: 1,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F7",
  },
  stepText: { fontSize: 16, lineHeight: 24, color: "#333" },
  emptyText: { fontStyle: "italic", color: "#999" },

  cookBtn: {
    backgroundColor: "#34C759",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
    borderRadius: 16,
    marginTop: 10,
    shadowColor: "#34C759",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  cookBtnText: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
});
