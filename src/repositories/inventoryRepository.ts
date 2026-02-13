import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "../database/db";
import { inventoryItems, products } from "../database/schema";

export const InventoryRepository = {
  // --- LISTAR ITENS ---
  async findAll() {
    try {
      const result = await db
        .select({
          id: inventoryItems.id,
          productId: products.id,
          name: products.name,
          quantity: inventoryItems.quantity,
          unit: inventoryItems.unit,
          expiryDate: inventoryItems.expiryDate,
          createdAt: inventoryItems.createdAt, // Trazemos a data de criação/compra
          image: products.image,
          category: products.category,
          location: inventoryItems.location,
          calories: products.calories,
          carbs: products.carbs,
          protein: products.protein,
          fat: products.fat,
          fiber: products.fiber,
          sodium: products.sodium,
          brand: products.brand,
          allergens: products.allergens,
          packSize: products.packSize,
          packUnit: products.packUnit,
        })
        .from(inventoryItems)
        .leftJoin(products, eq(inventoryItems.productId, products.id))
        .all();

      return result.map((item) => ({
        ...item,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
        createdAt: item.createdAt ? new Date(item.createdAt) : null,
      }));
    } catch (error) {
      console.error("Erro ao buscar itens:", error);
      return [];
    }
  },

  async createItem(data: any) {
    return await db.transaction(async (tx) => {
      const now = new Date();
      let productId = null;

      const existingProduct = await tx
        .select()
        .from(products)
        .where(eq(products.name, data.name))
        .limit(1);

      if (existingProduct.length > 0) {
        productId = existingProduct[0].id;
        // Atualiza imagem se vier nova
        if (!existingProduct[0].image && data.image) {
          await tx
            .update(products)
            .set({ image: data.image, updatedAt: now })
            .where(eq(products.id, productId));
        }
      } else {
        productId = uuidv4();
        await tx.insert(products).values({
          id: productId,
          name: data.name,
          brand: data.brand || null,
          category: data.category || null,
          defaultUnit: data.unit || "un",
          image: data.image || null,
          calories: data.calories || 0,
          packSize: data.packSize,
          packUnit: data.packUnit,
          createdAt: now,
          updatedAt: now,
        });
      }

      await tx.insert(inventoryItems).values({
        id: uuidv4(),
        productId: productId,
        quantity: data.quantity,
        unit: data.unit,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        location: data.location || "pantry",
        // AQUI ESTÁ O TRUQUE: Usamos a data que veio do form ou 'now'
        createdAt: data.createdAt ? new Date(data.createdAt) : now,
        updatedAt: now,
        isSynced: 0,
      });
    });
  },

  async updateItem(id: string, data: any) {
    const now = new Date();
    return await db.transaction(async (tx) => {
      const currentItem = await tx
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.id, id))
        .get();
      if (!currentItem) return;

      await tx
        .update(inventoryItems)
        .set({
          quantity: data.quantity,
          unit: data.unit,
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
          // Permitimos editar a data de compra
          createdAt: data.createdAt
            ? new Date(data.createdAt)
            : currentItem.createdAt,
          location: data.location,
          updatedAt: now,
        })
        .where(eq(inventoryItems.id, id));

      // Atualiza info básica do produto
      await tx
        .update(products)
        .set({
          name: data.name,
          image: data.image,
          brand: data.brand,
          updatedAt: now,
        })
        .where(eq(products.id, currentItem.productId));
    });
  },

  async updateQuantity(id: string, newQuantity: number) {
    return await db
      .update(inventoryItems)
      .set({ quantity: newQuantity, updatedAt: new Date() })
      .where(eq(inventoryItems.id, id));
  },

  async deleteItem(id: string) {
    return await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
  },
};
