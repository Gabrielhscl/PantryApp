import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { GestureHandlerRootView } from "react-native-gesture-handler"; // Importante para o Swipe

// Componentes UI
import { ScreenHeader } from "../components/ui/ScreenHeader"; 
import { FloatingButton } from "../components/ui/FloatingButton";
import { RecipeCard } from "../components/RecipeCard";

// Modais
import { AddRecipeModal } from "../components/modals/AddRecipeModal";
import { RecipeDetailsModal } from "../components/modals/RecipeDetailsModal";

// Hook e Repositório
import { useRecipes } from "../hooks/useRecipes";
import { RecipeRepository } from "../repositories/recipeRepository";

export default function RecipesScreen() {
  const { recipes, refresh } = useRecipes();
  
  // Controle de Estados
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<any>(null); // Dados para edição
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null); // Dados para visualização

  // --- AÇÃO DE EXCLUIR ---
  const handleDelete = (recipe: any) => {
    Alert.alert(
      "Excluir Receita",
      `Tem certeza que deseja apagar "${recipe.name}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Excluir", 
          style: "destructive", 
          onPress: async () => {
            await RecipeRepository.deleteRecipe(recipe.id);
            refresh(); // Atualiza a lista após excluir
          } 
        }
      ]
    );
  };

  // --- AÇÃO DE EDITAR ---
  const handleEdit = (recipe: any) => {
    setEditingRecipe(recipe); // Carrega os dados no estado
    setIsAddModalOpen(true);  // Abre o modal de adicionar (que vai virar de editar)
  };

  return (
    // GestureHandlerRootView DEVE envolver a tela para o deslize funcionar no Android
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        
        {/* Header Geral */}
        <ScreenHeader 
          subtitle="Minha Cozinha" 
          title="Livro de Receitas" 
          onIconPress={() => {}}
        />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* Cabeçalho da Seção (Contador) */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Suas Receitas</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{recipes.length}</Text>
            </View>
          </View>

          {/* LISTA DE RECEITAS */}
          {recipes.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBg}>
                <Ionicons name="book-outline" size={48} color="#007AFF" />
              </View>
              <Text style={styles.emptyTitle}>Livro Vazio</Text>
              <Text style={styles.emptyText}>
                Toque no botão + para cadastrar sua primeira receita.
              </Text>
            </View>
          ) : (
            recipes.map((item) => (
              <RecipeCard 
                key={item.id}
                data={item}
                variant="local"
                onPress={() => setSelectedRecipe(item)} // Abre detalhes
                onDelete={() => handleDelete(item)}     // Swipe Delete
                onEdit={() => handleEdit(item)}         // Swipe Edit
              />
            ))
          )}
          
          {/* Espaço para o botão flutuante não cobrir o último item */}
          <View style={{ height: 80 }} />
        </ScrollView>

        {/* Botão Flutuante (Add) */}
        <FloatingButton onPress={() => {
          setEditingRecipe(null); // Limpa edição para criar um novo
          setIsAddModalOpen(true);
        }} />

        {/* MODAL 1: ADICIONAR / EDITAR */}
        <AddRecipeModal 
          visible={isAddModalOpen} 
          initialData={editingRecipe} // Passa os dados se estiver editando
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingRecipe(null); // Limpa ao fechar
          }} 
          onSaveSuccess={refresh} 
        />
        
        {/* MODAL 2: VER DETALHES (Estava faltando no seu código anterior!) */}
        <RecipeDetailsModal 
          visible={!!selectedRecipe}
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
        />

      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  content: { padding: 20 },
  
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1C1C1E' },
  countBadge: { backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  countText: { color: '#007AFF', fontWeight: 'bold', fontSize: 12 },

  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#8E8E93', textAlign: 'center', lineHeight: 22 }
});