import "react-native-get-random-values"; // Mantenha sempre na linha 1
import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar"; // <--- 1. IMPORT NECESSÁRIO
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import InventoryScreen from "./src/screens/InventoryScreen";
import RecipesScreen from "./src/screens/RecipesScreen";
import ShoppingListScreen from "./src/screens/ShoppingListScreen";
import { initDatabase } from "./src/database/db";

const Tab = createBottomTabNavigator();

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

  if (!dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        {/* OPÇÃO 1: Remover a Barra de Sistema (Bateria/Hora) 
          Adicione hidden={true} para sumir com ela.
        */}
        <StatusBar style="auto" hidden={false} />

        <Tab.Navigator
          screenOptions={({ route }) => ({
            // OPÇÃO 2: Remover o Cabeçalho (Onde diz "Estoque")
            // Mude para false se quiser sumir com o título do App
            headerShown: false,

            tabBarActiveTintColor: "#2f95dc",
            tabBarInactiveTintColor: "gray",
            tabBarStyle: { paddingBottom: 5, height: 60 },
            tabBarIcon: ({ focused, color, size }) => {
              let iconName: keyof typeof Ionicons.glyphMap = "home";

              if (route.name === "Estoque")
                iconName = focused ? "cube" : "cube-outline";
              else if (route.name === "Receitas")
                iconName = focused ? "restaurant" : "restaurant-outline";
              else if (route.name === "Lista")
                iconName = focused ? "cart" : "cart-outline";

              return <Ionicons name={iconName} size={size} color={color} />;
            },
          })}
        >
          <Tab.Screen name="Estoque" component={InventoryScreen} />
          <Tab.Screen name="Receitas" component={RecipesScreen} />
          <Tab.Screen name="Lista" component={ShoppingListScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
