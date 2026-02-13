import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Vibration,
  FlatList
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Autocomplete } from "../Autocomplete"; 
import { RecipeRepository } from "../../repositories/recipeRepository";

// --- LISTA PADRÃO DE UNIDADES CULINÁRIAS ---
const STANDARD_UNITS = [
  "un", "g", "kg", "ml", "L", 
  "xícara", "colher (sopa)", "colher (chá)", 
  "lata", "pacote", "fatia", "dente"
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
  initialData?: any;
};

// Componente de Contador (Mantido)
const CounterInput = ({ label, value, onChange, step = 1, unit = "" }: any) => (
  <View style={styles.counterContainer}>
    <Text style={styles.counterLabel}>{label}</Text>
    <View style={styles.counterControls}>
      <TouchableOpacity 
        style={styles.counterBtn} 
        onPress={() => {
          const newValue = Math.max(1, parseInt(value || "0") - step);
          onChange(newValue.toString());
          Vibration.vibrate(10);
        }}
      >
        <Ionicons name="remove" size={20} color="#007AFF" />
      </TouchableOpacity>
      
      <Text style={styles.counterValue}>{value || "0"} <Text style={styles.counterUnit}>{unit}</Text></Text>
      
      <TouchableOpacity 
        style={styles.counterBtn} 
        onPress={() => {
          const newValue = parseInt(value || "0") + step;
          onChange(newValue.toString());
          Vibration.vibrate(10);
        }}
      >
        <Ionicons name="add" size={20} color="#007AFF" />
      </TouchableOpacity>
    </View>
  </View>
);

export function AddRecipeModal({ visible, onClose, onSaveSuccess, initialData }: Props) {
  // Estados do Formulário
  const [name, setName] = useState("");
  const [prepTime, setPrepTime] = useState("30");
  const [servings, setServings] = useState("2");
  const [instructions, setInstructions] = useState("");
  const [recipeIngredients, setRecipeIngredients] = useState<any[]>([]);
  const [ingSearch, setIngSearch] = useState("");

  // Controle do Seletor de Unidade
  const [unitPickerVisible, setUnitPickerVisible] = useState(false);
  const [targetIngIndex, setTargetIngIndex] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setName(initialData.name);
        setPrepTime(initialData.preparationTime?.toString() || "30");
        setServings(initialData.servings?.toString() || "2");
        setInstructions(initialData.instructions || "");
        setRecipeIngredients(initialData.ingredients || []);
      } else {
        resetForm();
      }
    }
  }, [visible, initialData]);

  const resetForm = () => {
    setName(""); setPrepTime("30"); setServings("2");
    setInstructions(""); setRecipeIngredients([]); setIngSearch("");
  };

  const handleAddIng = (product: any) => {
    if (recipeIngredients.some(i => i.productId === product.id)) {
      return Alert.alert("Ops", "Este item já está na lista.");
    }
    setRecipeIngredients([...recipeIngredients, { 
        productId: product.id, 
        name: product.name, 
        quantity: "", 
        unit: product.defaultUnit || "un"
    }]);
    setIngSearch("");
  };

  const updateQuantity = (index: number, value: string) => {
    const list = [...recipeIngredients];
    list[index].quantity = value;
    setRecipeIngredients(list);
  };

  const openUnitPicker = (index: number) => {
    setTargetIngIndex(index);
    setUnitPickerVisible(true);
  };

  const selectUnit = (unit: string) => {
    if (targetIngIndex !== null) {
      const list = [...recipeIngredients];
      list[targetIngIndex].unit = unit;
      setRecipeIngredients(list);
    }
    setUnitPickerVisible(false);
    setTargetIngIndex(null);
  };

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert("Faltou o nome", "Dê um nome para a receita.");
    if (recipeIngredients.length === 0) return Alert.alert("Vazio", "Adicione ingredientes.");

    const invalid = recipeIngredients.find(i => !i.quantity || parseFloat(i.quantity) <= 0);
    if (invalid) return Alert.alert("Quantidade", `Quanto de "${invalid.name}"?`);

    try {
      if (initialData) await RecipeRepository.deleteRecipe(initialData.id);

      await RecipeRepository.saveRecipe({
        name,
        instructions,
        preparationTime: parseInt(prepTime),
        servings: parseInt(servings)
      }, recipeIngredients);

      resetForm();
      onSaveSuccess();
      onClose();
    } catch (error) {
      Alert.alert("Erro", "Falha ao salvar receita.");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{initialData ? "Editar Prato" : "Criar Prato"}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Cancelar</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex: 1}}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={styles.scrollContent}>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>NOME DA RECEITA</Text>
              <TextInput 
                style={styles.nameInput} 
                placeholder="Ex: Torta de Frango" 
                value={name} 
                onChangeText={setName} 
                placeholderTextColor="#C7C7CC"
              />
            </View>

            <View style={styles.row}>
              <CounterInput label="TEMPO (MIN)" value={prepTime} onChange={setPrepTime} step={5} unit="min" />
              <View style={{width: 15}} />
              <CounterInput label="PORÇÕES" value={servings} onChange={setServings} step={1} />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>INGREDIENTES</Text>
              <Autocomplete 
                value={ingSearch} 
                onChangeText={setIngSearch} 
                onSelect={handleAddIng} 
                placeholder="Busque ingrediente..." 
              />

              <View style={styles.ingredientsContainer}>
                {recipeIngredients.length === 0 ? (
                  <Text style={styles.emptyHint}>A lista está vazia.</Text>
                ) : (
                  recipeIngredients.map((ing, i) => (
                    <View key={i} style={styles.ingCard}>
                      <Text style={styles.ingName} numberOfLines={1}>{ing.name}</Text>
                      
                      {/* INPUT DUPLO: QUANTIDADE + UNIDADE PICKER */}
                      <View style={styles.ingInputsRow}>
                        <TextInput 
                          placeholder="0"
                          keyboardType="numeric"
                          style={styles.qtyInput}
                          value={ing.quantity ? String(ing.quantity) : ""}
                          onChangeText={(v) => updateQuantity(i, v)}
                        />
                        
                        {/* Botão que abre a lista de unidades */}
                        <TouchableOpacity style={styles.unitSelector} onPress={() => openUnitPicker(i)}>
                          <Text style={styles.unitText}>{ing.unit}</Text>
                          <Ionicons name="chevron-down" size={12} color="#007AFF" />
                        </TouchableOpacity>
                      </View>
                      
                      <TouchableOpacity 
                        style={styles.trashBtn} 
                        onPress={() => {
                          setRecipeIngredients(recipeIngredients.filter((_, idx) => idx !== i));
                          Vibration.vibrate(10);
                        }}
                      >
                        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>MODO DE PREPARO</Text>
              </View>
              <TextInput 
                style={styles.textArea} 
                multiline 
                textAlignVertical="top"
                value={instructions} 
                onChangeText={setInstructions}
                placeholder={"Descreva como fazer..."}
                placeholderTextColor="#C7C7CC"
              />
            </View>
            <View style={{height: 100}} /> 
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>
                {initialData ? "Salvar Alterações" : "Concluir Receita"}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* --- MODAL INTERNO PARA SELECIONAR UNIDADE --- */}
        <Modal visible={unitPickerVisible} transparent animationType="fade" onRequestClose={() => setUnitPickerVisible(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setUnitPickerVisible(false)}>
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerTitle}>Selecione a Unidade</Text>
              <FlatList
                data={STANDARD_UNITS}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.pickerItem} onPress={() => selectUnit(item)}>
                    <Text style={styles.pickerItemText}>{item}</Text>
                    {targetIngIndex !== null && recipeIngredients[targetIngIndex]?.unit === item && (
                      <Ionicons name="checkmark" size={20} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  scrollContent: { padding: 20 },
  
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#F2F2F7'
  },
  title: { fontSize: 18, fontWeight: '700', color: '#1C1C1E' },
  closeBtn: { padding: 5 },
  closeText: { color: '#007AFF', fontSize: 16 },

  inputGroup: { marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '700', color: '#8E8E93', marginBottom: 8, letterSpacing: 0.5 },
  nameInput: { fontSize: 22, fontWeight: 'bold', color: '#1C1C1E', borderBottomWidth: 1, borderBottomColor: '#E5E5EA', paddingVertical: 10 },

  row: { flexDirection: 'row', marginBottom: 25 },
  counterContainer: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5 },
  counterLabel: { fontSize: 11, fontWeight: '700', color: '#8E8E93', marginBottom: 8, textAlign: 'center' },
  counterControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  counterBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center' },
  counterValue: { fontSize: 18, fontWeight: 'bold', color: '#1C1C1E' },
  counterUnit: { fontSize: 12, fontWeight: 'normal', color: '#8E8E93' },

  section: { marginBottom: 25 },
  ingredientsContainer: { marginTop: 12 },
  emptyHint: { color: '#C7C7CC', fontStyle: 'italic', textAlign: 'center', marginTop: 10 },
  
  ingCard: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', 
    padding: 10, borderRadius: 12, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 3, elevation: 1
  },
  ingName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1C1C1E', marginRight: 10 },
  
  ingInputsRow: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', 
    borderRadius: 8, padding: 2, marginRight: 10
  },
  qtyInput: { 
    width: 50, textAlign: 'center', paddingVertical: 8, fontWeight: 'bold', 
    color: '#007AFF', fontSize: 16, borderRightWidth: 1, borderRightColor: '#E5E5EA'
  },
  
  // Estilos do Seletor
  unitSelector: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, height: '100%'
  },
  unitText: { fontSize: 14, fontWeight: '600', color: '#1C1C1E', marginRight: 4 },

  trashBtn: { padding: 8 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  textArea: { backgroundColor: '#FFF', borderRadius: 12, padding: 15, fontSize: 16, lineHeight: 24, minHeight: 150, color: '#1C1C1E', borderWidth: 1, borderColor: '#E5E5EA' },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F2F2F7' },
  saveBtn: { backgroundColor: '#007AFF', borderRadius: 14, paddingVertical: 16, alignItems: 'center', shadowColor: '#007AFF', shadowOpacity: 0.2, shadowRadius: 8 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  // Estilos do Modal de Unidades
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  pickerContainer: { width: '80%', maxHeight: '60%', backgroundColor: '#FFF', borderRadius: 16, padding: 20 },
  pickerTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  pickerItemText: { fontSize: 16, color: '#333' }
});