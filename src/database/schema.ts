import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  barcode: text('barcode'),
  name: text('name').notNull(),
  brand: text('brand'),
  
  category: text('category'), // Vamos padronizar isso na tela
  
  // --- NOVO: LOCAL PADRÃO ---
  defaultLocation: text('default_location'), // 'pantry', 'fridge', 'freezer'

  // --- NOVO: TAMANHO DA EMBALAGEM ---
  packSize: real('pack_size'), // ex: 395
  packUnit: text('pack_unit'), // ex: 'g'
  
  defaultUnit: text('default_unit').notNull(), // Unidade geral de consumo (ex: 'un')
  
  image: text('image'),
  
  // Nutrição
  calories: real('calories'),
  carbs: real('carbs'),
  protein: real('protein'),
  fat: real('fat'),
  fiber: real('fiber'),
  sodium: real('sodium'),

  allergens: text('allergens'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// ... Mantenha inventoryItems, recipes e recipeIngredients iguais ...
// (Só copiei a products para focar na mudança)
export const inventoryItems = sqliteTable('inventory_items', {
  id: text('id').primaryKey(),
  productId: text('product_id').references(() => products.id).notNull(),
  quantity: real('quantity').notNull(),
  unit: text('unit'),
  expiryDate: integer('expiry_date', { mode: 'timestamp' }),
  location: text('location').notNull(),
  minimumStock: real('minimum_stock').default(0),
  isSynced: integer('is_synced', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const recipes = sqliteTable('recipes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  instructions: text('instructions').notNull(),
  preparationTime: integer('preparation_time'),
  servings: integer('servings').default(1).notNull(),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const recipeIngredients = sqliteTable('recipe_ingredients', {
  id: text('id').primaryKey(),
  recipeId: text('recipe_id').references(() => recipes.id).notNull(),
  productId: text('product_id').references(() => products.id).notNull(),
  quantity: real('quantity').notNull(),
  unit: text('unit').notNull(),
  isOptional: integer('is_optional', { mode: 'boolean' }).default(false),
});

export const shoppingListItems = sqliteTable('shopping_list_items', {
  id: text('id').primaryKey(),
  productId: text('product_id').references(() => products.id),
  name: text('name').notNull(),
  quantity: real('quantity').notNull(),
  unit: text('unit').notNull(),
  category: text('category'),
  isChecked: integer('is_checked', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Adicione ao final do src/database/schema.ts

export const shoppingListTemplates = sqliteTable('shopping_list_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(), // Ex: "Feira Mensal", "Churrasco"
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const templateItems = sqliteTable('template_items', {
  id: text('id').primaryKey(),
  templateId: text('template_id').references(() => shoppingListTemplates.id).notNull(),
  productId: text('product_id').references(() => products.id),
  name: text('name').notNull(),
  quantity: real('quantity').notNull(),
  unit: text('unit').notNull(),
  category: text('category'),
});