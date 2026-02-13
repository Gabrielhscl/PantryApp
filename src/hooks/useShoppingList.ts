//
import { useState, useCallback } from 'react';
import { ShoppingRepository } from '../repositories/shoppingRepository';

export function useShoppingList() {
  const [items, setItems] = useState<any[]>([]);

  const refresh = useCallback(async () => {
    try {
      const data = await ShoppingRepository.findAll();
      setItems(data || []);
    } catch (e) {
      console.error("Erro ao carregar lista:", e);
    }
  }, []);

  const toggleItem = async (id: string, current: boolean) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, isChecked: !current } : item));
    await ShoppingRepository.toggleCheck(id, !current);
  };

  // --- NOVA FUNÇÃO DE REMOVER ---
  const removeItem = async (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    await ShoppingRepository.deleteItem(id);
  };

  return { items, refresh, toggleItem, removeItem };
}