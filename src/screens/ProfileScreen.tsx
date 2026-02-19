import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { CustomInput } from '../components/ui/CustomInput';
import { SyncService } from '../services/SyncService';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Erro', error.message);
    setLoading(false);
  };

  const handleSignUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) Alert.alert('Erro', error.message);
    else Alert.alert('Sucesso', 'Verifique seu email!');
    setLoading(false);
  };

  const handleSync = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      await SyncService.syncAll(user.id);
      Alert.alert('Sucesso', 'Seus dados estão salvos na nuvem!');
    } catch (e) {
      Alert.alert('Erro', 'Falha na sincronização.');
    } finally {
      setSyncing(false);
    }
  };

  if (user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.avatar}>
             <Text style={styles.avatarText}>{user.email?.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.email}>{user.email}</Text>
          <View style={styles.badge}>
            <Ionicons name="cloud-done" size={12} color="#FFF" />
            <Text style={styles.badgeText}>Conta Conectada</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Backup e Sincronização</Text>
          <Text style={styles.desc}>
            Sincronize seus dados para não perder nada e acessar de outros dispositivos.
          </Text>

          <PrimaryButton 
            title={syncing ? "Sincronizando..." : "Sincronizar Agora"} 
            onPress={handleSync} 
            containerStyle={{ marginBottom: 20 }}
          />

          <PrimaryButton 
            title="Sair da Conta" 
            onPress={signOut} 
            style={{ backgroundColor: COLORS.status.danger }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loginBox}>
        <Text style={styles.title}>PantryApp Cloud</Text>
        <Text style={styles.subtitle}>Faça login para salvar seus dados.</Text>

        <CustomInput label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
        <CustomInput label="Senha" value={password} onChangeText={setPassword} secureTextEntry />

        {loading ? <ActivityIndicator color={COLORS.primary} /> : (
          <>
            <PrimaryButton title="Entrar" onPress={handleLogin} containerStyle={{ marginBottom: 10 }} />
            <PrimaryButton title="Criar Conta" onPress={handleSignUp} style={{ backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.primary }} textStyle={{ color: COLORS.primary }} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.lg },
  loginBox: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.primary, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: COLORS.text.secondary, textAlign: 'center', marginBottom: 30 },
  header: { alignItems: 'center', marginBottom: 40, marginTop: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  avatarText: { fontSize: 32, color: '#FFF', fontWeight: 'bold' },
  email: { fontSize: 18, fontWeight: '600', color: COLORS.text.primary },
  badge: { flexDirection: 'row', backgroundColor: COLORS.status.success, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 8, alignItems: 'center', gap: 4 },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  content: { flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  desc: { color: COLORS.text.secondary, marginBottom: 20, lineHeight: 20 },
});