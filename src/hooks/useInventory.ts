//
import { useState, useEffect, useCallback } from 'react';
import { InventoryRepository } from '../repositories/inventoryRepository';
import { Alert } from 'react-native';

export function useInventory() {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'fridge' | 'freezer' | 'pantry'>('all');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await InventoryRepository.findAll();
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const increment = async (id: string, current: number) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, quantity: current + 1 } : item));
    // Ajustado para chamar updateItem ou uma função específica de quantidade
    await InventoryRepository.updateQuantity(id, current + 1);
  };

  const decrement = async (id: string, current: number) => {
    if (current <= 1) {
      Alert.alert("Remover item?", "A quantidade chegará a zero.", [
        { text: "Cancelar", style: "cancel" },
        { text: "Remover", style: "destructive", onPress: () => removeItem(id) }
      ]);
      return;
    }
    setItems(prev => prev.map(item => item.id === id ? { ...item, quantity: current - 1 } : item));
    await InventoryRepository.updateQuantity(id, current - 1);
  };

  const removeItem = async (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    // CORREÇÃO: Chamando o nome correto da função no repositório
    await InventoryRepository.deleteItem(id); 
  };

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true;
    return item.location === filter;
  });

  return {
    items: filteredItems,
    filter,
    setFilter,
    refresh: loadData,
    actions: { increment, decrement, removeItem }
  };
}