import { eq, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db';
import { shoppingListTemplates, templateItems, inventoryItems, products } from '../database/schema';

export const TemplateRepository = {
  async findAll() {
    return await db.select().from(shoppingListTemplates).all();
  },

  async createTemplate(name: string) {
    const id = uuidv4();
    await db.insert(shoppingListTemplates).values({
      id,
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return id;
  },

  async addItemToTemplate(templateId: string, data: any) {
    return await db.insert(templateItems).values({
      id: uuidv4(),
      templateId,
      productId: data.productId || null,
      name: data.name,
      quantity: data.quantity,
      unit: data.unit,
      category: data.category || 'Outros'
    });
  },

  async deleteTemplate(id: string) {
    return await db.delete(shoppingListTemplates).where(eq(shoppingListTemplates.id, id));
  },

  // Busca os itens da lista fixa e compara em tempo real com a soma do estoque
  async getItemsWithStockStatus(templateId: string) {
    const items = await db
      .select({
        id: templateItems.id,
        productId: templateItems.productId,
        name: templateItems.name,
        targetQty: templateItems.quantity,
        unit: templateItems.unit,
        category: templateItems.category,
        // Soma todas as entradas do mesmo produto no estoque
        stockQty: sql<number>`(SELECT SUM(quantity) FROM inventory_items WHERE product_id = ${templateItems.productId})`,
      })
      .from(templateItems)
      .where(eq(templateItems.templateId, templateId))
      .all();

    return items.map(item => {
      const current = item.stockQty || 0;
      let status: 'ok' | 'low' | 'missing' = 'missing';
      
      if (current >= item.targetQty) status = 'ok';
      else if (current > 0) status = 'low';

      return { ...item, currentStock: current, status };
    });
  }
};