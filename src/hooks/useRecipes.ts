//
import { useState, useCallback } from 'react';
import { RecipeRepository } from '../repositories/recipeRepository';
import { useFocusEffect } from '@react-navigation/native'; 

export function useRecipes() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadRecipes = useCallback(async () => {
    setIsLoading(true);
    try {
      // CORREÇÃO: Usando o nome correto da função do repositório
      const data = await RecipeRepository.findAll(); 
      setRecipes(data);
    } catch (e) {
      console.error("Erro ao carregar receitas locais:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecipes();
    }, [loadRecipes])
  );

  return { recipes, isLoading, refresh: loadRecipes };
}