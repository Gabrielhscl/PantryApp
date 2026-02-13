import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db';
import * as schema from '../database/schema';

// --- DEFINIÇÃO DAS TABELAS (CORRIGIDA) ---
// O TypeScript reclamou, então agora usamos os nomes exatos do seu schema.
const inventoryTable = schema.inventoryItems; 
const recipesTable = schema.recipes;
const ingredientsTable = schema.recipeIngredients;
const productsTable = schema.products;

export const RecipeRepository = {
  // 1. Busca receitas e calcula estoque
  async findAllWithIngredients() {
    try {
      const allRecipes = await db.select().from(recipesTable).all();
      
      const recipesWithIngs = await Promise.all(allRecipes.map(async (recipe) => {
        // A. Pega os ingredientes da receita
        const ingredients = await db
          .select({
            id: ingredientsTable.id,
            quantity: ingredientsTable.quantity,
            unit: ingredientsTable.unit,
            name: productsTable.name,
            productId: productsTable.id
          })
          .from(ingredientsTable)
          .leftJoin(productsTable, eq(ingredientsTable.productId, productsTable.id))
          .where(eq(ingredientsTable.recipeId, recipe.id))
          .all();

        // B. Calcula quanto temos no estoque para cada ingrediente
        const ingredientsWithStock = await Promise.all(ingredients.map(async (ing) => {
          if (!ing.productId) return { ...ing, stockQuantity: 0 };

          // Busca no estoque pelo ID do produto
          const stockItems = await db
            .select({ qty: inventoryTable.quantity })
            .from(inventoryTable)
            .where(eq(inventoryTable.productId, ing.productId))
            .all();

          // Soma (caso tenha vários lotes do mesmo item)
          const totalStock = stockItems.reduce((sum, item) => sum + (item.qty || 0), 0);

          return { ...ing, stockQuantity: totalStock };
        }));
          
        return { ...recipe, ingredients: ingredientsWithStock };
      }));
      
      return recipesWithIngs;
    } catch (error) {
      console.error("Erro ao buscar receitas:", error);
      return [];
    }
  },

  // 2. Deletar Receita
  async deleteRecipe(id: string) {
    return await db.transaction(async (tx) => {
      await tx.delete(ingredientsTable).where(eq(ingredientsTable.recipeId, id));
      await tx.delete(recipesTable).where(eq(recipesTable.id, id));
    });
  },

  // 3. Salvar Receita (Cria ou Atualiza)
  async saveRecipe(recipeData: any, ingredients: any[]) {
    const recipeId = uuidv4();
    const now = new Date();

    return await db.transaction(async (tx) => {
      // Salva Cabeçalho
      await tx.insert(recipesTable).values({
        id: recipeId,
        name: recipeData.name,
        description: recipeData.description || "",
        instructions: recipeData.instructions || "",
        preparationTime: recipeData.preparationTime || 0,
        servings: recipeData.servings || 1,
        createdAt: now,
        updatedAt: now,
      });

      // Salva Ingredientes
      for (const ing of ingredients) {
        let finalProductId = ing.productId;

        // Se for um produto novo criado na hora (Autocomplete)
        if (ing.productId.toString().startsWith('static_')) {
          const newProductId = uuidv4();
          await tx.insert(productsTable).values({
            id: newProductId,
            name: ing.name,
            defaultUnit: ing.unit || 'un',
            createdAt: now,
            updatedAt: now
          });
          finalProductId = newProductId;
        }

        const safeQty = parseFloat(ing.quantity);
        const finalQty = isNaN(safeQty) ? 0 : safeQty;

        await tx.insert(ingredientsTable).values({
          id: uuidv4(),
          recipeId: recipeId,
          productId: finalProductId,
          quantity: finalQty,
          unit: ing.unit,
          isOptional: false
        });
      }
    });
  }
};