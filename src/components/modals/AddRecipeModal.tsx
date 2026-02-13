import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker"; // Importar o ImagePicker
import { Autocomplete } from "../Autocomplete";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  recipeToEdit?: any | null;
};

const UNITS = [
  "un",
  "kg",
  "g",
  "L",
  "ml",
  "xícara",
  "c. sopa",
  "c. chá",
  "c. café",
  "fatia",
  "pitada",
  "lata",
  "dente",
  "folha",
  "pct",
];

export function AddRecipeModal({
  visible,
  onClose,
  onSave,
  recipeToEdit,
}: Props) {
  const [name, setName] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [servings, setServings] = useState("");
  const [image, setImage] = useState<string | null>(null); // Estado para a foto
  const [steps, setSteps] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState("");
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [currentProduct, setCurrentProduct] = useState<any>(null);
  const [currentQty, setCurrentQty] = useState("");
  const [currentUnit, setCurrentUnit] = useState("un");
  const [query, setQuery] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      if (recipeToEdit) {
        setName(recipeToEdit.name);
        setPrepTime(
          recipeToEdit.preparationTime
            ? String(recipeToEdit.preparationTime)
            : "",
        );
        setServings(recipeToEdit.servings ? String(recipeToEdit.servings) : "");
        setImage(recipeToEdit.image || null); // Carregar imagem existente
        if (recipeToEdit.instructions) {
          setSteps(
            recipeToEdit.instructions
              .split("\n")
              .filter((s: string) => s.trim().length > 0),
          );
        } else {
          setSteps([]);
        }
        const formattedIngs = (recipeToEdit.ingredients || []).map(
          (ing: any) => ({
            productId: ing.productId,
            name: ing.name,
            category: ing.category || "Outros",
            unit: ing.unit,
            quantity: ing.quantity,
            isOptional: !!ing.isOptional,
          }),
        );
        setIngredients(formattedIngs);
      } else {
        resetForm();
      }
    }
  }, [visible, recipeToEdit]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const resetForm = () => {
    setName("");
    setPrepTime("");
    setServings("");
    setImage(null)
    setSteps([]);
    setCurrentStep("");
    setIngredients([]);
    resetIngredientInput();
  };

  const resetIngredientInput = () => {
    setCurrentProduct(null);
    setCurrentQty("");
    setCurrentUnit("un");
    setQuery("");
    setEditingIndex(null);
  };

  const addStep = () => {
    if (!currentStep.trim()) return;
    setSteps([...steps, currentStep.trim()]);
    setCurrentStep("");
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleSelectProduct = (product: any) => {
    setCurrentProduct(product);
    setQuery(product.name);
    const defUnit = product.defaultUnit || product.packUnit;
    setCurrentUnit(defUnit && UNITS.includes(defUnit) ? defUnit : "un");
  };

  const addOrUpdateIngredient = () => {
    if (!currentProduct) return Alert.alert("Selecione um produto");
    if (!currentQty) return Alert.alert("Informe a quantidade");

    const newIng = {
      productId: currentProduct.id || currentProduct.productId,
      name: currentProduct.name,
      category: currentProduct.category || "Outros",
      unit: currentUnit,
      quantity: parseFloat(currentQty),
      isOptional: false,
    };

    if (editingIndex !== null) {
      const updatedList = [...ingredients];
      updatedList[editingIndex] = newIng;
      setIngredients(updatedList);
    } else {
      setIngredients([...ingredients, newIng]);
    }
    resetIngredientInput();
  };

  const handleEditIngredient = (ing: any, index: number) => {
    setCurrentProduct({
      id: ing.productId,
      name: ing.name,
      category: ing.category,
    });
    setQuery(ing.name);
    setCurrentQty(String(ing.quantity));
    setCurrentUnit(ing.unit);
    setEditingIndex(index);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
    if (editingIndex === index) resetIngredientInput();
  };

  const handleSave = () => {
    if (!name.trim()) return Alert.alert("Dê um nome para a receita");
    onSave({
      name,
      preparationTime: parseInt(prepTime) || 0,
      servings: parseInt(servings) || 1,
      instructions: steps.join("\n"),
      ingredients,
      image, // Enviar a imagem para o repositório
    });
    resetForm();
    onClose();
  };

  const groupedIngredients = ingredients.reduce((acc: any, ing) => {
    const cat = ing.category || "Outros";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ing);
    return acc;
  }, {});

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Removi o TouchableWithoutFeedback externo para não travar o scroll */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.content}
          keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
        >
          <View style={styles.header}>
            <Text style={styles.title}>
              {recipeToEdit ? "Editar Receita" : "Nova Receita"}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 120 }} // Espaço extra para o teclado não cobrir o botão de salvar
          >
            {/* SEÇÃO DE FOTO */}
                  <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                      {image ? (
                          <Image source={{ uri: image }} style={styles.previewImage} />
                      ) : (
                          <View style={styles.imagePlaceholder}>
                              <Ionicons name="camera-outline" size={32} color="#007AFF" />
                              <Text style={styles.imagePlaceholderText}>Adicionar Foto do Prato</Text>
                          </View>
                      )}
                  </TouchableOpacity>
            {/* Nome */}
            <Text style={styles.label}>Nome do Prato</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ex: Bolo de Cenoura"
            />

            {/* Tempo e Porções */}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Tempo (min)</Text>
                <TextInput
                  style={styles.input}
                  value={prepTime}
                  onChangeText={setPrepTime}
                  keyboardType="numeric"
                  placeholder="40"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Porções</Text>
                <TextInput
                  style={styles.input}
                  value={servings}
                  onChangeText={setServings}
                  keyboardType="numeric"
                  placeholder="4"
                />
              </View>
            </View>

            {/* Ingredientes Form */}
            <Text style={styles.sectionTitle}>Ingredientes</Text>
            <View
              style={[styles.box, editingIndex !== null && styles.boxEditing]}
            >
              {editingIndex !== null && (
                <Text style={styles.editingLabel}>Editando Ingrediente</Text>
              )}
              <View style={{ zIndex: 10, marginBottom: 10 }}>
                <Autocomplete
                  placeholder="Buscar ingrediente..."
                  value={query}
                  onChangeText={setQuery}
                  onSelect={handleSelectProduct}
                />
              </View>
              <View style={styles.rowCenter}>
                <TextInput
                  style={styles.qtyInput}
                  value={currentQty}
                  onChangeText={setCurrentQty}
                  placeholder="Qtd"
                  keyboardType="numeric"
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.unitScroll}
                >
                  {UNITS.map((u) => (
                    <TouchableOpacity
                      key={u}
                      style={[
                        styles.chip,
                        currentUnit === u && styles.chipActive,
                      ]}
                      onPress={() => setCurrentUnit(u)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          currentUnit === u && styles.chipTextActive,
                        ]}
                      >
                        {u}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={[
                    styles.iconBtn,
                    editingIndex !== null && styles.updateBtn,
                  ]}
                  onPress={addOrUpdateIngredient}
                >
                  <Ionicons
                    name={editingIndex !== null ? "checkmark" : "add"}
                    size={24}
                    color="#FFF"
                  />
                </TouchableOpacity>
                {editingIndex !== null && (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={resetIngredientInput}
                  >
                    <Ionicons name="close" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Lista de Ingredientes */}
            <View style={styles.listContainer}>
              {Object.keys(groupedIngredients).length === 0 && (
                <Text style={styles.emptyText}>Adicione ingredientes</Text>
              )}
              {Object.keys(groupedIngredients).map((cat) => (
                <View key={cat} style={{ marginBottom: 10 }}>
                  <Text style={styles.catHeader}>{cat}</Text>
                  {groupedIngredients[cat].map((ing: any, i: number) => {
                    const realIndex = ingredients.findIndex(
                      (item) => item === ing,
                    );
                    return (
                      <TouchableOpacity
                        key={i}
                        style={[
                          styles.listItem,
                          editingIndex === realIndex && styles.listItemActive,
                        ]}
                        onPress={() => handleEditIngredient(ing, realIndex)}
                      >
                        <Text style={styles.listText}>
                          <Text style={{ fontWeight: "bold" }}>
                            {ing.quantity} {ing.unit}
                          </Text>{" "}
                          - {ing.name}
                        </Text>
                        <TouchableOpacity
                          onPress={() => removeIngredient(realIndex)}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color="#FF3B30"
                          />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            {/* Modo de Preparo */}
            <Text style={styles.sectionTitle}>Modo de Preparo</Text>
            <View style={styles.listContainer}>
              {steps.map((step, index) => (
                <View key={index} style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                  <TouchableOpacity
                    onPress={() => removeStep(index)}
                    style={{ padding: 5 }}
                  >
                    <Ionicons name="close-circle" size={20} color="#CCC" />
                  </TouchableOpacity>
                </View>
              ))}
              {steps.length === 0 && (
                <Text style={styles.emptyText}>
                  Adicione os passos da receita
                </Text>
              )}
            </View>

            <View style={styles.stepInputContainer}>
              <TextInput
                style={styles.stepInput}
                value={currentStep}
                onChangeText={setCurrentStep}
                placeholder="Adicionar passo..."
                multiline
              />
              <TouchableOpacity style={styles.addStepBtn} onPress={addStep}>
                <Text style={styles.addStepText}>+ Passo</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Botão de Salvar fixo no final do Modal, mas acima do teclado graças ao padding do View */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveText}>
                {recipeToEdit ? "Salvar Alterações" : "Criar Receita"}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  content: {
    backgroundColor: "#F8F9FA",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "90%",
    padding: 20,
    paddingBottom: 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    alignItems: "center",
  },
  title: { fontSize: 20, fontWeight: "bold" },
  closeBtn: { padding: 5 },
  input: {
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    color: "#333",
  },
  label: { fontSize: 13, fontWeight: "600", color: "#666", marginBottom: 5 },
  row: { flexDirection: "row", gap: 10 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 10,
  },

  box: {
    marginBottom: 15,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  boxEditing: { borderColor: "#FF9500", backgroundColor: "#FFF8E1" },
  editingLabel: {
    fontSize: 10,
    color: "#FF9500",
    fontWeight: "bold",
    marginBottom: 5,
    textTransform: "uppercase",
  },

  rowCenter: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyInput: {
    backgroundColor: "#F2F2F7",
    width: 70,
    padding: 10,
    borderRadius: 10,
    textAlign: "center",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  unitScroll: { flex: 1 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F2F2F7",
    marginRight: 6,
    minWidth: 40,
    alignItems: "center",
  },
  chipActive: { backgroundColor: "#007AFF" },
  chipText: { fontWeight: "600", color: "#666", fontSize: 13 },
  chipTextActive: { color: "#FFF" },

  iconBtn: {
    backgroundColor: "#007AFF",
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  updateBtn: { backgroundColor: "#FF9500" },
  cancelBtn: { width: 30, justifyContent: "center", alignItems: "center" },

  listContainer: {
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  catHeader: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#8E8E93",
    textTransform: "uppercase",
    marginBottom: 5,
    marginTop: 5,
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F7",
    alignItems: "center",
  },
  listItemActive: {
    backgroundColor: "#F0F8FF",
    marginHorizontal: -10,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  listText: { fontSize: 14, color: "#333" },
  emptyText: { color: "#CCC", fontStyle: "italic", textAlign: "center" },

  stepItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 10,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E5E5EA",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  stepNumberText: { fontSize: 12, fontWeight: "bold", color: "#666" },
  stepText: { flex: 1, fontSize: 14, color: "#333", lineHeight: 20 },

  stepInputContainer: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-end",
    marginBottom: 20,
  },
  stepInput: {
    flex: 1,
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    minHeight: 60,
    textAlignVertical: "top",
  },
  addStepBtn: {
    backgroundColor: "#E5E5EA",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 12,
    height: 60,
    justifyContent: "center",
  },
  addStepText: { fontWeight: "bold", color: "#333" },

  footer: { paddingVertical: 20, backgroundColor: "#F8F9FA" },
  saveBtn: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  saveText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
  imagePicker: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
    marginBottom: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: 8,
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
