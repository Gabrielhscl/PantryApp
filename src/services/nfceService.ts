// src/services/nfceService.ts

export interface NfceItem {
  id: string; // Gerado temporariamente
  originalName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unit: string; // un, kg, etc.
}

export const NfceService = {
  async fetchItemsFromQRUrl(url: string): Promise<NfceItem[]> {
    // Aqui no futuro vai entrar a lógica de Web Scraping usando uma
    // biblioteca como o 'cheerio' ou fazendo uma chamada para uma API própria.

    console.log("A ler URL da SEFAZ:", url);

    // Simulando o tempo de carregamento da internet (2 segundos)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // DADOS FALSOS para você montar a interface visual primeiro
    return [
      {
        id: "1",
        originalName: "LEITE COND MOCA 395G",
        quantity: 2,
        unitPrice: 6.5,
        totalPrice: 13.0,
        unit: "UN",
      },
      {
        id: "2",
        originalName: "FILE DE PEITO FRANGO SADIA KG",
        quantity: 1.5,
        unitPrice: 22.0,
        totalPrice: 33.0,
        unit: "KG",
      },
      {
        id: "3",
        originalName: "ARROZ BRANCO CAMIL 1KG",
        quantity: 5,
        unitPrice: 5.9,
        totalPrice: 29.5,
        unit: "UN",
      },
    ];
  },
};
