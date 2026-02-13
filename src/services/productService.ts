// src/services/productService.ts

// Mapa para traduzir códigos da API para Português bonito
const TAG_TRANSLATIONS: Record<string, string> = {
  'en:gluten': 'Glúten', 
  'en:milk': 'Leite', 
  'en:eggs': 'Ovos', 
  'en:nuts': 'Nozes',
  'en:peanuts': 'Amendoim', 
  'en:soybeans': 'Soja', 
  'en:fish': 'Peixe',
  'en:crustaceans': 'Crustáceos', 
  'en:mustard': 'Mostarda', 
  'en:celery': 'Aipo',
  'en:sesame-seeds': 'Gergelim', 
  'en:sulphur-dioxide-and-sulphites': 'Sulfitos',
  'en:wheat': 'Trigo', 
  'en:barley': 'Cevada', 
  'en:oats': 'Aveia', 
  'en:rye': 'Centeio',
  'en:vegan': 'Vegano',
  'en:vegetarian': 'Vegetariano',
  'en:no-sugar': 'Sem Açúcar',
  'en:palm-oil-free': 'Sem Óleo de Palma'
};

const UNIT_MAP: Record<string, string> = {
  'gram': 'g', 'grams': 'g', 'grama': 'g', 'gramas': 'g',
  'kilogram': 'kg', 'kilograms': 'kg', 'kilo': 'kg',
  'liter': 'L', 'liters': 'L', 'litro': 'L',
  'milliliter': 'ml', 'milliliters': 'ml', 'ml': 'ml'
};

// Função auxiliar para deixar Primeira Letra Maiúscula (Title Case)
const formatTag = (text: string) => {
  if (!text) return '';
  const lower = text.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

export const ProductService = {
  async fetchProductByBarcode(barcode: string) {
    try {
      // Tenta na API Brasileira primeiro
      let response = await fetch(`https://br.openfoodfacts.org/api/v2/product/${barcode}.json`);
      let data = await response.json();

      if (data.status !== 1) {
        // Tenta na API Mundial se falhar
        response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
        data = await response.json();
      }

      if (data.status === 1 && data.product) {
        const p = data.product;
        
        // 1. Dados Básicos
        const name = p.product_name_pt || p.product_name || p.generic_name || "";
        const calories = p.nutriments ? p.nutriments['energy-kcal_100g'] : 0;
        const brand = p.brands ? p.brands.split(',')[0] : "";

        // 2. Extração Inteligente de Tamanho (Ex: "395g")
        let packSize = 0;
        let packUnit = 'un';
        if (p.quantity) {
            const match = p.quantity.match(/([0-9.,]+)\s*([a-zA-Z]+)/);
            if (match) {
                packSize = parseFloat(match[1].replace(',', '.'));
                const rawUnit = match[2].toLowerCase();
                packUnit = UNIT_MAP[rawUnit] || 'un';
            }
        }

        // 3. Identificação Automática de Local (NOVO)
        let detectedLocation = 'pantry'; // Padrão: Armário
        const categories = (p.categories || "").toLowerCase();
        const productNameLower = name.toLowerCase();

        // Lógica para Freezer
        if (categories.includes('frozen') || categories.includes('congelado') || productNameLower.includes('sorvete') || productNameLower.includes('hambúrguer')) {
          detectedLocation = 'freezer';
        } 
        // Lógica para Geladeira
        else if (
            categories.includes('refrigerated') || 
            categories.includes('geladeira') || 
            categories.includes('laticínios') || 
            categories.includes('dairy') ||
            productNameLower.includes('leite') || 
            productNameLower.includes('iogurte') || 
            productNameLower.includes('manteiga') ||
            productNameLower.includes('queijo')
        ) {
          detectedLocation = 'fridge';
        }

        // 4. PROCESSAMENTO DE TAGS
        const rawTags = [
            ...(p.allergens_tags || []),
            ...(p.labels_tags || [])
        ];

        const processedTags = rawTags
            .map((tag: string) => {
                if (TAG_TRANSLATIONS[tag]) return TAG_TRANSLATIONS[tag];
                if (tag.startsWith('pt:')) return formatTag(tag.replace('pt:', ''));
                if (tag.startsWith('en:')) return null; 
                return formatTag(tag);
            })
            .filter((t) => t !== null && t.length > 2)
            .filter((v, i, a) => a.indexOf(v) === i);

        return {
          found: true,
          name,
          image: p.image_url || null,
          calories: calories || 0,
          packSize,
          packUnit,
          brand,
          location: detectedLocation, // Retorna o local identificado
          allergens: processedTags.join(',') 
        };
      }
      
      return { found: false };

    } catch (error) {
      console.error("Erro na API:", error);
      return { found: false };
    }
  }
};