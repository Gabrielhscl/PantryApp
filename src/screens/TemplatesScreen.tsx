import React, { useState, useCallback } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Swipeable, GestureHandlerRootView } from "react-native-gesture-handler";

import { ScreenHeader } from "../components/ui/ScreenHeader";
import { FloatingButton } from "../components/ui/FloatingButton";
import { TemplateRepository } from "../repositories/templateRepository";
import { AlertModal } from "../components/modals/AlertModal";

// Componente interno para o Card com Swipe
const TemplateCard = ({ item, onPress, onEdit, onDelete }: any) => {
  const renderRightActions = (_: any, dragX: any) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#007AFF' }]} onPress={onEdit}>
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons name="pencil" size={22} color="#FFF" />
          </Animated.View>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FF3B30' }]} onPress={onDelete}>
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons name="trash-outline" size={22} color="#FFF" />
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions} containerStyle={styles.swipeContainer}>
      <TouchableOpacity activeOpacity={0.9} style={styles.templateCard} onPress={onPress}>
        <View style={styles.iconBox}>
          <Ionicons name="list" size={24} color="#007AFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.templateName}>{item.name}</Text>
          <Text style={styles.templateSub}>Toque para ver os itens</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
      </TouchableOpacity>
    </Swipeable>
  );
};

export default function TemplatesScreen({ navigation }: any) {
  const [templates, setTemplates] = useState<any[]>([]);
  
  // Estados do Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Estado do Alerta
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: "", message: "", id: "" });

  const refresh = useCallback(async () => {
    try {
      const data = await TemplateRepository.findAll();
      setTemplates(data);
    } catch (e) { console.error(e); }
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const handleSave = async () => {
    if (!templateName.trim()) return;

    if (editingId) {
      // Aqui você precisaria implementar o update no repositório se quiser editar nomes
      // Por enquanto, vou deixar preparado
      // await TemplateRepository.updateTemplate(editingId, templateName);
      Alert.alert("Em breve", "Edição de nome será implementada no repositório.");
    } else {
      await TemplateRepository.createTemplate(templateName);
    }

    setTemplateName("");
    setEditingId(null);
    setModalVisible(false);
    refresh();
  };

  const openModal = (item?: any) => {
    if (item) {
      setEditingId(item.id);
      setTemplateName(item.name);
    } else {
      setEditingId(null);
      setTemplateName("");
    }
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    await TemplateRepository.deleteTemplate(id);
    setAlertConfig(prev => ({ ...prev, visible: false }));
    refresh();
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Listas Fixas" subtitle="Seus modelos de compra (Feira, Churrasco...)" />

        <FlatList
          data={templates}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="copy-outline" size={40} color="#CCC" />
              </View>
              <Text style={styles.emptyText}>Nenhuma lista criada.</Text>
              <Text style={styles.emptySub}>Crie modelos para agilizar suas compras recorrentes.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TemplateCard 
              item={item}
              onPress={() => navigation.navigate("TemplateDetail", { templateId: item.id, name: item.name })}
              onEdit={() => openModal(item)}
              onDelete={() => setAlertConfig({ 
                visible: true, 
                title: "Excluir Lista", 
                message: `Tem certeza que deseja apagar "${item.name}"?`, 
                id: item.id 
              })}
            />
          )}
        />

        <FloatingButton onPress={() => openModal()} />

        {/* MODAL BOTTOM SHEET (Igual ao Estoque) */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.backdrop} onPress={() => setModalVisible(false)} />
            
            <KeyboardAvoidingView 
              behavior={Platform.OS === "ios" ? "padding" : undefined} 
              style={styles.modalContent}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingId ? "Renomear Lista" : "Nova Lista Fixa"}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color="#555" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.label}>Nome da Lista</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Ex: Compras do Mês, Higiene, Churrasco..." 
                  value={templateName} 
                  onChangeText={setTemplateName}
                  autoFocus
                  onSubmitEditing={handleSave}
                />

                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                  <Text style={styles.saveText}>{editingId ? "Salvar Alterações" : "Criar Lista"}</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        <AlertModal 
          visible={alertConfig.visible} 
          title={alertConfig.title} 
          message={alertConfig.message} 
          type="danger" 
          onCancel={() => setAlertConfig(prev => ({ ...prev, visible: false }))} 
          onConfirm={() => handleDelete(alertConfig.id)} 
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  
  // Empty State
  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyIcon: { width: 80, height: 80, backgroundColor: '#E5E5EA', borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#1C1C1E', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#8E8E93', textAlign: 'center', lineHeight: 20 },

  // Card Styles
  swipeContainer: { marginBottom: 12, borderRadius: 20, overflow: 'hidden', backgroundColor: 'transparent' },
  templateCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  iconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#007AFF15', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  templateName: { fontSize: 17, fontWeight: '700', color: '#1C1C1E', marginBottom: 2 },
  templateSub: { fontSize: 13, color: '#8E8E93' },

  // Swipe Actions
  actionsContainer: { flexDirection: 'row', width: 140 },
  actionBtn: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Modal Styles (Bottom Sheet)
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject },
  modalContent: { backgroundColor: "#FFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 40, shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  modalTitle: { fontSize: 18, fontWeight: "800", color: '#1C1C1E' },
  closeBtn: { padding: 4, backgroundColor: '#F2F2F7', borderRadius: 20 },
  modalBody: { padding: 24 },
  label: { fontSize: 13, fontWeight: "700", color: "#8E8E93", marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: "#F2F2F7", padding: 16, borderRadius: 16, fontSize: 17, color: "#1C1C1E", marginBottom: 24 },
  saveBtn: { backgroundColor: "#007AFF", paddingVertical: 18, borderRadius: 18, alignItems: "center", shadowColor: "#007AFF", shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  saveText: { color: "white", fontSize: 17, fontWeight: "700" },
});