import { openDatabaseSync } from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import * as schema from "./schema";

// MUDAMOS PARA v17 PARA INCLUIR A TABELA DE PERFIL DE UTILIZADOR
const DATABASE_NAME = "pantry_local_v17.db";

export const expoDb = openDatabaseSync(DATABASE_NAME);
export const db = drizzle(expoDb, { schema });

export const initDatabase = async () => {
  try {
    await expoDb.execAsync(`
      PRAGMA foreign_keys = ON;

      -- TABELA DE PERFIL DE UTILIZADOR (NOVA)
      CREATE TABLE IF NOT EXISTS user_profiles (
        id TEXT PRIMARY KEY NOT NULL,
        full_name TEXT,
        phone TEXT,
        avatar_url TEXT,
        is_synced INTEGER DEFAULT 0,
        updated_at INTEGER NOT NULL
      );

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
        is_synced INTEGER DEFAULT 0,
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
        is_synced INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS recipe_ingredients (
        id TEXT PRIMARY KEY NOT NULL,
        recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
        product_id TEXT NOT NULL REFERENCES products(id),
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        is_synced INTEGER DEFAULT 0,
        is_optional INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS shopping_list_items (
        id TEXT PRIMARY KEY NOT NULL,
        product_id TEXT REFERENCES products(id),
        name TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        category TEXT,
        is_checked INTEGER DEFAULT 0,
        price REAL DEFAULT 0,
        is_synced INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS shopping_list_templates (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        is_synced INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS template_items_v2 (
        id TEXT PRIMARY KEY NOT NULL,
        template_id TEXT NOT NULL REFERENCES shopping_list_templates(id) ON DELETE CASCADE,
        product_id TEXT REFERENCES products(id),
        name TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        category TEXT DEFAULT 'Outros',
        is_checked INTEGER DEFAULT 0,
        price REAL DEFAULT 0,
        is_synced INTEGER DEFAULT 0,
        created_at INTEGER,
        updated_at INTEGER
      );
    `);
    console.log("✅ Banco v17: Pronto com suporte a Perfil Completo e Sincronização!");
  } catch (error) {
    console.error("❌ Erro ao iniciar banco:", error);
  }
};