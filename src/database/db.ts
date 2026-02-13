import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

const DATABASE_NAME = "pantry_local_v9.db"; // Versão 9

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
        default_location TEXT, -- Novo
        pack_size REAL,        -- Novo
        pack_unit TEXT,        -- Novo
        
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
      
      -- (O SQL das outras tabelas continua igual ao anterior, não precisa mudar) --
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
    `);
    console.log('✅ Banco v9: Suporte a embalagens e locais padrão!');
  } catch (error) {
    console.error('❌ Erro ao iniciar banco:', error);
  }
};