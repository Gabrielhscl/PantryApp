import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Swipeable } from "react-native-gesture-handler";

import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { FloatingButton } from "@/components/ui/FloatingButton";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { AlertModal } from "@/components/modals/AlertModal";

import { db } from "@/database/db";
import {
  shoppingListTemplates,
  templateItems,
  shoppingListItems,
} from "@/database/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "@/contexts/ToastContext";
import { COLORS, SPACING, RADIUS } from "@/constants/theme";

export default function TemplatesScreen({ navigation }: any) {
  const { showToast } = useToast();

  const [templates, setTemplates] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(
    null,
  );
  const [templateName, setTemplateName] = useState("");

  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "danger" as any,
    onConfirm: () => {},
    confirmText: "Confirmar",
  });

  const loadTemplates = useCallback(async () => {
    try {
      const result = await db.select().from(shoppingListTemplates).all();

      const templatesWithCount = await Promise.all(
        result.map(async (tpl) => {
          if (!tpl || !tpl.id) return { ...tpl, itemCount: 0 };

          try {
            const items = await db
              .select()
              .from(templateItems)
              .where(eq(templateItems.templateId, tpl.id))
              .all();
            return { ...tpl, itemCount: items.length };
          } catch (innerError) {
            return { ...tpl, itemCount: 0 };
          }
        }),
      );

      setTemplates(templatesWithCount);
    } catch (e) {
      showToast("Erro ao carregar as listas.", "error");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTemplates();
    }, [loadTemplates]),
  );

  const getIconForTemplate = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("churrasco") || n.includes("carne")) return "flame";
    if (n.includes("limpeza") || n.includes("casa")) return "sparkles";
    if (n.includes("feira") || n.includes("mês") || n.includes("mensal"))
      return "cart";
    if (n.includes("festa") || n.includes("bebida")) return "beer";
    if (n.includes("café") || n.includes("pequeno almoço")) return "cafe";
    return "list";
  };

  const getGradientForTemplate = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("churrasco"))
      return { bg: "#FF3B30", iconBg: "rgba(255,255,255,0.2)" };
    if (n.includes("limpeza"))
      return { bg: "#34C759", iconBg: "rgba(255,255,255,0.2)" };
    if (n.includes("feira"))
      return { bg: "#007AFF", iconBg: "rgba(255,255,255,0.2)" };
    if (n.includes("festa"))
      return { bg: "#AF52DE", iconBg: "rgba(255,255,255,0.2)" };
    return {
      bg: COLORS.card,
      iconBg: COLORS.primary + "15",
      text: COLORS.text.primary,
      iconColor: COLORS.primary,
    };
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim())
      return showToast("Digite um nome para a lista.", "warning");

    try {
      if (editingTemplateId) {
        await db
          .update(shoppingListTemplates)
          .set({ name: templateName, updatedAt: new Date() })
          .where(eq(shoppingListTemplates.id, editingTemplateId));
        showToast("Lista atualizada!", "success");
      } else {
        await db.insert(shoppingListTemplates).values({
          id: uuidv4(),
          name: templateName,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        showToast("Lista fixa criada!", "success");
      }
      closeModal();
      loadTemplates();
    } catch (e) {
      showToast("Erro ao guardar lista.", "error");
    }
  };

  const handleDelete = (id: string, name: string) => {
    setAlertConfig({
      visible: true,
      title: "Apagar Lista Fixa",
      message: `Tem a certeza que quer apagar a lista "${name}" permanentemente?`,
      type: "danger",
      confirmText: "Sim, Apagar",
      onConfirm: async () => {
        await db
          .delete(shoppingListTemplates)
          .where(eq(shoppingListTemplates.id, id));
        setAlertConfig((prev) => ({ ...prev, visible: false }));
        loadTemplates();
        showToast("Lista apagada.", "success");
      },
    });
  };

  const openEdit = (tpl: any) => {
    setEditingTemplateId(tpl.id);
    setTemplateName(tpl.name);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingTemplateId(null);
    setTemplateName("");
  };

  const handleUseTemplate = async (template: any) => {
    try {
      const tplItems = await db
        .select()
        .from(templateItems)
        .where(eq(templateItems.templateId, template.id))
        .all();

      if (tplItems.length === 0)
        return showToast(
          "Esta lista está vazia! Adicione itens primeiro.",
          "warning",
        );

      const currentShoppingList = await db
        .select()
        .from(shoppingListItems)
        .all();

      let addedCount = 0;
      let updatedCount = 0;

      for (const item of tplItems) {
        const existingItem = currentShoppingList.find(
          (c) =>
            (item.productId && c.productId === item.productId) ||
            (!item.productId &&
              c.name.toLowerCase() === item.name.toLowerCase()),
        );

        const realCategory = item.category || "Outros";
        const compoundCategory = `${realCategory}|[Fixo] ${template.name}`;

        if (existingItem) {
          const newQuantity = existingItem.quantity + item.quantity;
          await db
            .update(shoppingListItems)
            .set({
              quantity: newQuantity,
              category: compoundCategory,
              updatedAt: new Date(),
            })
            .where(eq(shoppingListItems.id, existingItem.id));
          updatedCount++;
        } else {
          await db.insert(shoppingListItems).values({
            id: uuidv4(),
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            category: compoundCategory,
            price: 0,
            isChecked: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          addedCount++;
        }
      }
      showToast(
        `${addedCount} novos itens e ${updatedCount} itens somados no Carrinho!`,
        "success",
      );
      navigation.navigate("Main", { screen: "Lista" });
    } catch (e) {
      showToast("Falha ao usar a lista.", "error");
    }
  };

  // --- NOVA FUNÇÃO RENDERIZAÇÃO DE BOTÕES DO SWIPE ---
  const renderRightActions = (
    item: any,
    progress: any,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });

    return (
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}
          onPress={() => openEdit(item)}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons name="pencil" size={22} color="#FFF" />
          </Animated.View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: COLORS.status.danger }]}
          onPress={() => handleDelete(item.id, item.name)}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons name="trash-outline" size={22} color="#FFF" />
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Listas Fixas"
        subtitle="As suas compras rotineiras"
        icon="chevron-back"
        onIconPress={() => navigation.goBack()}
      />

      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 120 }}
        renderItem={({ item }) => {
          const styleProps = getGradientForTemplate(item.name);

          return (
            // ENVOLVENDO O CARTÃO NO SWIPEABLE
            <Swipeable
              renderRightActions={(progress, dragX) =>
                renderRightActions(item, progress, dragX)
              }
              containerStyle={styles.swipeContainer}
            >
              <TouchableOpacity
                activeOpacity={0.9}
                style={[
                  styles.templateCard,
                  { backgroundColor: styleProps.bg },
                ]}
                onPress={() =>
                  navigation.navigate("TemplateDetails", {
                    templateId: item.id,
                    templateName: item.name,
                  })
                }
              >
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: styleProps.iconBg },
                  ]}
                >
                  <Ionicons
                    name={getIconForTemplate(item.name)}
                    size={24}
                    color={styleProps.iconColor || "#FFF"}
                  />
                </View>

                <View style={styles.cardInfo}>
                  <Text
                    style={[
                      styles.cardTitle,
                      { color: styleProps.text || "#FFF" },
                    ]}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={[
                      styles.cardSub,
                      {
                        color: styleProps.text
                          ? COLORS.text.secondary
                          : "rgba(255,255,255,0.8)",
                      },
                    ]}
                  >
                    {item.itemCount} {item.itemCount === 1 ? "item" : "itens"}{" "}
                    registados
                  </Text>
                </View>

                {/* Botão de Usar Rápido no canto do cartão */}
                <TouchableOpacity
                  style={styles.useButton}
                  onPress={() => handleUseTemplate(item)}
                >
                  <Ionicons name="cart" size={18} color="#FFF" />
                  <Text style={styles.useButtonText}>USAR</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </Swipeable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="albums-outline"
                size={40}
                color={COLORS.text.secondary}
              />
            </View>
            <Text style={styles.emptyText}>Nenhuma Lista Fixa</Text>
            <Text style={styles.emptySub}>
              Crie listas para coisas que compra frequentemente.
            </Text>
          </View>
        }
      />

      <FloatingButton
        onPress={() => {
          setEditingTemplateId(null);
          setTemplateName("");
          setModalVisible(true);
        }}
      />

      <BottomSheetModal
        visible={modalVisible}
        onClose={closeModal}
        title={editingTemplateId ? "Editar Lista Fixa" : "Nova Lista Fixa"}
      >
        <Text style={styles.label}>Nome da Lista</Text>
        <TextInput
          style={styles.input}
          value={templateName}
          onChangeText={setTemplateName}
          placeholder="Ex: Itens de Limpeza Mensal"
          placeholderTextColor={COLORS.text.secondary}
          autoFocus
        />

        <PrimaryButton
          title={editingTemplateId ? "Guardar" : "Criar Lista"}
          onPress={handleSaveTemplate}
          containerStyle={{ marginTop: SPACING.lg }}
        />
        <View style={{ height: 20 }} />
      </BottomSheetModal>

      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        confirmText={alertConfig.confirmText}
        onCancel={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
        onConfirm={alertConfig.onConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // ESTILOS PARA O GESTO SWIPEABLE
  swipeContainer: {
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  actionsContainer: {
    flexDirection: "row",
    width: 130, // Largura dos dois botões somados
    height: "100%",
  },
  actionBtn: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  templateCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: "800", marginBottom: 4 },
  cardSub: { fontSize: 13, fontWeight: "500" },

  useButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  useButtonText: { color: "#FFF", fontSize: 12, fontWeight: "800" },

  empty: { alignItems: "center", marginTop: 80, paddingHorizontal: 40 },
  emptyIcon: {
    width: 80,
    height: 80,
    backgroundColor: COLORS.border,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: "center",
    lineHeight: 20,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text.secondary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    fontSize: 16,
    color: COLORS.text.primary,
  },
});
