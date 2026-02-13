// src/services/recipeService.ts (Atualizado)

import { RecipeApi } from './api/recipeApi';

export const RecipeService = {
  // ... lógica de escala que já criamos ...

  async getRecipesFromStock(inventoryItems: any[]) {
    // 1. Extrai nomes dos produtos do seu estoque
    const ingredientNames = inventoryItems.map(i => i.name);
    
    // 2. Busca na API
    const rawRecipes = await RecipeApi.findByIngredients(ingredientNames);

    // 3. Adapter: Converte para o SEU formato de dados
    return rawRecipes.map((raw: any) => ({
      externalId: raw.id,
      name: raw.title,
      image: raw.image,
      missingCount: raw.missedIngredientCount,
      usedCount: raw.usedIngredientCount,
      // Mapeia ingredientes que faltam para facilitar a criação da lista de compras
      missingIngredients: raw.missedIngredients.map((i: any) => i.name)
    }));
  }
};