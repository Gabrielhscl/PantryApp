import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { CustomInput } from '../components/ui/CustomInput';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { SyncService } from '../services/SyncService';
import { db } from '../database/db';
import { userProfiles } from '../database/schema';
import { eq } from 'drizzle-orm';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [saving, setSaving] = useState(false);
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    const res = await db.select().from(userProfiles).where(eq(userProfiles.id, user!.id)).all();
    if (res.length > 0) {
      setFullName(res[0].fullName || '');
      // Aplica a máscara ao carregar o telefone do banco
      setPhone(formatPhone(res[0].phone || ''));
    }
  };

  // --- NOVA FUNÇÃO: MÁSCARA DE TELEFONE ---
  const formatPhone = (value: string) => {
    // Remove tudo que não for número
    const numericValue = value.replace(/\D/g, '');
    
    // Aplica a máscara gradualmente
    let formattedValue = numericValue;
    if (numericValue.length > 0) {
      formattedValue = `(${numericValue.substring(0, 2)}`;
      if (numericValue.length > 2) {
        formattedValue += `) ${numericValue.substring(2, 7)}`;
        if (numericValue.length > 7) {
          formattedValue += `-${numericValue.substring(7, 11)}`;
        }
      }
    }
    return formattedValue;
  };

  const handlePhoneChange = (text: string) => {
    // Só atualiza o estado com o texto formatado
    setPhone(formatPhone(text));
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Remove a máscara antes de salvar no banco para ficar apenas os números
      const cleanPhone = phone.replace(/\D/g, '');

      await db.insert(userProfiles).values({
        id: user.id,
        fullName,
        phone: cleanPhone, // Salva limpo
        updatedAt: new Date(),
        isSynced: false
      }).onConflictDoUpdate({
        target: userProfiles.id,
        set: { fullName, phone: cleanPhone, updatedAt: new Date(), isSynced: false }
      });

      await SyncService.notifyChanges(user.id);
      Alert.alert('Sucesso', 'Perfil atualizado e sincronizado!');
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar os dados.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>
              {fullName ? fullName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
            </Text>
            <TouchableOpacity style={styles.editPhotoBadge}>
              <Ionicons name="camera" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{fullName || 'Utilizador'}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados Pessoais</Text>
          <CustomInput 
            label="Nome Completo" 
            value={fullName} 
            onChangeText={setFullName} 
            placeholder="Como quer ser chamado?"
          />
          <CustomInput 
            label="Telemóvel / WhatsApp" 
            value={phone} 
            // --- USA A FUNÇÃO DE MUDANÇA COM MÁSCARA ---
            onChangeText={handlePhoneChange} 
            keyboardType="phone-pad"
            placeholder="(81) 9XXXX-XXXX"
            maxLength={15} // Limita a digitação ao tamanho da máscara
          />
          
          <PrimaryButton 
            title={saving ? "A guardar..." : "Guardar Alterações"} 
            onPress={handleUpdateProfile}
            disabled={saving}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configurações de Conta</Text>
          <TouchableOpacity style={styles.menuItem} onPress={() => SyncService.syncAll(user.id)}>
            <Ionicons name="cloud-download-outline" size={22} color={COLORS.primary} />
            <Text style={styles.menuText}>Forçar Sincronização Total</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.border} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { marginTop: 10, borderBottomWidth: 0 }]} onPress={signOut}>
            <Ionicons name="log-out-outline" size={22} color={COLORS.status.danger} />
            <Text style={[styles.menuText, { color: COLORS.status.danger }]}>Terminar Sessão</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg },
  header: { alignItems: 'center', marginBottom: 30 },
  avatarLarge: { 
    width: 100, height: 100, borderRadius: 50, 
    backgroundColor: COLORS.primary, justifyContent: 'center', 
    alignItems: 'center', marginBottom: 15, position: 'relative' 
  },
  avatarText: { fontSize: 40, color: '#FFF', fontWeight: 'bold' },
  editPhotoBadge: { 
    position: 'absolute', bottom: 0, right: 0, 
    backgroundColor: '#000', padding: 8, borderRadius: 20,
    borderWidth: 2, borderColor: COLORS.background
  },
  userName: { fontSize: 22, fontWeight: 'bold', color: COLORS.text.primary },
  userEmail: { fontSize: 14, color: COLORS.text.secondary },
  section: { 
    backgroundColor: COLORS.card, padding: SPACING.md, 
    borderRadius: RADIUS.lg, marginBottom: 20,
    borderWidth: 1, borderColor: COLORS.border
  },
  sectionTitle: { 
    fontSize: 14, fontWeight: '800', color: COLORS.text.secondary, 
    marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 
  },
  menuItem: { 
    flexDirection: 'row', alignItems: 'center', 
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border 
  },
  menuText: { flex: 1, marginLeft: 15, fontSize: 16, color: COLORS.text.primary, fontWeight: '500' },
});