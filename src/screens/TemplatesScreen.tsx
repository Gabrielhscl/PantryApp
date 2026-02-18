import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Swipeable, GestureHandlerRootView } from "react-native-gesture-handler";

import { TemplateRepository } from "@/repositories/templateRepository";
import { useToast } from "@/contexts/ToastContext";

// UI e Tema
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { FloatingButton } from "@/components/ui/FloatingButton";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { CustomInput } from "@/components/ui/CustomInput";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { AlertModal } from "@/components/modals/AlertModal";
import { COLORS, SPACING, RADIUS } from "@/constants/theme";

const TemplateCard = ({ item, onPress, onEdit, onDelete }: any) => {
  const renderRightActions = (_: any, dragX: any) => {
    const scale = dragX.interpolate({ inputRange: [-100, 0], outputRange: [1, 0], extrapolate: 'clamp' });
    return (
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.primary }]} onPress={onEdit}>
          <Animated.View style={{ transform: [{ scale }] }}><Ionicons name="pencil" size={22} color="#FFF" /></Animated.View>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.status.danger }]} onPress={onDelete}>
          <Animated.View style={{ transform: [{ scale }] }}><Ionicons name="trash-outline" size={22} color="#FFF" /></Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions} containerStyle={styles.swipeContainer}>
      <TouchableOpacity activeOpacity={0.9} style={styles.templateCard} onPress={onPress}>
        <View style={styles.iconBox}><Ionicons name="list" size={24} color={COLORS.primary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.templateName}>{item.name}</Text>
          <Text style={styles.templateSub}>Toque para ver os itens</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.border} />
      </TouchableOpacity>
    </Swipeable>
  );
};

export default function TemplatesScreen({ navigation }: any) {
  const [templates, setTemplates] = useState<any[]>([]);
  const { showToast } = useToast();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [alertConfig, setAlertConfig] = useState({ visible: false, title: "", message: "", id: "" });

  const refresh = useCallback(async () => {
    try {
      const data = await TemplateRepository.findAll();
      setTemplates(data);
    } catch (e) { console.error(e); }
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const handleSave = async () => {
    if (!templateName.trim()) return showToast("O nome é obrigatório", "warning");

    if (editingId) {
      showToast("Edição será implementada no backend.", "info");
    } else {
      await TemplateRepository.createTemplate(templateName);
      showToast("Lista criada!", "success");
    }

    setTemplateName(""); setEditingId(null); setModalVisible(false); refresh();
  };

  const openModal = (item?: any) => {
    if (item) { setEditingId(item.id); setTemplateName(item.name); } 
    else { setEditingId(null); setTemplateName(""); }
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    await TemplateRepository.deleteTemplate(id);
    setAlertConfig(prev => ({ ...prev, visible: false }));
    showToast("Lista apagada.", "info");
    refresh();
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Listas Fixas" subtitle="Os seus modelos de compra" />

        <FlatList
          data={templates}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><Ionicons name="copy-outline" size={40} color={COLORS.text.secondary} /></View>
              <Text style={styles.emptyText}>Nenhuma lista criada.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TemplateCard 
              item={item}
              onPress={() => navigation.navigate("TemplateDetail", { templateId: item.id, name: item.name })}
              onEdit={() => openModal(item)}
              onDelete={() => setAlertConfig({ visible: true, title: "Excluir Lista", message: `Apagar "${item.name}"?`, id: item.id })}
            />
          )}
        />

        <FloatingButton onPress={() => openModal()} />

        <BottomSheetModal visible={modalVisible} onClose={() => setModalVisible(false)} title={editingId ? "Renomear Lista" : "Nova Lista Fixa"}>
          <CustomInput 
            label="Nome da Lista" 
            placeholder="Ex: Compras do Mês, Churrasco..." 
            value={templateName} 
            onChangeText={setTemplateName}
            autoFocus
            onSubmitEditing={handleSave}
          />
          <PrimaryButton title={editingId ? "Guardar" : "Criar Lista"} onPress={handleSave} />
        </BottomSheetModal>

        <AlertModal 
          visible={alertConfig.visible} title={alertConfig.title} message={alertConfig.message} type="danger" 
          onCancel={() => setAlertConfig(prev => ({ ...prev, visible: false }))} 
          onConfirm={() => handleDelete(alertConfig.id)} 
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyIcon: { width: 80, height: 80, backgroundColor: COLORS.border, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyText: { fontSize: 18, fontWeight: '700', color: COLORS.text.primary, marginBottom: 8 },

  swipeContainer: { marginBottom: 12, borderRadius: RADIUS.xl, overflow: 'hidden', backgroundColor: 'transparent' },
  templateCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, padding: 16, borderRadius: RADIUS.xl, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  iconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#007AFF15', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  templateName: { fontSize: 17, fontWeight: '700', color: COLORS.text.primary, marginBottom: 2 },
  templateSub: { fontSize: 13, color: COLORS.text.secondary },

  actionsContainer: { flexDirection: 'row', width: 140 },
  actionBtn: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});