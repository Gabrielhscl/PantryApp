export interface Product {
  id: string;
  name: string;
  brand?: string;
  image?: string;
  category?: string;
  defaultUnit: string;
  defaultLocation?: 'pantry' | 'fridge' | 'freezer';
  packSize?: number;
  packUnit?: string;
  calories?: number;
  allergens?: string;
}

export interface ShoppingItem {
  id: string;
  productId?: string;
  name: string;
  quantity: number;
  unit: string;
  category?: string;
  isChecked: boolean;
}

export interface InventoryItem extends Product {
  quantity: number;
  location: string;
  expiryDate?: Date;
  createdAt?: Date;
}