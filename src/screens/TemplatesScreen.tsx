import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { FloatingButton } from "../components/ui/FloatingButton";
import { TemplateRepository } from "../repositories/templateRepository";

export default function TemplatesScreen({ navigation }: any) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState("");

  const refresh = useCallback(async () => {
    const data = await TemplateRepository.findAll();
    setTemplates(data);
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await TemplateRepository.createTemplate(newName);
    setNewName("");
    setModalVisible(false);
    refresh();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Listas Fixas" subtitle="Teu padrão de consumo mensal" />

      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20 }}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.templateCard} 
            onPress={() => navigation.navigate("TemplateDetail", { templateId: item.id, name: item.name })}
          >
            <View style={styles.iconBox}><Ionicons name="list" size={24} color="#007AFF" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.templateName}>{item.name}</Text>
              <Text style={styles.templateSub}>Toque para ver itens e estoque</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>
        )}
      />

      <FloatingButton onPress={() => setModalVisible(true)} />

      <Modal visible={modalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Novo Modelo</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Ex: Compras Mensais" 
              value={newName} 
              onChangeText={setNewName}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                <Text style={{ color: '#8E8E93', fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreate} style={styles.confirmBtn}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Criar Lista</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  templateCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 20, borderRadius: 20, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#007AFF10', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  templateName: { fontSize: 18, fontWeight: '700', color: '#1C1C1E' },
  templateSub: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 30 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: '#F2F2F7', padding: 15, borderRadius: 12, fontSize: 16 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 16, alignItems: 'center' },
  confirmBtn: { flex: 2, backgroundColor: '#007AFF', padding: 16, borderRadius: 14, alignItems: 'center' }
});