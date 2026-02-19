# 🛒 PantryApp

O **PantryApp** é um aplicativo inteligente de gestão de despensa, lista de compras e receitas, construído com React Native e Expo. Ele ajuda a controlar o que tem em casa, planear as compras de forma eficiente e cozinhar receitas abatendo os ingredientes automaticamente do estoque.

Tudo isto a funcionar de forma **100% offline**, com uma base de dados local super rápida!

---

## ✨ Funcionalidades Principais

* 📦 **Gestão de Estoque Inteligente:**
  * Registo de produtos por local (Armário, Geladeira, Freezer).
  * Controlo de quantidades, unidades de medida e datas de validade.
  * Alertas visuais para produtos a expirar ou já vencidos.
  * Alternância de visualização entre Unidades (UN) e Medidas base (Ex: gramas, litros).

* 📝 **Lista de Compras Dinâmica:**
  * Adição rápida de itens com suporte a categorias.
  * Acompanhamento de preços e cálculo do total do carrinho em tempo real.

* 📋 **Listas Fixas (Templates):**
  * Crie listas padrão como "Feira Mensal", "Churrasco de Domingo", etc.
  * **Mágica do Estoque:** O sistema cruza os itens da lista fixa com a sua despensa e diz exatamente o que falta. Adicione ao carrinho *apenas* o que precisa comprar!

* 🍳 **Receitas e Modo "Cozinhar":**
  * Guarde as suas receitas favoritas com os respetivos ingredientes.
  * Ajuste de porções (se a receita é para 2 pessoas e quer fazer para 4, a app calcula tudo).
  * **Verificador de Ingredientes:** Diz-lhe se tem stock suficiente ou se falta algo (com visualização tipo semáforo).
  * Botão "Cozinhar": Abate automaticamente os ingredientes usados do seu estoque atual.

* 📷 **Ferramentas Extra:**
  * Leitor de Código de Barras integrado para adicionar produtos rapidamente.
  * Importação de faturas/notas (NFC-e).

---

## 🚀 Tecnologias Utilizadas

Este projeto foi desenvolvido utilizando as tecnologias mais modernas do ecossistema mobile:

* **[React Native](https://reactnative.dev/)** / **[Expo](https://expo.dev/)** - Framework Mobile
* **[TypeScript](https://www.typescriptlang.org/)** - Tipagem estática
* **[Drizzle ORM](https://orm.drizzle.team/)** - ORM moderno e seguro em TypeScript
* **[Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)** - Base de dados local relacional
* **[React Navigation](https://reactnavigation.org/)** - Navegação entre ecrãs (Stack & Bottom Tabs)
* **[Expo Camera](https://docs.expo.dev/versions/latest/sdk/camera/)** - Leitura de códigos de barras
* **[React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/)** - Para interações de swipe (deslizar para apagar/editar)

---

## 🛠️ Como Executar o Projeto

### Pré-requisitos
Certifique-se de que tem instalado na sua máquina:
* [Node.js](https://nodejs.org/)
* [Git](https://git-scm.com/)
* App **Expo Go** no seu smartphone (Android/iOS) ou um emulador configurado.

### Passos de Instalação

1. **Clone o repositório:**
   ```bash
   git clone [https://github.com/seu-usuario/pantryapp.git](https://github.com/seu-usuario/pantryapp.git)
   cd pantryapp
