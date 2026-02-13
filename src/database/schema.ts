import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// Tabela de Produtos (Catálogo Geral - Metadados)
export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  brand: text('brand'), // Nova: Marca
  category: text('category'), // ex: 'laticinios', 'graos'
  defaultUnit: text('default_unit').notNull(), // 'kg', 'un', 'L'
  image: text('image'),
  calories: real('calories'),
  protein: real('protein'), // Nova: Proteína
  allergens: text('allergens'),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Tabela de Estoque (Seu inventário pessoal)
export const inventoryItems = sqliteTable('inventory_items', {
  id: text('id').primaryKey(),
  productId: text('product_id').references(() => products.id).notNull(),
  
  quantity: real('quantity').notNull(), // Numérico! Nunca texto.
  
  expiryDate: integer('expiry_date', { mode: 'timestamp' }),
  location: text('location').notNull(), // 'geladeira', 'freezer', 'armario'
  
  minimumStock: real('minimum_stock').default(0), // Insight de Startup 🚀
  
  isSynced: integer('is_synced', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// --- Tabela de Receitas (Cabeçalho) ---
export const recipes = sqliteTable('recipes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  instructions: text('instructions').notNull(), // O passo a passo
  preparationTime: integer('preparation_time'), // em minutos
  servings: integer('servings').default(1).notNull(), // Porções base para o cálculo de escala
  image: text('image'),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// --- Tabela de Ingredientes da Receita (Relacional) ---
export const recipeIngredients = sqliteTable('recipe_ingredients', {
  id: text('id').primaryKey(),
  recipeId: text('recipe_id').references(() => recipes.id).notNull(),
  
  // Referência ao produto do catálogo (permite match com estoque e macros futuramente)
  productId: text('product_id').references(() => products.id).notNull(),
  
  quantity: real('quantity').notNull(), // Quantidade necessária para as porções base
  unit: text('unit').notNull(), // Unidade de medida (g, ml, un)
  isOptional: integer('is_optional', { mode: 'boolean' }).default(false),
});