// src/services/productService.ts

// Traduções e Formatações (Mantidas e Expandidas)
const TAG_TRANSLATIONS: Record<string, string> = {
  'en:gluten': 'Glúten', 'en:milk': 'Leite', 'en:eggs': 'Ovos', 
  'en:nuts': 'Nozes', 'en:peanuts': 'Amendoim', 'en:soybeans': 'Soja', 
  'en:fish': 'Peixe', 'en:crustaceans': 'Crustáceos', 'en:mustard': 'Mostarda', 
  'en:celery': 'Aipo', 'en:sesame-seeds': 'Gergelim', 
  'en:sulphur-dioxide-and-sulphites': 'Sulfitos', 'en:wheat': 'Trigo', 
  'en:barley': 'Cevada', 'en:oats': 'Aveia', 'en:rye': 'Centeio',
  'en:vegan': 'Vegano', 'en:vegetarian': 'Vegetariano',
  'en:no-sugar': 'Sem Açúcar', 'en:palm-oil-free': 'Sem Óleo de Palma',
  'en:organic': 'Orgânico'
};

const UNIT_MAP: Record<string, string> = {
  'gram': 'g', 'grams': 'g', 'grama': 'g', 'gramas': 'g', 'g': 'g',
  'kilogram': 'kg', 'kilograms': 'kg', 'kilo': 'kg', 'kg': 'kg',
  'liter': 'L', 'liters': 'L', 'litro': 'L', 'l': 'L',
  'milliliter': 'ml', 'milliliters': 'ml', 'ml': 'ml'
};

const formatTag = (text: string) => {
  if (!text) return '';
  const lower = text.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

export const ProductService = {
  async fetchProductByBarcode(barcode: string) {
    try {
      // 1. Busca na API (Tenta BR, depois Mundial)
      let response = await fetch(`https://br.openfoodfacts.org/api/v2/product/${barcode}.json`);
      let data = await response.json();

      if (data.status !== 1) {
        response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
        data = await response.json();
      }

      if (data.status === 1 && data.product) {
        const p = data.product;
        const nutriments = p.nutriments || {};
        
        // --- NOME E MARCA ---
        const name = p.product_name_pt || p.product_name || p.generic_name || "";
        const brand = p.brands ? p.brands.split(',')[0] : "";

        // --- CATEGORIA (NOVO) ---
        // A API manda algo como "en:snacks,en:salty-snacks,en:popcorn". 
        // Vamos tentar pegar a última (geralmente a mais específica) e traduzir/limpar.
        let category = "Geral";
        if (p.categories_tags && p.categories_tags.length > 0) {
            // Pega a categoria mais específica (última da lista)
            const rawCat = p.categories_tags[p.categories_tags.length - 1]; 
            // Remove o prefixo de idioma (en: ou pt:) e formata
            category = formatTag(rawCat.replace(/^[a-z]{2}:/, '').replace(/-/g, ' '));
        }

        // --- TAMANHO DA EMBALAGEM ---
        let packSize = 0;
        let packUnit = 'un'; 
        if (p.quantity) {
           const match = p.quantity.match(/([0-9.,]+)\s*([a-zA-Z]+)/);
           if (match) {
               packSize = parseFloat(match[1].replace(',', '.'));
               const rawUnit = match[2].toLowerCase();
               packUnit = UNIT_MAP[rawUnit] || rawUnit; 
           }
        }

        // --- LOCAL DE ARMAZENAMENTO INTELIGENTE (MELHORADO) ---
        let detectedLocation = 'pantry'; // Padrão
        
        // Strings para análise
        const cats = (p.categories || "").toLowerCase();
        const labels = (p.labels || "").toLowerCase();
        const nameLow = name.toLowerCase();

        // 1. Freezer
        if (cats.includes('frozen') || cats.includes('congelado') || labels.includes('congelado') || 
            nameLow.includes('sorvete') || nameLow.includes('hambúrguer') || nameLow.includes('gelo')) {
          detectedLocation = 'freezer';
        } 
        // 2. Geladeira
        else if (
            cats.includes('refrigerated') || cats.includes('geladeira') || 
            cats.includes('fresh foods') || cats.includes('frescos') ||
            cats.includes('cheeses') || cats.includes('queijos') ||
            cats.includes('meats') || cats.includes('carnes') ||
            nameLow.includes('leite') || nameLow.includes('iogurte') || 
            nameLow.includes('requeijão') || nameLow.includes('manteiga') ||
            nameLow.includes('presunto') || nameLow.includes('peito de peru')
        ) {
          // Exceção: Leite UHT (caixinha) geralmente fica na despensa antes de abrir
          if (!cats.includes('uht') && !nameLow.includes('uht') && !nameLow.includes('em pó')) {
             detectedLocation = 'fridge';
          }
        }

        // --- TAGS E ALERTAS ---
        const rawTags = [...(p.allergens_tags || []), ...(p.labels_tags || [])];
        const processedTags = rawTags
            .map((tag: string) => {
                if (TAG_TRANSLATIONS[tag]) return TAG_TRANSLATIONS[tag];
                if (tag.startsWith('pt:')) return formatTag(tag.replace('pt:', ''));
                if (tag.startsWith('en:')) return null;
                return formatTag(tag);
            })
            .filter((t) => t !== null && t.length > 2)
            .filter((v, i, a) => a.indexOf(v) === i);

        // Se for ultraprocessado (NOVA 4), adiciona alerta
        if (p.nova_group === 4) {
            processedTags.push("Ultraprocessado ⚠️");
        }

        return {
          found: true,
          barcode: barcode,
          name,
          image: p.image_url || null,
          brand,
          category, // Campo Novo!
          
          // Nutrição
          calories: nutriments['energy-kcal_100g'] || 0,
          carbs: nutriments.carbohydrates_100g || 0,
          protein: nutriments.proteins_100g || 0,
          fat: nutriments.fat_100g || 0,
          fiber: nutriments.fiber_100g || 0,
          sodium: nutriments.sodium_100g ? nutriments.sodium_100g * 1000 : 0,

          packSize,
          packUnit,
          location: detectedLocation,
          allergens: processedTags.join(', ') 
        };
      }
      
      return { found: false };

    } catch (error) {
      console.error("Erro na API:", error);
      return { found: false };
    }
  }
};