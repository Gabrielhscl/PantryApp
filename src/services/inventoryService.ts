import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db';
import { products, inventoryItems } from '../database/schema';

export const InventoryService = {
  // Recebe allergens agora
  async addItem(name: string, quantity: string, unit: string, expiryDate?: Date, image?: string, calories?: number, allergens?: string) {
    try {
      const productId = uuidv4();
      const inventoryId = uuidv4();

      await db.insert(products).values({
        id: productId,
        name,
        defaultUnit: unit,
        image: image || null,
        calories: calories || 0,
        allergens: allergens || null, // <--- Salva aqui
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db.insert(inventoryItems).values({
        id: inventoryId,
        productId: productId,
        quantity: parseFloat(quantity),
        expiryDate: expiryDate,
        location: 'pantry',
        isSynced: false,
      });

      return true;
    } catch (error) {
      console.error("Erro ao adicionar item:", error);
      return false;
    }
  },

  async getAllItems() {
    const result = await db
      .select({
        id: inventoryItems.id,
        quantity: inventoryItems.quantity,
        expiryDate: inventoryItems.expiryDate,
        productName: products.name,
        unit: products.defaultUnit,
        productImage: products.image,
        calories: products.calories,
        allergens: products.allergens // <--- Recupera aqui
      })
      .from(inventoryItems)
      .leftJoin(products, eq(inventoryItems.productId, products.id));

    return result;
  }
};