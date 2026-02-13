import { eq, and } from "drizzle-orm";
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
          unit: inventoryItems.unit, // Pega a unidade do item do estoque
          expiryDate: inventoryItems.expiryDate,
          image: products.image,
          category: products.category,
          location: inventoryItems.location,
          calories: products.calories,
          brand: products.brand,
          allergens: products.allergens,
        })
        .from(inventoryItems)
        .leftJoin(products, eq(inventoryItems.productId, products.id))
        .all();

      return result.map((item) => ({
        ...item,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
      }));
    } catch (error) {
      console.error("Erro ao buscar itens:", error);
      return [];
    }
  },

  // --- CRIAR ITEM (AQUI ESTÁ A MÁGICA) ---
  async createItem(data: any) {
    return await db.transaction(async (tx) => {
      const now = new Date();
      let productId = null;

      // 1. VERIFICA SE O PRODUTO JÁ EXISTE PELO NOME
      // Isso impede que "Arroz" vire um novo ID toda vez que você compra.
      const existingProduct = await tx
        .select()
        .from(products)
        .where(eq(products.name, data.name)) // Procura pelo nome exato
        .limit(1);

      if (existingProduct.length > 0) {
        // ENCONTROU! Vamos reutilizar o ID antigo.
        // Assim, as receitas que usam esse produto vão reconhecer o novo estoque.
        productId = existingProduct[0].id;

        // Opcional: Atualizar dados do produto se o novo tiver mais informações (ex: imagem)
        if (!existingProduct[0].image && data.image) {
          await tx
            .update(products)
            .set({ image: data.image, updatedAt: now })
            .where(eq(products.id, productId));
        }
      } else {
        // NÃO ENCONTROU. Cria um produto novo do zero.
        productId = uuidv4();
        await tx.insert(products).values({
          id: productId,
          name: data.name,
          brand: data.brand || null,
          category: data.category || null,
          defaultUnit: data.unit || "un",
          image: data.image || null,
          calories: data.calories || 0,
          allergens: data.allergens || null,
          createdAt: now,
          updatedAt: now,
        });
      }

      // 2. CRIA O ITEM DE ESTOQUE VINCULADO AO ID (NOVO OU RECICLADO)
      await tx.insert(inventoryItems).values({
        id: uuidv4(),
        productId: productId,
        quantity: data.quantity,
        unit: data.unit, // Salva a unidade específica deste lote
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        location: data.location || "pantry",
        isSynced: 0,
        createdAt: now,
        updatedAt: now,
      });
    });
  },

  // --- ATUALIZAR ITEM ---
  async updateItem(id: string, data: any) {
    const now = new Date();
    return await db.transaction(async (tx) => {
      // Busca o item para saber qual o productId dele
      const currentItem = await tx
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.id, id))
        .get();

      if (!currentItem) return;

      // Atualiza tabela de Estoque
      await tx
        .update(inventoryItems)
        .set({
          quantity: data.quantity,
          unit: data.unit,
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
          location: data.location,
          updatedAt: now,
        })
        .where(eq(inventoryItems.id, id));

      // Atualiza tabela de Produto (Dados globais)
      await tx
        .update(products)
        .set({
          name: data.name,
          image: data.image,
          brand: data.brand,
          calories: data.calories,
          allergens: data.allergens,
          updatedAt: now,
        })
        .where(eq(products.id, currentItem.productId));
    });
  },

  // --- REMOVER ITEM ---
  async deleteItem(id: string) {
    // Apaga apenas o registro de estoque.
    // O PRODUTO PERMANECE NO BANCO PARA AS RECEITAS NÃO QUEBRAREM!
    return await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
  },
};
