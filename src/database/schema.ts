import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  barcode: text('barcode'),
  name: text('name').notNull(),
  brand: text('brand'),
  category: text('category'), 
  defaultLocation: text('default_location'), 
  packSize: real('pack_size'), 
  packUnit: text('pack_unit'), 
  defaultUnit: text('default_unit').notNull(), 
  image: text('image'),
  calories: real('calories'),
  carbs: real('carbs'),
  protein: real('protein'),
  fat: real('fat'),
  fiber: real('fiber'),
  sodium: real('sodium'),
  allergens: text('allergens'),
  isSynced: integer('is_synced', { mode: 'boolean' }).default(false), // <--- ADICIONADO AQUI
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const inventoryItems = sqliteTable('inventory_items', {
  id: text('id').primaryKey(),
  productId: text('product_id').references(() => products.id).notNull(),
  quantity: real('quantity').notNull(),
  unit: text('unit'),
  expiryDate: integer('expiry_date', { mode: 'timestamp' }),
  location: text('location').notNull(),
  minimumStock: real('minimum_stock').default(0),
  isSynced: integer('is_synced', { mode: 'boolean' }).default(false), // JÁ TINHA
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
  isSynced: integer('is_synced', { mode: 'boolean' }).default(false), // <--- ADICIONADO AQUI
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
  isSynced: integer('is_synced', { mode: 'boolean' }).default(false), // <--- ADICIONADO AQUI
});

export const shoppingListItems = sqliteTable('shopping_list_items', {
  id: text('id').primaryKey(),
  productId: text('product_id').references(() => products.id),
  name: text('name').notNull(),
  quantity: real('quantity').notNull(),
  unit: text('unit').notNull(),
  category: text('category'),
  isChecked: integer('is_checked', { mode: 'boolean' }).default(false),
  price: real('price').default(0), 
  isSynced: integer('is_synced', { mode: 'boolean' }).default(false), // <--- ADICIONADO AQUI
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const shoppingListTemplates = sqliteTable('shopping_list_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  isSynced: integer('is_synced', { mode: 'boolean' }).default(false), // <--- ADICIONADO AQUI
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const templateItems = sqliteTable('template_items_v2', {
  id: text('id').primaryKey(),
  productId: text('product_id').references(() => products.id),
  name: text('name').notNull(),
  quantity: real('quantity').notNull(),
  unit: text('unit').notNull(),
  category: text('category').default("Outros"),
  isChecked: integer('is_checked', { mode: 'boolean' }).default(false),
  price: real('price').default(0), 
  isSynced: integer('is_synced', { mode: 'boolean' }).default(false), // <--- ADICIONADO AQUI
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
  templateId: text("template_id").notNull().references(() => shoppingListTemplates.id, { onDelete: 'cascade' }),
});

// Adicione isto ao seu schema.ts
export const userProfiles = sqliteTable('user_profiles', {
  id: text('id').primaryKey(), // Mesmo ID do Supabase Auth
  fullName: text('full_name'),
  phone: text('phone'),
  avatarUrl: text('avatar_url'),
  isSynced: integer('is_synced', { mode: 'boolean' }).default(false),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});