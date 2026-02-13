// src/services/recipeService.ts

// Helper para converter tudo para a menor unidade (g ou ml)
const normalizeValue = (qty: number, unit: string) => {
    if (!unit) return qty;
    const u = unit.toLowerCase();
    if (u === 'kg' || u === 'l') return qty * 1000;
    return qty; // g, ml, un
};

export const RecipeService = {
  checkAvailability(recipe: any, inventory: any[]) {
    let missingCount = 0;
    let missingIngredients: string[] = [];

    const ingredients = recipe.ingredients || [];

    ingredients.forEach((ing: any) => {
      if (ing.isOptional) return;

      // 1. Procura no estoque pelo ID do Produto (match exato)
      const inStock = inventory.find(item => item.productId === ing.productId);

      if (!inStock) {
        missingCount++;
        missingIngredients.push(ing.name);
      } else {
        // 2. Verifica se a quantidade é suficiente
        const stockQty = normalizeValue(inStock.quantity, inStock.unit);
        const recipeQty = normalizeValue(ing.quantity, ing.unit);

        if (stockQty < recipeQty) {
          missingCount++;
          missingIngredients.push(ing.name);
        }
      }
    });

    // Retorna status visual
    if (missingCount === 0) return { status: 'ready', label: 'Pronto para cozinhar! 🍳', color: '#34C759' }; // Verde
    if (missingCount === 1) return { status: 'almost', label: `Falta só ${missingIngredients[0]}`, color: '#FF9500' }; // Laranja
    return { status: 'missing', label: `Faltam ${missingCount} ingredientes`, color: '#FF3B30' }; // Vermelho
  }
};