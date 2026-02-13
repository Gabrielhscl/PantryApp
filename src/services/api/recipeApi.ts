const API_KEY = '95d3bc76e0fb4246ad6260c7b1209128';
const BASE_URL = 'https://api.spoonacular.com/recipes';

export const RecipeApi = {
  // Busca receitas que usam o máximo dos seus ingredientes
  async findByIngredients(ingredients: string[]) {
    const ingredientsList = ingredients.join(',');
    const response = await fetch(
      `${BASE_URL}/findByIngredients?ingredients=${ingredientsList}&number=10&ranking=1&apiKey=${API_KEY}`
    );
    return await response.json();
  },

  // Busca os detalhes (instruções, tempo, macros)
  async getDetails(id: number) {
    const response = await fetch(
      `${BASE_URL}/${id}/information?includeNutrition=true&apiKey=${API_KEY}`
    );
    return await response.json();
  }
};