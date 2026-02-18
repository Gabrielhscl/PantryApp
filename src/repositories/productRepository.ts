import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "../database/db";
import { products } from "../database/schema";
import { Product } from "../types"; // Importando a tipagem

export const ProductRepository = {
  async findAll(): Promise<Product[]> {
    return (await db.select().from(products).all()) as unknown as Product[];
  },

  async findByBarcode(barcode: string) {
    const result = await db
      .select()
      .from(products)
      .where(eq(products.barcode, barcode))
      .limit(1);
    return result.length > 0 ? result[0] : null;
  },

  async createProduct(data: any) {
    const now = new Date();
    return await db.insert(products).values({
      id: uuidv4(),
      barcode: data.barcode || null,
      name: data.name,
      brand: data.brand || null,
      category: data.category || "Outros",
      defaultUnit: data.unit || "un",
      defaultLocation: data.defaultLocation || "pantry",
      // GARANTIR QUE O PACKSIZE É SALVO AQUI
      packSize: data.packSize || null,
      packUnit: data.packUnit || null,
      image: data.image || null,
      calories: data.calories || 0,
      carbs: data.carbs || 0,
      protein: data.protein || 0,
      fat: data.fat || 0,
      fiber: data.fiber || 0,
      sodium: data.sodium || 0,
      allergens: data.allergens || null,
      createdAt: now,
      updatedAt: now,
    });
  },

  async updateProduct(id: string, data: any) {
    return await db
      .update(products)
      .set({
        barcode: data.barcode || null,
        name: data.name,
        brand: data.brand || null,
        category: data.category || "Outros",
        defaultUnit: data.unit || "un",
        defaultLocation: data.defaultLocation || "pantry",
        // GARANTIR QUE O PACKSIZE É ATUALIZADO AQUI
        packSize: data.packSize || null,
        packUnit: data.packUnit || null,
        image: data.image || null,
        calories: data.calories || 0,
        carbs: data.carbs || 0,
        protein: data.protein || 0,
        fat: data.fat || 0,
        fiber: data.fiber || 0,
        sodium: data.sodium || 0,
        allergens: data.allergens || null,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id));
  },

  async deleteProduct(id: string) {
    return await db.delete(products).where(eq(products.id, id));
  },
};
