import { useState, useCallback } from 'react';
import { RecipeRepository } from '../repositories/recipeRepository';
import { useFocusEffect } from '@react-navigation/native'; 

export function useRecipes() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Função que busca APENAS no banco local
  const loadRecipes = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await RecipeRepository.findAllWithIngredients();
      setRecipes(data);
    } catch (e) {
      console.error("Erro ao carregar receitas locais:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Recarrega sempre que você entra na tela
  useFocusEffect(
    useCallback(() => {
      loadRecipes();
    }, [loadRecipes])
  );

  return { 
    recipes, 
    isLoading, 
    refresh: loadRecipes 
  };
}