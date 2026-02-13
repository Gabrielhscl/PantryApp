// src/services/recipeService.ts

// Tabela de conversão aproximada para base (g ou ml)
const UNIT_CONVERSION: Record<string, number> = {
  'g': 1,
  'ml': 1,
  'kg': 1000,
  'l': 1000,
  'xícara': 240,
  'xicara': 240,
  'c. sopa': 15,
  'c. chá': 5,
  'c. café': 2,
  'lata': 395, // Padrão comum para leite condensado/creme de leite
  'pct': 500,  // Padrão comum para massas
};

export const RecipeService = {
  /**
   * Converte uma quantidade para uma unidade base (g ou ml)
   */
  convertToBase(qty: number, unit: string): number {
    if (!unit) return qty;
    const u = unit.toLowerCase();
    const factor = UNIT_CONVERSION[u] || 1;
    return qty * factor;
  },

  /**
   * Verifica a disponibilidade de um item considerando conversão de unidades
   */
  checkIngredientAvailability(neededQty: number, neededUnit: string, stockQty: number, stockUnit: string) {
    const neededInBase = this.convertToBase(neededQty, neededUnit);
    const stockInBase = this.convertToBase(stockQty, stockUnit);

    return {
      hasEnough: stockInBase >= neededInBase,
      neededInBase,
      stockInBase
    };
  },

  checkAvailability(recipe: any, inventory: any[]) {
    let missingCount = 0;
    let missingIngredients: string[] = [];

    const ingredients = recipe.ingredients || [];

    ingredients.forEach((ing: any) => {
      if (ing.isOptional) return;

      const inStock = inventory.find(item => item.productId === ing.productId);

      if (!inStock) {
        missingCount++;
        missingIngredients.push(ing.name);
      } else {
        const { hasEnough } = this.checkIngredientAvailability(
          ing.quantity, ing.unit, 
          inStock.quantity, inStock.unit
        );

        if (!hasEnough) {
          missingCount++;
          missingIngredients.push(ing.name);
        }
      }
    });

    if (missingCount === 0) return { status: 'ready', label: 'Pronto para cozinhar! 🍳', color: '#34C759' };
    if (missingCount === 1) return { status: 'almost', label: `Falta só ${missingIngredients[0]}`, color: '#FF9500' };
    return { status: 'missing', label: `Faltam ${missingCount} ingredientes`, color: '#FF3B30' };
  }
};