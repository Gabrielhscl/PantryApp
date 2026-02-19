import "react-native-get-random-values";
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import InventoryScreen from "./src/screens/InventoryScreen";
import RecipesScreen from "./src/screens/RecipesScreen";
import ShoppingListScreen from "./src/screens/ShoppingListScreen";
import ProductsScreen from "./src/screens/ProductsScreen";

// Importa os nossos Ecrãs Modernos
import TemplatesScreen from "./src/screens/TemplatesScreen";
import TemplateDetailScreen from "./src/screens/TemplateDetailScreen";
import ImportNfceScreen from "./src/screens/ImportNfceScreen";

import { initDatabase } from "./src/database/db";
import { ToastProvider } from "./src/contexts/ToastContext";
import { COLORS } from "./src/constants/theme";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.text.secondary,
        tabBarStyle: {
          paddingBottom: 5,
          height: 60,
          borderTopColor: COLORS.border,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "home";
          if (route.name === "Estoque")
            iconName = focused ? "cube" : "cube-outline";
          else if (route.name === "Receitas")
            iconName = focused ? "restaurant" : "restaurant-outline";
          else if (route.name === "Lista")
            iconName = focused ? "cart" : "cart-outline";
          else if (route.name === "Catálogo")
            iconName = focused ? "grid" : "grid-outline";
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

  if (!dbReady)
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ToastProvider>
        <NavigationContainer>
          {/* FORÇA A BARRA DE ESTADO DO TELEMÓVEL A FICAR PRETA POR CIMA DO ECRÃ BRANCO/CINZA */}
          <StatusBar
            style="dark"
            backgroundColor="transparent"
            translucent={true}
          />

          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Main" component={MainTabs} />

            {/* ECRÃ DE LISTAS FIXAS PRINCIPAL */}
            <Stack.Screen
              name="Templates"
              component={TemplatesScreen}
              // headerShown: false para usarmos o nosso lindo ScreenHeader
            />

            {/* ECRÃ DE DENTRO DA LISTA FIXA */}
            <Stack.Screen
              name="TemplateDetails"
              component={TemplateDetailScreen}
              options={{ headerShown: false }}
            />

            {/* ECRÃ DE LEITURA DE NOTA FISCAL (NFCe) */}
            <Stack.Screen
              name="ImportNfce"
              component={ImportNfceScreen}
              options={{ presentation: "modal" }} // Fica bonito abrindo de baixo pra cima
            />
          </Stack.Navigator>
        </NavigationContainer>
      </ToastProvider>
    </GestureHandlerRootView>
  );
}
