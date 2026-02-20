import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { RecipeRepository } from "../repositories/recipeRepository";
import { InventoryRepository } from "../repositories/inventoryRepository";
import { RecipeService } from "../services/recipeService";
import { SyncService } from "../services/SyncService"; // IMPORTADO
import { useAuth } from "../contexts/AuthContext"; // IMPORTADO

import { ScreenHeader } from "../components/ui/ScreenHeader";
import { FloatingButton } from "../components/ui/FloatingButton";
import { RecipeCard } from "../components/RecipeCard";
import { AddRecipeModal } from "../components/modals/AddRecipeModal";
import { RecipeDetailsModal } from "../components/modals/RecipeDetailsModal";
import { AlertModal } from "../components/modals/AlertModal";

export default function RecipesScreen() {
  const { user } = useAuth(); // ADICIONADO PARA TER ACESSO AO USER ID
  const [recipes, setRecipes] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [searchText, setSearchText] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);

  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [editingRecipe, setEditingRecipe] = useState<any>(null);

  const [alertConfig, setAlertConfig] = useState<any>({ visible: false });

  const loadData = async () => {
    const [recipesData, inventoryData] = await Promise.all([
      RecipeRepository.findAll(),
      InventoryRepository.findAll(),
    ]);
    setRecipes(recipesData);
    setInventory(inventoryData);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const handleCreate = () => {
    setEditingRecipe(null);
    setModalVisible(true);
  };

  const handleEdit = (recipe: any) => {
    setEditingRecipe(recipe);
    setModalVisible(true);
  };

  // --- SAVE COM SYNC AUTOMÁTICO ---
  const handleSave = async (data: any) => {
    if (editingRecipe) {
      await RecipeRepository.updateRecipe(editingRecipe.id, data);
    } else {
      await RecipeRepository.createRecipe(data);
    }

    // DISPARA SINCRONIZAÇÃO IMEDIATA APÓS SALVAR
    if (user) {
      SyncService.notifyChanges(user.id);
    }

    loadData();
  };

  // --- DELETE COM SYNC AUTOMÁTICO ---
  const handleDelete = (id: string) => {
    setAlertConfig({
      visible: true,
      title: "Excluir Receita",
      message: "Tem certeza que deseja apagar essa receita?",
      type: "danger",
      onConfirm: async () => {
        await RecipeRepository.deleteRecipe(id);
        
        // DISPARA SINCRONIZAÇÃO APÓS EXCLUIR
        if (user) {
          SyncService.notifyChanges(user.id);
        }

        setAlertConfig({ visible: false });
        loadData();
      },
      onCancel: () => setAlertConfig({ visible: false }),
    });
  };

  const filteredRecipes = recipes.filter((r) =>
    r.name.toLowerCase().includes(searchText.toLowerCase()),
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Receitas" subtitle="O que vamos cozinhar hoje?" />

        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar receita..."
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        <FlatList
          data={filteredRecipes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          renderItem={({ item }) => {
            const status = RecipeService.checkAvailability(item, inventory);
            return (
              <RecipeCard
                data={item}
                status={status}
                onPress={() => {
                  setSelectedRecipe(item);
                  setDetailVisible(true);
                }}
                onEdit={() => handleEdit(item)}
                onDelete={() => handleDelete(item.id)}
              />
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 50 }}>
              <Ionicons name="book-outline" size={60} color="#CCC" />
              <Text style={{ color: "#999", marginTop: 10 }}>
                Nenhuma receita cadastrada
              </Text>
            </View>
          }
        />

        <FloatingButton onPress={handleCreate} />

        <AddRecipeModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSave={handleSave}
          recipeToEdit={editingRecipe}
        />

        <RecipeDetailsModal
          visible={detailVisible}
          onClose={() => setDetailVisible(false)}
          recipe={selectedRecipe}
          inventory={inventory}
          onCooked={() => {
            // QUANDO COZINHA, ALÉM DE ATUALIZAR A TELA, PRECISAMOS SINCRONIZAR
            // O ABAIXAMENTO DO ESTOQUE COM A NUVEM
            if (user) {
              SyncService.notifyChanges(user.id);
            }
            loadData();
          }}
        />

        <AlertModal
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          onConfirm={alertConfig.onConfirm}
          onCancel={alertConfig.onCancel}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f2f7" },
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
});