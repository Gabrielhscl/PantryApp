import "react-native-get-random-values";
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack"; // <--- NOVO IMPORT
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import InventoryScreen from "./src/screens/InventoryScreen";
import RecipesScreen from "./src/screens/RecipesScreen";
import ShoppingListScreen from "./src/screens/ShoppingListScreen";
import ProductsScreen from "./src/screens/ProductsScreen";
import TemplatesScreen from "./src/screens/TemplatesScreen"; // Vamos criar
import TemplateDetailScreen from "./src/screens/TemplateDetailScreen"; // Vamos criar
import { initDatabase } from "./src/database/db";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator(); // <--- NOVA PILHA

// Crie um componente separado para as Abas
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#2f95dc",
        tabBarInactiveTintColor: "gray",
        tabBarStyle: { paddingBottom: 5, height: 60 },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "home";
          if (route.name === "Estoque") iconName = focused ? "cube" : "cube-outline";
          else if (route.name === "Receitas") iconName = focused ? "restaurant" : "restaurant-outline";
          else if (route.name === "Lista") iconName = focused ? "cart" : "cart-outline";
          else if (route.name === "Catálogo") iconName = focused ? "grid" : "grid-outline";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Estoque" component={InventoryScreen} />
      <Tab.Screen name="Receitas" component={RecipesScreen} />
      <Tab.Screen name="Lista" component={ShoppingListScreen} />
      <Tab.Screen name="Catálogo" component={ProductsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    const setup = async () => {
      try {
        await initDatabase();
        setDbReady(true);
      } catch (e) {
        console.error("Erro ao iniciar banco:", e);
      }
    };
    setup();
  }, []);

  if (!dbReady) return <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><ActivityIndicator size="large" color="#0000ff" /></View>;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <StatusBar style="auto" />
        {/* A Stack envolve tudo. As abas são apenas a "tela principal" */}
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={MainTabs} />
          {/* Telas que abrem "por cima" das abas */}
          <Stack.Screen name="Templates" component={TemplatesScreen} options={{ headerShown: true, title: 'Meus Modelos' }} />
          <Stack.Screen name="TemplateDetail" component={TemplateDetailScreen} options={{ headerShown: true, title: 'Detalhes do Modelo' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}