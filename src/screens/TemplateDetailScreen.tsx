import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { TemplateRepository } from "../repositories/templateRepository";
import { ShoppingRepository } from "../repositories/shoppingRepository";
import { TemplateItemCard } from "../components/TemplateItemCard"; // Use o componente que criei na resposta anterior

export default function TemplateDetailScreen({ route, navigation }: any) {
  const { templateId, name } = route.params;
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Carrega itens e verifica status do estoque
  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await TemplateRepository.getItemsWithStockStatus(templateId);
    setItems(data);
    setLoading(false);
  }, [templateId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  // FUNÇÃO MÁGICA: Gera a lista de compras baseada no que falta
  const handleGenerateList = async () => {
    const missingItems = items.filter((i) => i.status !== "ok");

    if (missingItems.length === 0) {
      return Alert.alert("Tudo em ordem!", "Seu estoque já cobre este modelo.");
    }

    Alert.alert(
      "Gerar Lista",
      `Deseja adicionar ${missingItems.length} itens faltantes à sua Lista de Compras?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Adicionar",
          onPress: async () => {
            for (const item of missingItems) {
              // Calcula quanto falta comprar (Meta - Atual)
              // Se tiver negativo (estoque zerado), pede a meta inteira
              const qtyNeeded = Math.max(
                item.targetQty - item.currentStock,
                item.targetQty,
              );

              await ShoppingRepository.addItem({
                productId: item.productId,
                name: item.name,
                quantity: qtyNeeded,
                unit: item.unit,
                category: item.category,
              });
            }
            Alert.alert("Sucesso", "Itens adicionados à lista de compras!");
            navigation.navigate("Lista"); // Volta para a aba de lista
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{name}</Text>
        <Text style={styles.subtitle}>Itens configurados: {items.length}</Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#007AFF"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <TemplateItemCard item={item} onDelete={() => {}} />
            // Adicione lógica de deletar item do template se quiser
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>Este modelo está vazio.</Text>
          }
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.generateBtn}
          onPress={handleGenerateList}
        >
          <Ionicons
            name="cart"
            size={20}
            color="#FFF"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.generateText}>Gerar Lista de Compras</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  header: {
    padding: 20,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  title: { fontSize: 24, fontWeight: "800", color: "#1C1C1E" },
  subtitle: { fontSize: 14, color: "#8E8E93", marginTop: 4 },
  empty: { textAlign: "center", marginTop: 50, color: "#999" },
  footer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    padding: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  generateBtn: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  generateText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
});
