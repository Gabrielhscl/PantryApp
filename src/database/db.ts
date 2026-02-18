import { openDatabaseSync } from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import * as schema from "./schema";

// MUDÁMOS A VERSÃO PARA v12 PARA APAGAR O BANCO ANTIGO E CRIAR AS NOVAS COLUNAS
const DATABASE_NAME = "pantry_local_v13.db";

export const expoDb = openDatabaseSync(DATABASE_NAME);
export const db = drizzle(expoDb, { schema });

export const initDatabase = async () => {
  try {
    await expoDb.execAsync(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY NOT NULL,
        barcode TEXT,
        name TEXT NOT NULL,
        brand TEXT,
        category TEXT,
        default_location TEXT,
        pack_size REAL,
        pack_unit TEXT,
        default_unit TEXT NOT NULL,
        image TEXT,
        calories REAL,
        carbs REAL,
        protein REAL,
        fat REAL,
        fiber REAL,
        sodium REAL,
        allergens TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS inventory_items (
        id TEXT PRIMARY KEY NOT NULL,
        product_id TEXT NOT NULL REFERENCES products(id),
        quantity REAL NOT NULL,
        unit TEXT,
        expiry_date INTEGER,
        location TEXT NOT NULL,
        minimum_stock REAL DEFAULT 0,
        is_synced INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS recipes (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        instructions TEXT NOT NULL,
        preparation_time INTEGER,
        servings INTEGER DEFAULT 1,
        image TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS recipe_ingredients (
        id TEXT PRIMARY KEY NOT NULL,
        recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
        product_id TEXT NOT NULL REFERENCES products(id),
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        is_optional INTEGER DEFAULT 0
      );

      -- --- TABELA ATUALIZADA: AGORA COM A COLUNA 'price' ---
      CREATE TABLE IF NOT EXISTS shopping_list_items (
        id TEXT PRIMARY KEY NOT NULL,
        product_id TEXT REFERENCES products(id),
        name TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        category TEXT,
        is_checked INTEGER DEFAULT 0,
        price REAL DEFAULT 0,  -- <--- COLUNA ADICIONADA AQUI!
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS shopping_list_templates (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS template_items (
        id TEXT PRIMARY KEY NOT NULL,
        template_id TEXT NOT NULL REFERENCES shopping_list_templates(id) ON DELETE CASCADE,
        product_id TEXT REFERENCES products(id),
        name TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        category TEXT
      );
    `);
    console.log("✅ Banco v13: Pronto com suporte a preços na Lista de Compras!");
  } catch (error) {
    console.error("❌ Erro ao iniciar banco:", error);
  }
};