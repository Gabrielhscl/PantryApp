import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "../database/db";
import { shoppingListItems } from "../database/schema";

export const ShoppingRepository = {
  async findAll() {
    return await db.select().from(shoppingListItems).all();
  },

  async addItem(data: any) {
    const now = new Date();
    return await db.insert(shoppingListItems).values({
      id: uuidv4(),
      productId: data.productId || null,
      name: data.name,
      quantity: data.quantity,
      unit: data.unit,
      category: data.category || "Outros",
      isChecked: false,
      price: data.price || 0, // <--- GUARDAR O PREÇO NOVO
      createdAt: now,
      updatedAt: now,
    });
  },

  async updateItem(id: string, data: any) {
    return await db
      .update(shoppingListItems)
      .set({
        name: data.name,
        quantity: data.quantity,
        unit: data.unit,
        category: data.category,
        price: data.price || 0, // <--- ATUALIZAR O PREÇO AO EDITAR
        updatedAt: new Date(),
      })
      .where(eq(shoppingListItems.id, id));
  },

  async toggleCheck(id: string, isChecked: boolean) {
    return await db
      .update(shoppingListItems)
      .set({ isChecked, updatedAt: new Date() })
      .where(eq(shoppingListItems.id, id));
  },

  async deleteItem(id: string) {
    return await db
      .delete(shoppingListItems)
      .where(eq(shoppingListItems.id, id));
  },
};
