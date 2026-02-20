import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../contexts/AuthContext';
import { CustomInput } from '../../components/ui/CustomInput';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

export default function RegisterScreen({ navigation }: any) {
  const { signUp, loading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      return Alert.alert('Erro', 'Preencha todos os campos.');
    }
    if (password !== confirmPassword) {
      return Alert.alert('Erro', 'As senhas não coincidem.');
    }
    if (password.length < 6) {
      return Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres.');
    }

    const { error } = await signUp(email, password);
    
    if (error) {
      Alert.alert('Falha no Registo', error.message);
    } else {
      Alert.alert('Sucesso', 'Conta criada! Verifique o seu email para confirmar.');
      navigation.navigate('Login');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Criar Conta</Text>
          <Text style={styles.subtitle}>Comece a organizar a sua despensa hoje.</Text>
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
            placeholder="Mínimo 6 caracteres"
            secureTextEntry
          />
          <CustomInput
            label="Confirmar Senha"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repita a senha"
            secureTextEntry
          />

          <PrimaryButton 
            title={loading ? "A criar conta..." : "Registar"} 
            onPress={handleRegister}
            disabled={loading}
            containerStyle={{ marginTop: SPACING.md }}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Já tem conta?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}> Fazer Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { flexGrow: 1, padding: SPACING.xl },
  backBtn: { marginBottom: 20 },
  header: { marginBottom: 30 },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text.primary, marginBottom: 8 },
  subtitle: { fontSize: 16, color: COLORS.text.secondary },
  form: { gap: SPACING.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 40 },
  footerText: { color: COLORS.text.secondary, fontSize: 15 },
  linkText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 15 },
});