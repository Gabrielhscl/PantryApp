import { openDatabaseSync } from 'expo-sqlite'; // ou 'expo-sqlite' dependendo da versão
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

// Mudei para v6 para garantir um arquivo limpo
const DATABASE_NAME = "pantry_local_v6.db";

export const expoDb = openDatabaseSync(DATABASE_NAME);
export const db = drizzle(expoDb, { schema });

export const initDatabase = async () => {
  try {
    // Vamos criar TODAS as tabelas agora.
    // Se o banco v6 não existir, ele cria tudo.
    await expoDb.execAsync(`
      PRAGMA foreign_keys = ON;

      -- 1. Tabela de Produtos
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        brand TEXT,
        category TEXT,
        default_unit TEXT NOT NULL,
        image TEXT,
        calories REAL,
        protein REAL,
        allergens TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      
      -- 2. Tabela de Estoque
      CREATE TABLE IF NOT EXISTS inventory_items (
        id TEXT PRIMARY KEY NOT NULL,
        product_id TEXT NOT NULL REFERENCES products(id),
        quantity REAL NOT NULL,
        expiry_date INTEGER,
        location TEXT NOT NULL,
        minimum_stock REAL DEFAULT 0,
        is_synced INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      -- 3. Tabela de Receitas (ESTAVA FALTANDO ISSO AQUI!)
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

      -- 4. Tabela de Ingredientes da Receita (E ISSO TAMBÉM!)
      CREATE TABLE IF NOT EXISTS recipe_ingredients (
        id TEXT PRIMARY KEY NOT NULL,
        recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
        product_id TEXT NOT NULL REFERENCES products(id),
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        is_optional INTEGER DEFAULT 0
      );
    `);
    
    console.log('✅ Banco de dados v6 inicializado com TODAS as tabelas!');
  } catch (error) {
    console.error('❌ Erro ao iniciar banco:', error);
  }
};