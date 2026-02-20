import { db } from "../database/db";
import {
  products,
  inventoryItems,
  shoppingListItems,
  templateItems,
  recipes,
  recipeIngredients,
  shoppingListTemplates,
} from "../database/schema";
import { supabase } from "../lib/supabase";
import { eq } from "drizzle-orm";

// Mapeamento das tabelas locais para o Supabase
const TABLES_TO_SYNC = [
  { name: "products", schema: products },
  { name: "inventory_items", schema: inventoryItems },
  { name: "recipes", schema: recipes },
  { name: "recipe_ingredients", schema: recipeIngredients },
  { name: "shopping_list_items", schema: shoppingListItems },
  { name: "shopping_list_templates", schema: shoppingListTemplates },
  { name: "template_items_v2", schema: templateItems },
];

export const SyncService = {
  async syncAll(userId: string, silent = false) {
    if (!silent) console.log("🔄 Iniciando Sincronização...");
    let changesCount = 0;

    for (const table of TABLES_TO_SYNC) {
      try {
        // 1. PUSH (Enviar locais novos/editados para a nuvem)
        const unsyncedRows = await db
          .select()
          .from(table.schema)
          .where(eq(table.schema.isSynced, false))
          .all();

        if (unsyncedRows.length > 0) {
          if (!silent)
            console.log(
              `📤 Enviando ${unsyncedRows.length} itens de ${table.name}...`,
            );

          const rowsToUpload = unsyncedRows.map((row: any) => {
            // Criamos o objeto de upload mapeando camelCase para snake_case
            const mappedData: any = {
              ...row,
              user_id: userId,
              updated_at: new Date().toISOString(),
            };

            // Mapeamento manual para colunas que o Supabase exige em snake_case
            if (row.createdAt) {
              mappedData.created_at =
                row.createdAt instanceof Date
                  ? row.createdAt.toISOString()
                  : new Date(row.createdAt).toISOString();
              delete mappedData.createdAt;
            }
            if (row.updatedAt) {
              mappedData.updated_at =
                row.updatedAt instanceof Date
                  ? row.updatedAt.toISOString()
                  : new Date(row.updatedAt).toISOString();
              delete mappedData.updatedAt;
            }
            if (row.productId) {
              mappedData.product_id = row.productId;
              delete mappedData.productId;
            }
            if (row.expiryDate) {
              mappedData.expiry_date =
                row.expiryDate instanceof Date
                  ? row.expiryDate.toISOString()
                  : new Date(row.expiryDate).toISOString();
              delete mappedData.expiryDate;
            }
            if (row.defaultLocation) {
              mappedData.default_location = row.defaultLocation;
              delete mappedData.defaultLocation;
            }
            if (row.packSize !== undefined) {
              mappedData.pack_size = row.packSize;
              delete mappedData.packSize;
            }
            if (row.packUnit) {
              mappedData.pack_unit = row.packUnit;
              delete mappedData.packUnit;
            }
            if (row.defaultUnit) {
              mappedData.default_unit = row.defaultUnit;
              delete mappedData.defaultUnit;
            }
            if (row.minimumStock !== undefined) {
              mappedData.minimum_stock = row.minimumStock;
              delete mappedData.minimumStock;
            }
            if (row.preparationTime !== undefined) {
              mappedData.preparation_time = row.preparationTime;
              delete mappedData.preparationTime;
            }
            if (row.recipeId) {
              mappedData.recipe_id = row.recipeId;
              delete mappedData.recipeId;
            }
            if (row.isOptional !== undefined) {
              mappedData.is_optional = row.isOptional;
              delete mappedData.isOptional;
            }
            if (row.isChecked !== undefined) {
              mappedData.is_checked = row.isChecked;
              delete mappedData.isChecked;
            }
            if (row.templateId) {
              mappedData.template_id = row.templateId;
              delete mappedData.templateId;
            }

            // Remove o controle local isSynced antes de enviar para o Supabase
            delete mappedData.isSynced;

            return mappedData;
          });

          const { error } = await supabase
            .from(table.name)
            .upsert(rowsToUpload);
          if (error) throw error;

          // Marca como sincronizado no SQLite local
          for (const row of unsyncedRows) {
            await db
              .update(table.schema)
              .set({ isSynced: true })
              .where(eq(table.schema.id, row.id));
          }
          changesCount += unsyncedRows.length;
        }

        // 2. PULL (Baixar da nuvem para o telemóvel)
        const { data: remoteRows, error: fetchError } = await supabase
          .from(table.name)
          .select("*")
          .eq("user_id", userId);

        if (fetchError) throw fetchError;

        if (remoteRows && remoteRows.length > 0) {
          for (const remoteRow of remoteRows) {
            // Mapeamos de volta de snake_case para camelCase para o SQLite/Drizzle
            const localData: any = {
              ...remoteRow,
              isSynced: true,
              createdAt: remoteRow.created_at
                ? new Date(remoteRow.created_at)
                : new Date(),
              updatedAt: remoteRow.updated_at
                ? new Date(remoteRow.updated_at)
                : new Date(),
            };

            // Conversões reversas
            if (remoteRow.product_id)
              localData.productId = remoteRow.product_id;
            if (remoteRow.expiry_date)
              localData.expiryDate = new Date(remoteRow.expiry_date);
            if (remoteRow.default_location)
              localData.defaultLocation = remoteRow.default_location;
            if (remoteRow.pack_size !== undefined)
              localData.packSize = remoteRow.pack_size;
            if (remoteRow.pack_unit) localData.packUnit = remoteRow.pack_unit;
            if (remoteRow.default_unit)
              localData.defaultUnit = remoteRow.default_unit;
            if (remoteRow.minimum_stock !== undefined)
              localData.minimumStock = remoteRow.minimum_stock;
            if (remoteRow.preparation_time !== undefined)
              localData.preparationTime = remoteRow.preparation_time;
            if (remoteRow.recipe_id) localData.recipeId = remoteRow.recipe_id;
            if (remoteRow.is_optional !== undefined)
              localData.isOptional = remoteRow.is_optional;
            if (remoteRow.is_checked !== undefined)
              localData.isChecked = remoteRow.is_checked;
            if (remoteRow.template_id)
              localData.templateId = remoteRow.template_id;

            // Limpa campos que não existem no schema local (snake_case do Supabase)
            delete localData.user_id;
            delete localData.created_at;
            delete localData.updated_at;
            delete localData.product_id;
            delete localData.expiry_date;
            delete localData.default_location;
            delete localData.pack_size;
            delete localData.pack_unit;
            delete localData.default_unit;
            delete localData.minimum_stock;
            delete localData.preparation_time;
            delete localData.recipe_id;
            delete localData.is_optional;
            delete localData.is_checked;
            delete localData.template_id;

            await db
              .insert(table.schema)
              .values(localData)
              .onConflictDoUpdate({ target: table.schema.id, set: localData });
          }
        }
      } catch (error) {
        console.error(`❌ Erro sync ${table.name}:`, error);
      }
    }
    if (!silent) console.log("✅ Sync Concluído!");
  },

  async clearLocalData() {
    console.log("Sweep 🧹 Limpando dados locais...");
    try {
      await db.delete(templateItems);
      await db.delete(shoppingListItems);
      await db.delete(recipeIngredients);
      await db.delete(recipes);
      await db.delete(inventoryItems);
      await db.delete(products);
      await db.delete(shoppingListTemplates);
      console.log("✨ Base de dados local limpa!");
    } catch (e) {
      console.error("Erro ao limpar dados:", e);
    }
  },
  async notifyChanges(userId: string) {
    // Esta função apenas dispara o sync silenciosamente
    // Pode ser chamada após qualquer INSERT, UPDATE ou DELETE
    this.syncAll(userId, true);
  },
};
