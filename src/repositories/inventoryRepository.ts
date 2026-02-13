import { eq, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db';
import { inventoryItems, products } from '../database/schema';

export const InventoryRepository = {
  
  // --- CRIAR ITEM ---
  async createItem(data: {
    name: string;
    quantity: number;
    unit: string;
    location: string;
    expiryDate?: Date;
    image?: string | null;
    calories?: number;
    allergens?: string;
    brand?: string;
  }) {
    const productId = uuidv4();
    const inventoryId = uuidv4();
    const now = new Date();

    try {
      // 1. Cria o Produto (Metadados)
      await db.insert(products).values({
        id: productId,
        name: data.name,
        defaultUnit: data.unit,
        image: data.image,
        calories: data.calories,
        allergens: data.allergens,
        brand: data.brand,
        createdAt: now,
        updatedAt: now,
      });

      // 2. Cria o Item de Estoque
      await db.insert(inventoryItems).values({
        id: inventoryId,
        productId: productId,
        quantity: data.quantity,
        expiryDate: data.expiryDate,
        location: data.location,
        minimumStock: 0,
        isSynced: false,
        createdAt: now,
        updatedAt: now,
      });

      return true;
    } catch (error) {
      console.error("Erro no Repositório (Create):", error);
      throw error;
    }
  },

  // --- ATUALIZAR ITEM (CORRIGIDO) ---
  async updateItem(id: string, data: {
    name: string;
    quantity: number;
    unit: string;
    location: string; // <--- ADICIONADO AQUI
    expiryDate?: Date;
    image?: string | null;
    calories?: number;
    allergens?: string;
  }) {
    try {
        const now = new Date();

        // 1. Atualiza a tabela de Estoque (Quantidade, Validade e LOCAL)
        await db.update(inventoryItems)
          .set({ 
            quantity: data.quantity, 
            expiryDate: data.expiryDate,
            location: data.location, // <--- AGORA SALVA O LOCAL NA ATUALIZAÇÃO
            updatedAt: now
          })
          .where(eq(inventoryItems.id, id));

        // 2. Busca o productId associado
        const item = await db.select({ productId: inventoryItems.productId })
          .from(inventoryItems)
          .where(eq(inventoryItems.id, id))
          .get();

        if (item) {
            // 3. Atualiza o Produto (Nome, Foto, etc)
            await db.update(products)
              .set({
                name: data.name,
                defaultUnit: data.unit,
                image: data.image,
                calories: data.calories,
                allergens: data.allergens,
                updatedAt: now
              })
              .where(eq(products.id, item.productId));
        }
        return true;
    } catch (error) {
        console.error("Erro no Repositório (Update):", error);
        throw error;
    }
  },

  // --- BUSCAR TODOS ---
  async findAll() {
    return await db
      .select({
        id: inventoryItems.id,
        productId: inventoryItems.productId,
        quantity: inventoryItems.quantity,
        expiryDate: inventoryItems.expiryDate,
        location: inventoryItems.location,
        minimumStock: inventoryItems.minimumStock,
        name: products.name,
        unit: products.defaultUnit,
        image: products.image,
        brand: products.brand,
        calories: products.calories,
        allergens: products.allergens
        // REMOVIDO: location: inventoryItems.location (já estava ali em cima, sem vírgula antes causava erro)
      })
      .from(inventoryItems)
      .leftJoin(products, eq(inventoryItems.productId, products.id));
  },

  async updateQuantity(id: string, newQuantity: number) {
    await db.update(inventoryItems)
      .set({ quantity: newQuantity, updatedAt: new Date() })
      .where(eq(inventoryItems.id, id));
  },

  async delete(id: string) {
    await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
  },

  async searchProducts(query: string) {
    return await db.select({
        id: products.id,
        name: products.name,
        defaultUnit: products.defaultUnit
      })
      .from(products)
      .where(sql`lower(${products.name}) LIKE ${`%${query.toLowerCase()}%`}`)
      .limit(5);
  }
};