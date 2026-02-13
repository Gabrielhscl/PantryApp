import { eq, like } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db';
import { products, inventoryItems, recipeIngredients } from '../database/schema';

export const ProductRepository = {
  async findAll() {
    try {
      return await db.select().from(products).orderBy(products.name);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
      return [];
    }
  },

  async findByBarcode(barcode: string) {
    const result = await db.select().from(products).where(eq(products.barcode, barcode));
    return result[0] || null;
  },

  async createProduct(data: any) {
    const id = uuidv4();
    const now = new Date();
    await db.insert(products).values({
      id,
      barcode: data.barcode || null,
      name: data.name,
      brand: data.brand,
      category: data.category,
      
      // Novos Campos
      defaultLocation: data.defaultLocation || 'pantry',
      packSize: data.packSize || 0,
      packUnit: data.packUnit || 'un',
      defaultUnit: data.unit || 'un', // Mantemos compatibilidade
      
      image: data.image,
      calories: data.calories || 0,
      carbs: data.carbs || 0,
      protein: data.protein || 0,
      fat: data.fat || 0,
      fiber: data.fiber || 0,
      sodium: data.sodium || 0,
      allergens: data.allergens,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },

  async updateProduct(id: string, data: any) {
    const now = new Date();
    await db.update(products).set({
      name: data.name,
      brand: data.brand,
      category: data.category,
      
      defaultLocation: data.defaultLocation,
      packSize: data.packSize,
      packUnit: data.packUnit,
      defaultUnit: data.unit,

      image: data.image,
      calories: data.calories,
      carbs: data.carbs,
      protein: data.protein,
      fat: data.fat,
      fiber: data.fiber,
      sodium: data.sodium,
      updatedAt: now,
    }).where(eq(products.id, id));
  },
  
  async deleteProduct(id: string) {
    return await db.transaction(async (tx) => {
      await tx.delete(inventoryItems).where(eq(inventoryItems.productId, id));
      await tx.delete(recipeIngredients).where(eq(recipeIngredients.productId, id));
      await tx.delete(products).where(eq(products.id, id));
    });
  }
};