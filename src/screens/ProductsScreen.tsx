import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ProductRepository } from "../repositories/productRepository";
import { ProductService } from "../services/productService";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { FloatingButton } from "../components/ui/FloatingButton";
import { ProductCard } from "../components/ProductCard";

// --- CONSTANTES ---
const CATEGORIES = [
  "Grãos",
  "Massas",
  "Laticínios",
  "Carnes",
  "Frutas",
  "Legumes",
  "Bebidas",
  "Molhos",
  "Doces",
  "Padaria",
  "Limpeza",
  "Outros",
];

const LOCATIONS = [
  { id: "pantry", label: "Armário", icon: "cube-outline" },
  { id: "fridge", label: "Geladeira", icon: "thermometer-outline" },
  { id: "freezer", label: "Freezer", icon: "snow-outline" },
];

const SUGGESTED_TAGS = [
  "Glúten",
  "Leite",
  "Açúcar",
  "Vegano",
  "Picante",
  "Soja",
  "Amendoim",
  "Congelado",
  "Frágil",
  "Orgânico",
];

export default function ProductsScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);

  // Scanner
  const [isScanning, setIsScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [loadingProduct, setLoadingProduct] = useState(false);

  // Formulário Base
  const [editingId, setEditingId] = useState<string | null>(null);
  const [barcode, setBarcode] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("Outros");
  const [defaultLocation, setDefaultLocation] = useState("pantry");

  // Tamanho e Imagem
  const [packSize, setPackSize] = useState("");
  const [packUnit, setPackUnit] = useState("un");
  const [image, setImage] = useState<string | null>(null);

  // Nutrição
  const [calories, setCalories] = useState("");
  const [carbs, setCarbs] = useState("");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");
  const [sodium, setSodium] = useState("");

  // --- NOVO: TAGS DE ALERTA ---
  const [alertTags, setAlertTags] = useState<string[]>([]);
  const [currentTagInput, setCurrentTagInput] = useState("");

  const loadProducts = async () => {
    const data = await ProductRepository.findAll();
    setProducts(data);
  };

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, []),
  );

  // --- FUNÇÕES DE TAGS ---
  const addTag = (tag: string) => {
    const cleanTag = tag.trim();
    if (cleanTag && !alertTags.includes(cleanTag)) {
      setAlertTags([...alertTags, cleanTag]);
      setCurrentTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) =>
    setAlertTags(alertTags.filter((tag) => tag !== tagToRemove));
  // -----------------------

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setIsScanning(false);

    const localProduct = await ProductRepository.findByBarcode(data);
    if (localProduct) {
      Alert.alert(
        "Já Cadastrado",
        `O produto "${localProduct.name}" já existe.`,
      );
      openEdit(localProduct);
      return;
    }

    setLoadingProduct(true);
    try {
      const info = await ProductService.fetchProductByBarcode(data);
      setBarcode(data);

      if (info.found && info.name) {
        setName(info.name);
        if (info.brand) setBrand(info.brand);
        if (info.image) setImage(info.image);

        if (info.category) {
          const match = CATEGORIES.find((c) => info.category.includes(c));
          setCategory(match || "Outros");
        }

        if (info.location) setDefaultLocation(info.location);
        if (info.packSize) setPackSize(String(info.packSize));
        if (info.packUnit) setPackUnit(info.packUnit);

        // Preenche Tags Automaticamente
        if (info.allergens) {
          const tagsFromApi = info.allergens
            .split(",")
            .map((t: string) => t.trim())
            .filter((t: string) => t);
          setAlertTags(tagsFromApi);
        }

        setCalories(info.calories ? String(info.calories) : "");
        setCarbs(info.carbs ? String(info.carbs) : "");
        setProtein(info.protein ? String(info.protein) : "");
        setFat(info.fat ? String(info.fat) : "");
        setFiber(info.fiber ? String(info.fiber) : "");
        setSodium(info.sodium ? String(info.sodium) : "");

        Alert.alert("Encontrado!", `Identificado como: ${info.name}`);
      } else {
        Alert.alert(
          "Novo",
          "Produto não encontrado na base. Preencha manualmente.",
        );
      }
    } catch (error) {
      Alert.alert("Erro", "Falha ao buscar produto.");
    } finally {
      setLoadingProduct(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert("Erro", "O nome é obrigatório.");

    try {
      const data = {
        barcode,
        name,
        brand,
        category,
        defaultLocation,
        packSize: parseFloat(packSize) || 0,
        packUnit: packUnit || "un",
        unit: packUnit || "un",
        image,
        calories: parseFloat(calories) || 0,
        carbs: parseFloat(carbs) || 0,
        protein: parseFloat(protein) || 0,
        fat: parseFloat(fat) || 0,
        fiber: parseFloat(fiber) || 0,
        sodium: parseFloat(sodium) || 0,
        allergens: alertTags.join(","), // Salva como texto separado por vírgula
      };

      if (editingId) {
        await ProductRepository.updateProduct(editingId, data);
        Alert.alert("Sucesso", "Produto atualizado!");
      } else {
        await ProductRepository.createProduct(data);
        Alert.alert("Sucesso", "Produto cadastrado!");
      }
      setModalVisible(false);
      resetForm();
      loadProducts();
    } catch (e) {
      console.log(e);
      Alert.alert("Erro", "Falha ao salvar produto.");
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      "Excluir",
      "Isso removerá o item do estoque e receitas. Confirmar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            await ProductRepository.deleteProduct(id);
            loadProducts();
          },
        },
      ],
    );
  };

  const resetForm = () => {
    setEditingId(null);
    setBarcode("");
    setName("");
    setBrand("");
    setCategory("Outros");
    setDefaultLocation("pantry");
    setPackSize("");
    setPackUnit("un");
    setImage(null);
    setCalories("");
    setCarbs("");
    setProtein("");
    setFat("");
    setFiber("");
    setSodium("");
    setAlertTags([]);
    setCurrentTagInput("");
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setBarcode(item.barcode || "");
    setName(item.name);
    setBrand(item.brand || "");
    setCategory(item.category || "Outros");
    setDefaultLocation(item.defaultLocation || "pantry");

    setPackSize(item.packSize ? String(item.packSize) : "");
    setPackUnit(item.packUnit || "un");
    setImage(item.image);

    setCalories(item.calories ? String(item.calories) : "");
    setCarbs(item.carbs ? String(item.carbs) : "");
    setProtein(item.protein ? String(item.protein) : "");
    setFat(item.fat ? String(item.fat) : "");
    setFiber(item.fiber ? String(item.fiber) : "");
    setSodium(item.sodium ? String(item.sodium) : "");

    // Carrega Tags
    if (item.allergens) {
      setAlertTags(item.allergens.split(",").filter((t: string) => t.trim()));
    } else {
      setAlertTags([]);
    }

    setModalVisible(true);
  };

  if (isScanning) {
    if (!permission?.granted) {
      return (
        <View style={styles.center}>
          <Text>Precisamos da câmera</Text>
          <TouchableOpacity onPress={requestPermission}>
            <Text style={{ color: "blue" }}>Permitir</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={handleBarCodeScanned}
        />
        <View style={styles.cameraOverlay}>
          <TouchableOpacity
            onPress={() => setIsScanning(false)}
            style={styles.closeCameraButton}
          >
            <Text style={{ color: "white", fontWeight: "bold" }}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchText.toLowerCase()),
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Catálogo" subtitle="Base de Produtos" />

        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar..."
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <ProductCard
              data={item}
              onEdit={() => openEdit(item)}
              onDelete={() => handleDelete(item.id)}
            />
          )}
        />

        <FloatingButton
          onPress={() => {
            resetForm();
            setModalVisible(true);
          }}
        />

        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              onPress={() => setModalVisible(false)}
            />

            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingId ? "Editar" : "Novo Produto"}
                </Text>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.closeBtn}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
              >
                <ScrollView
                  style={styles.modalBody}
                  showsVerticalScrollIndicator={false}
                >
                  {/* FOTO */}
                  <View style={styles.imageSection}>
                    <TouchableOpacity onPress={() => setIsScanning(true)}>
                      {image ? (
                        <Image
                          source={{ uri: image }}
                          style={styles.proImage}
                        />
                      ) : (
                        <View style={styles.proImagePlaceholder}>
                          <Ionicons
                            name="camera-outline"
                            size={32}
                            color="#007AFF"
                          />
                          <Text style={styles.photoText}>Escanear</Text>
                        </View>
                      )}
                      {barcode ? (
                        <Text style={styles.barcodeText}>{barcode}</Text>
                      ) : null}
                    </TouchableOpacity>
                  </View>

                  {/* DADOS GERAIS */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nome do Produto</Text>
                    <TextInput
                      style={styles.input}
                      value={name}
                      onChangeText={setName}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Marca</Text>
                    <TextInput
                      style={styles.input}
                      value={brand}
                      onChangeText={setBrand}
                    />
                  </View>

                  {/* CATEGORIAS */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Categoria</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ flexDirection: "row" }}
                    >
                      {CATEGORIES.map((cat) => (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.catChip,
                            category === cat && styles.catChipActive,
                          ]}
                          onPress={() => setCategory(cat)}
                        >
                          <Text
                            style={[
                              styles.catText,
                              category === cat && styles.catTextActive,
                            ]}
                          >
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* LOCAL & TAMANHO */}
                  <View
                    style={{ flexDirection: "row", gap: 15, marginBottom: 16 }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Local Padrão</Text>
                      <View style={{ flexDirection: "row", gap: 5 }}>
                        {LOCATIONS.map((loc) => (
                          <TouchableOpacity
                            key={loc.id}
                            style={[
                              styles.miniLocBtn,
                              defaultLocation === loc.id &&
                                styles.miniLocBtnActive,
                            ]}
                            onPress={() => setDefaultLocation(loc.id)}
                          >
                            <Ionicons
                              name={loc.icon as any}
                              size={16}
                              color={
                                defaultLocation === loc.id ? "#FFF" : "#666"
                              }
                            />
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Emb. Padrão</Text>
                      <View style={{ flexDirection: "row", gap: 5 }}>
                        <TextInput
                          style={[
                            styles.input,
                            { flex: 1, padding: 8, height: 40 },
                          ]}
                          value={packSize}
                          onChangeText={setPackSize}
                          placeholder="395"
                          keyboardType="numeric"
                        />
                        <TextInput
                          style={[
                            styles.input,
                            {
                              width: 40,
                              padding: 8,
                              height: 40,
                              textAlign: "center",
                            },
                          ]}
                          value={packUnit}
                          onChangeText={setPackUnit}
                          placeholder="g"
                          autoCapitalize="none"
                        />
                      </View>
                    </View>
                  </View>

                  {/* --- SEÇÃO DE ALERTAS E ETIQUETAS (IGUAL AO ESTOQUE) --- */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Alertas & Etiquetas</Text>

                    {/* Input com botão adicionar */}
                    <View style={styles.tagInputRow}>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={currentTagInput}
                        onChangeText={setCurrentTagInput}
                        placeholder="Ex: Sem Glúten..."
                        onSubmitEditing={() => addTag(currentTagInput)}
                      />
                      <TouchableOpacity
                        style={styles.addTagBtn}
                        onPress={() => addTag(currentTagInput)}
                      >
                        <Ionicons name="add" size={24} color="white" />
                      </TouchableOpacity>
                    </View>

                    {/* Sugestões Rápidas */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginBottom: 10 }}
                    >
                      {SUGGESTED_TAGS.map((tag) => (
                        <TouchableOpacity
                          key={tag}
                          style={styles.suggestionChip}
                          onPress={() => addTag(tag)}
                        >
                          <Text style={styles.suggestionText}>+ {tag}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {/* Tags Ativas */}
                    <View style={styles.tagsContainer}>
                      {alertTags.length === 0 && (
                        <Text style={styles.emptyTagsText}>
                          Nenhuma etiqueta adicionada
                        </Text>
                      )}
                      {alertTags.map((tag, index) => (
                        <View key={index} style={styles.activeTag}>
                          <Text style={styles.activeTagText}>{tag}</Text>
                          <TouchableOpacity onPress={() => removeTag(tag)}>
                            <Ionicons
                              name="close-circle"
                              size={18}
                              color="white"
                              style={{ marginLeft: 4 }}
                            />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* NUTRIÇÃO */}
                  <View style={styles.divider} />
                  <Text style={styles.sectionTitle}>
                    Nutrição (por 100g/ml)
                  </Text>

                  <View style={styles.row3}>
                    <View style={styles.col}>
                      <Text style={styles.miniLabel}>Kcal</Text>
                      <TextInput
                        style={styles.inputSmall}
                        value={calories}
                        onChangeText={setCalories}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.col}>
                      <Text style={styles.miniLabel}>Carb.</Text>
                      <TextInput
                        style={styles.inputSmall}
                        value={carbs}
                        onChangeText={setCarbs}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.col}>
                      <Text style={styles.miniLabel}>Prot.</Text>
                      <TextInput
                        style={styles.inputSmall}
                        value={protein}
                        onChangeText={setProtein}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                  <View style={styles.row3}>
                    <View style={styles.col}>
                      <Text style={styles.miniLabel}>Gord.</Text>
                      <TextInput
                        style={styles.inputSmall}
                        value={fat}
                        onChangeText={setFat}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.col}>
                      <Text style={styles.miniLabel}>Fibra</Text>
                      <TextInput
                        style={styles.inputSmall}
                        value={fiber}
                        onChangeText={setFiber}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.col}>
                      <Text style={styles.miniLabel}>Sódio</Text>
                      <TextInput
                        style={styles.inputSmall}
                        value={sodium}
                        onChangeText={setSodium}
                        keyboardType="numeric"
                        placeholder="mg"
                      />
                    </View>
                  </View>

                  <View style={{ height: 60 }} />
                </ScrollView>
              </KeyboardAvoidingView>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                  <Text style={styles.saveText}>Salvar Produto</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f2f7" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchBox: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e5ea",
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: "#333" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalBackdrop: { flex: 1 },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "90%",
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: { fontSize: 20, fontWeight: "bold" },
  closeBtn: { padding: 5, backgroundColor: "#f2f2f7", borderRadius: 20 },
  modalBody: { flex: 1, padding: 20 },

  // Imagem
  imageSection: { alignItems: "center", marginBottom: 20 },
  proImage: {
    width: 100,
    height: 100,
    borderRadius: 30,
    resizeMode: "cover",
    borderWidth: 3,
    borderColor: "#fff",
    backgroundColor: "#f0f0f0",
  },
  proImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: "#f0f4f8",
    justifyContent: "center",
    alignItems: "center",
    borderStyle: "dashed",
    borderWidth: 2,
    borderColor: "#d1d5db",
  },
  photoText: {
    fontSize: 10,
    color: "#007AFF",
    fontWeight: "bold",
    marginTop: 5,
  },
  barcodeText: {
    fontSize: 10,
    color: "#666",
    marginTop: 5,
    textAlign: "center",
  },

  // Inputs
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#666", marginBottom: 6 },
  input: {
    backgroundColor: "#fbfbfb",
    borderWidth: 1,
    borderColor: "#e5e5ea",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },

  // Chips de Categoria
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F2F2F7",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  catChipActive: { backgroundColor: "#007AFF", borderColor: "#007AFF" },
  catText: { fontSize: 13, color: "#666", fontWeight: "600" },
  catTextActive: { color: "#FFF" },

  // Mini botões de Local
  miniLocBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#F2F2F7",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  miniLocBtnActive: { backgroundColor: "#007AFF", borderColor: "#007AFF" },

  // TAGS (ESTILO IGUAL AO ESTOQUE)
  tagInputRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  addTagBtn: {
    backgroundColor: "#007AFF",
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  suggestionChip: {
    backgroundColor: "#f0f4f8",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e1e4e8",
  },
  suggestionText: { color: "#555", fontSize: 12, fontWeight: "600" },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    minHeight: 50,
  },
  activeTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ff7043",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  activeTagText: { color: "white", fontWeight: "bold", fontSize: 12 },
  emptyTagsText: {
    color: "#ccc",
    fontSize: 12,
    fontStyle: "italic",
    width: "100%",
    textAlign: "center",
    marginTop: 5,
  },

  // Nutrição
  divider: { height: 1, backgroundColor: "#E5E5EA", marginVertical: 15 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 10,
  },
  row3: { flexDirection: "row", gap: 10, marginBottom: 10 },
  col: { flex: 1 },
  miniLabel: {
    fontSize: 11,
    color: "#8E8E93",
    marginBottom: 4,
    textAlign: "center",
  },
  inputSmall: {
    backgroundColor: "#fbfbfb",
    borderWidth: 1,
    borderColor: "#e5e5ea",
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    textAlign: "center",
  },

  // Footer
  modalFooter: { padding: 20, borderTopWidth: 1, borderTopColor: "#f0f0f0" },
  saveBtn: {
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  saveText: { color: "white", fontSize: 18, fontWeight: "bold" },

  // Camera
  cameraContainer: { flex: 1, backgroundColor: "black" },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    paddingBottom: 50,
    alignItems: "center",
  },
  closeCameraButton: {
    backgroundColor: "rgba(255, 0, 0, 0.8)",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
});
