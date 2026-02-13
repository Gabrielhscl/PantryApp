import { useState, useCallback } from 'react';
import { ShoppingRepository } from '../repositories/shoppingRepository';

export function useShoppingList() {
  const [items, setItems] = useState<any[]>([]);

  const refresh = useCallback(async () => {
    const data = await ShoppingRepository.findAll();
    setItems(data);
  }, []);

  const toggleItem = async (id: string, current: boolean) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, isChecked: !current } : item));
    await ShoppingRepository.toggleCheck(id, !current);
  };

  return { items, refresh, toggleItem };
}