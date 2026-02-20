import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../contexts/AuthContext";
import { CustomInput } from "../../components/ui/CustomInput";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { COLORS, SPACING, RADIUS } from "../../constants/theme";

export default function LoginScreen({ navigation }: any) {
  const { signIn, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      return Alert.alert("Erro", "Preencha todos os campos.");
    }

    const { error, data } = await signIn(email, password); // <-- Pegando o data também

    if (error) {
      Alert.alert("Falha no Login", error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="basket" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Bem-vindo de volta!</Text>
          <Text style={styles.subtitle}>
            Faça login para acessar sua despensa.
          </Text>
        </View>

        <View style={styles.form}>
          <CustomInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="exemplo@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <CustomInput
            label="Senha"
            value={password}
            onChangeText={setPassword}
            placeholder="Sua senha secreta"
            secureTextEntry
          />

          <PrimaryButton
            title={loading ? "Entrando..." : "Entrar"}
            onPress={handleLogin}
            disabled={loading}
            containerStyle={{ marginTop: SPACING.md }}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Não tem conta?</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Register")}>
            <Text style={styles.linkText}> Criar conta</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, padding: SPACING.xl, justifyContent: "center" },
  header: { alignItems: "center", marginBottom: 40 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  subtitle: { fontSize: 16, color: COLORS.text.secondary, textAlign: "center" },
  form: { gap: SPACING.sm },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 40 },
  footerText: { color: COLORS.text.secondary, fontSize: 15 },
  linkText: { color: COLORS.primary, fontWeight: "bold", fontSize: 15 },
});
