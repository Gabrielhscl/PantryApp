import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db';
import { recipes, recipeIngredients, products } from '../database/schema';

export const RecipeRepository = {
  async findAll() {
    try {
      const allRecipes = await db.select().from(recipes).orderBy(recipes.name);
      
      const result = await Promise.all(allRecipes.map(async (r) => {
        const ingredients = await db
          .select({
            id: recipeIngredients.id,
            productId: recipeIngredients.productId,
            name: products.name,
            image: products.image,
            category: products.category, // <-- ADICIONADO: Puxa a categoria do catálogo
            defaultLocation: products.defaultLocation, // <-- ADICIONADO
            defaultUnit: products.defaultUnit, // Importante para recuperar a unidade certa
            quantity: recipeIngredients.quantity,
            unit: recipeIngredients.unit,
            isOptional: recipeIngredients.isOptional,
          })
          .from(recipeIngredients)
          .leftJoin(products, eq(recipeIngredients.productId, products.id))
          .where(eq(recipeIngredients.recipeId, r.id));

        return { ...r, ingredients };
      }));

      return result;
    } catch (error) {
      console.error("Erro ao buscar receitas:", error);
      return [];
    }
  },

  async createRecipe(data: any) {
    return await db.transaction(async (tx) => {
      const recipeId = uuidv4();
      const now = new Date();

      await tx.insert(recipes).values({
        id: recipeId,
        name: data.name,
        description: data.description,
        instructions: data.instructions,
        preparationTime: data.preparationTime || 0,
        servings: data.servings || 1,
        image: data.image,
        createdAt: now,
        updatedAt: now,
      });

      if (data.ingredients && data.ingredients.length > 0) {
        for (const ing of data.ingredients) {
          await tx.insert(recipeIngredients).values({
            id: uuidv4(),
            recipeId: recipeId,
            productId: ing.productId,
            quantity: ing.quantity,
            unit: ing.unit,
            isOptional: ing.isOptional ? 1 : 0
          });
        }
      }
      return recipeId;
    });
  },

  // --- NOVA FUNÇÃO DE ATUALIZAR ---
  async updateRecipe(id: string, data: any) {
    return await db.transaction(async (tx) => {
      const now = new Date();

      // 1. Atualiza dados básicos
      await tx.update(recipes).set({
        name: data.name,
        instructions: data.instructions,
        preparationTime: data.preparationTime,
        servings: data.servings,
        image: data.image, // Se quiser permitir mudar foto depois
        updatedAt: now,
      }).where(eq(recipes.id, id));

      // 2. Remove ingredientes antigos
      await tx.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, id));

      // 3. Recria ingredientes atualizados
      if (data.ingredients && data.ingredients.length > 0) {
        for (const ing of data.ingredients) {
          await tx.insert(recipeIngredients).values({
            id: uuidv4(),
            recipeId: id,
            productId: ing.productId,
            quantity: ing.quantity,
            unit: ing.unit,
            isOptional: ing.isOptional ? 1 : 0
          });
        }
      }
    });
  },

  async deleteRecipe(id: string) {
    return await db.transaction(async (tx) => {
      await tx.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, id));
      await tx.delete(recipes).where(eq(recipes.id, id));
    });
  }
};