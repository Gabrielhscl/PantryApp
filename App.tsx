import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler'; // <--- IMPORTANTE: IMPORTAR ISTO

// --- BASE DE DADOS & SERVIÇOS ---
import { initDatabase } from './src/database/db';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ToastProvider } from './src/contexts/ToastContext';

// --- TELAS DE AUTENTICAÇÃO ---
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';

// --- TELAS PRINCIPAIS (ABAS) ---
import InventoryScreen from './src/screens/InventoryScreen';
import RecipesScreen from './src/screens/RecipesScreen';
import ShoppingListScreen from './src/screens/ShoppingListScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// --- TELAS SECUNDÁRIAS (STACK) ---
import TemplatesScreen from './src/screens/TemplatesScreen';
import TemplateDetailScreen from './src/screens/TemplateDetailScreen';
import ProductsScreen from './src/screens/ProductsScreen';
import ImportNfceScreen from './src/screens/ImportNfceScreen';

// --- TEMA ---
import { COLORS } from './src/constants/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// --- NAVEGADOR DE ABAS (BOTTOM TABS) ---
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.background,
          borderTopColor: COLORS.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.text.secondary,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          if (route.name === 'Estoque') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'Receitas') {
            iconName = focused ? 'book' : 'book-outline';
          } else if (route.name === 'Lista') {
            iconName = focused ? 'cart' : 'cart-outline';
          } else if (route.name === 'Perfil') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Estoque" component={InventoryScreen} />
      <Tab.Screen name="Receitas" component={RecipesScreen} />
      <Tab.Screen name="Lista" component={ShoppingListScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// --- CONTROLADOR DE NAVEGAÇÃO (AUTH WALL) ---
function NavigationWrapper() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!session ? (
        // --- SE NÃO ESTIVER LOGADO (AUTH STACK) ---
        <Stack.Group>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Group>
      ) : (
        // --- SE ESTIVER LOGADO (APP STACK) ---
        <Stack.Group>
          {/* As abas principais */}
          <Stack.Screen name="Main" component={MainTabs} />
          
          {/* Telas de Navegação Profunda */}
          <Stack.Screen name="Templates" component={TemplatesScreen} />
          <Stack.Screen name="TemplateDetail" component={TemplateDetailScreen} />
          <Stack.Screen name="Products" component={ProductsScreen} />
          
          {/* Telas Modais */}
          <Stack.Screen 
            name="ImportNfce" 
            component={ImportNfceScreen} 
            options={{ presentation: 'modal' }}
          />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}

// --- COMPONENTE RAIZ ---
export default function App() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    const setup = async () => {
      // Inicializa o banco de dados (SQLite)
      await initDatabase();
      setDbReady(true);
    };
    setup();
  }, []);

  if (!dbReady) {
    return null; 
  }

  return (
    // <--- IMPORTANTE: ENVOLVER TUDO COM GestureHandlerRootView
    <GestureHandlerRootView style={{ flex: 1 }}> 
      <SafeAreaProvider>
        <AuthProvider>
          <ToastProvider>
            <NavigationContainer>
              <StatusBar style="dark" />
              <NavigationWrapper />
            </NavigationContainer>
          </ToastProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}