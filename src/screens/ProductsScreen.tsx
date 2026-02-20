import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ProductRepository } from "@/repositories/productRepository";
import { ProductService } from "@/services/productService";
import { SyncService } from "@/services/SyncService"; // IMPORTADO
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/AuthContext"; // IMPORTADO

// Componentes UI e Tema
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { FloatingButton } from "@/components/ui/FloatingButton";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { CustomInput } from "@/components/ui/CustomInput";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ProductCard } from "@/components/ProductCard";
import { COLORS, SPACING, RADIUS } from "@/constants/theme";
import { Product } from "@/types";

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
const UNITS = ["un", "kg", "g", "L", "ml"];
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
  const { user } = useAuth(); // ADICIONADO PARA TER ACESSO AO USER ID
  const [products, setProducts] = useState<Product[]>([]);
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const { showToast } = useToast();

  const [isScanning, setIsScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // Formulário
  const [editingId, setEditingId] = useState<string | null>(null);
  const [barcode, setBarcode] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("Outros");
  const [defaultLocation, setDefaultLocation] = useState<any>("pantry");
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

  const addTag = (tag: string) => {
    const cleanTag = tag.trim();
    if (cleanTag && !alertTags.includes(cleanTag)) {
      setAlertTags([...alertTags, cleanTag]);
      setCurrentTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) =>
    setAlertTags(alertTags.filter((t) => t !== tagToRemove));

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setIsScanning(false);
    const localProduct = await ProductRepository.findByBarcode(data);

    if (localProduct) {
      showToast(`Produto "${localProduct.name}" já registado!`, "warning");
      openEdit(localProduct);
      return;
    }

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
        if (info.packUnit) {
          const apiUnit = info.packUnit.toLowerCase();
          setPackUnit(UNITS.includes(apiUnit) ? apiUnit : "un");
        }
        if (info.allergens)
          setAlertTags(
            info.allergens
              .split(",")
              .map((t: string) => t.trim())
              .filter(Boolean),
          );

        setCalories(info.calories ? String(info.calories) : "");
        setCarbs(info.carbs ? String(info.carbs) : "");
        setProtein(info.protein ? String(info.protein) : "");
        setFat(info.fat ? String(info.fat) : "");
        setFiber(info.fiber ? String(info.fiber) : "");
        setSodium(info.sodium ? String(info.sodium) : "");

        showToast("Produto encontrado e preenchido!", "success");
      } else {
        showToast("Produto não encontrado. Preencha manualmente.", "info");
      }
    } catch (error) {
      showToast("Erro ao pesquisar código de barras.", "error");
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return showToast("O nome é obrigatório.", "error");

    try {
      const cleanPackSize = packSize ? packSize.replace(",", ".") : "0";
      const parsedPackSize = parseFloat(cleanPackSize) || 0;

      const data = {
        barcode,
        name,
        brand,
        category,
        defaultLocation,
        packSize: parsedPackSize,
        packUnit: packUnit,
        unit: packUnit,
        image,
        calories: parseFloat(calories) || 0,
        carbs: parseFloat(carbs) || 0,
        protein: parseFloat(protein) || 0,
        fat: parseFloat(fat) || 0,
        fiber: parseFloat(fiber) || 0,
        sodium: parseFloat(sodium) || 0,
        allergens: alertTags.join(","),
      };

      if (editingId) {
        await ProductRepository.updateProduct(editingId, data);
        showToast("Produto atualizado localmente!", "success");
      } else {
        await ProductRepository.createProduct(data);
        showToast("Produto criado localmente!", "success");
      }

      // --- SINCRONIZAÇÃO AUTOMÁTICA IMEDIATA ---
      if (user) {
        SyncService.notifyChanges(user.id);
      }

      setModalVisible(false);
      loadProducts();
    } catch (e) {
      showToast("Falha ao guardar produto.", "error");
      console.log(e);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      "Excluir",
      "Remover este item apagará o histórico dele. Confirmar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            await ProductRepository.deleteProduct(id);
            
            // --- SINCRONIZAÇÃO AUTOMÁTICA APÓS EXCLUIR ---
            if (user) {
              SyncService.notifyChanges(user.id);
            }
            
            showToast("Produto removido.", "info");
            loadProducts();
          },
        },
      ],
    );
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setBarcode(item.barcode || "");
    setName(item.name);
    setBrand(item.brand || "");
    setCategory(item.category || "Outros");
    setDefaultLocation(item.defaultLocation || "pantry");
    setPackSize(
      item.packSize && item.packSize > 0 ? String(item.packSize) : "",
    );
    const loadedUnit = item.packUnit || item.defaultUnit || "un";
    setPackUnit(UNITS.includes(loadedUnit) ? loadedUnit : "un");
    setImage(item.image);
    setCalories(item.calories ? String(item.calories) : "");
    setCarbs(item.carbs ? String(item.carbs) : "");
    setProtein(item.protein ? String(item.protein) : "");
    setFat(item.fat ? String(item.fat) : "");
    setFiber(item.fiber ? String(item.fiber) : "");
    setSodium(item.sodium ? String(item.sodium) : "");
    setAlertTags(
      item.allergens
        ? item.allergens.split(",").filter((t: string) => t.trim())
        : [],
    );
    setModalVisible(true);
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

  if (isScanning) {
    if (!permission?.granted)
      return (
        <View style={styles.center}>
          <Text>Sem acesso à câmara</Text>
          <TouchableOpacity onPress={requestPermission}>
            <Text style={{ color: COLORS.primary }}>Permitir</Text>
          </TouchableOpacity>
        </View>
      );
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
        <ScreenHeader 
          title="Catálogo" 
          subtitle="Base de dados de produtos" 
          icon="chevron-back"
        />

        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={COLORS.text.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Procurar produto..."
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
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

        <BottomSheetModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          title={editingId ? "Editar Produto" : "Novo Produto"}
        >
          <View style={styles.imageSection}>
            <TouchableOpacity onPress={() => setIsScanning(true)}>
              {image ? (
                <Image source={{ uri: image }} style={styles.proImage} />
              ) : (
                <View style={styles.proImagePlaceholder}>
                  <Ionicons
                    name="barcode-outline"
                    size={32}
                    color={COLORS.primary}
                  />
                  <Text style={styles.photoText}>Escanear</Text>
                </View>
              )}
              {barcode ? (
                <Text style={styles.barcodeText}>{barcode}</Text>
              ) : null}
            </TouchableOpacity>
          </View>

          <CustomInput
            label="Nome do Produto"
            value={name}
            onChangeText={setName}
          />
          <CustomInput
            label="Marca (Opcional)"
            value={brand}
            onChangeText={setBrand}
          />

          <Text style={styles.label}>Categoria</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: SPACING.lg }}
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

          <View
            style={{
              flexDirection: "row",
              gap: SPACING.md,
              marginBottom: SPACING.lg,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Guardar no</Text>
              <View style={{ flexDirection: "row", gap: 5 }}>
                {LOCATIONS.map((loc) => (
                  <TouchableOpacity
                    key={loc.id}
                    style={[
                      styles.miniLocBtn,
                      defaultLocation === loc.id && styles.miniLocBtnActive,
                    ]}
                    onPress={() => setDefaultLocation(loc.id)}
                  >
                    <Ionicons
                      name={loc.icon as any}
                      size={16}
                      color={
                        defaultLocation === loc.id
                          ? COLORS.text.light
                          : COLORS.text.secondary
                      }
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <CustomInput
                label="Peso/Vol (Nº)"
                value={packSize}
                onChangeText={setPackSize}
                keyboardType="numeric"
                placeholder="395"
                style={{ height: 45, marginBottom: 0 }}
              />
            </View>
          </View>

          <Text style={styles.label}>Unidade</Text>
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: SPACING.lg,
            }}
          >
            {UNITS.map((u) => (
              <TouchableOpacity
                key={u}
                style={[
                  styles.unitChip,
                  packUnit === u && styles.unitChipActive,
                ]}
                onPress={() => setPackUnit(u)}
              >
                <Text
                  style={[
                    styles.unitText,
                    packUnit === u && styles.unitTextActive,
                  ]}
                >
                  {u}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Alertas & Etiquetas</Text>
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

          <View style={styles.tagsContainer}>
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

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Nutrição (por 100g/ml)</Text>

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

          <PrimaryButton
            title={editingId ? "Guardar Produto" : "Criar Produto"}
            onPress={handleSave}
            containerStyle={{ marginTop: SPACING.xl }}
          />
        </BottomSheetModal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// ... Estilos permanecem os mesmos ...


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchBox: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    marginHorizontal: SPACING.md,
    padding: 12,
    borderRadius: RADIUS.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: COLORS.text.primary,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text.secondary,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: COLORS.input,
    padding: 14,
    borderRadius: RADIUS.md,
    fontSize: 16,
  },

  imageSection: { alignItems: "center", marginBottom: SPACING.lg },
  proImage: {
    width: 100,
    height: 100,
    borderRadius: 30,
    resizeMode: "cover",
    borderWidth: 3,
    borderColor: COLORS.card,
  },
  proImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: COLORS.input,
    justifyContent: "center",
    alignItems: "center",
    borderStyle: "dashed",
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  photoText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: "bold",
    marginTop: 4,
  },
  barcodeText: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.text.secondary,
    letterSpacing: 1,
  },

  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.input,
    marginRight: 8,
  },
  catChipActive: { backgroundColor: COLORS.primary },
  catText: { color: COLORS.text.secondary, fontWeight: "600", fontSize: 13 },
  catTextActive: { color: COLORS.text.light },

  miniLocBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: COLORS.input,
    borderRadius: RADIUS.sm,
    alignItems: "center",
  },
  miniLocBtnActive: { backgroundColor: COLORS.primary },

  unitChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.input,
  },
  unitChipActive: { backgroundColor: COLORS.primary },
  unitText: { color: COLORS.text.secondary, fontWeight: "bold" },
  unitTextActive: { color: COLORS.text.light },

  tagInputRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  addTagBtn: {
    backgroundColor: COLORS.status.warning,
    borderRadius: RADIUS.md,
    width: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  suggestionChip: {
    backgroundColor: COLORS.input,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    marginRight: 8,
  },
  suggestionText: {
    color: COLORS.text.secondary,
    fontSize: 12,
    fontWeight: "bold",
  },
  tagsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  activeTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF7043",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  activeTagText: { color: "white", fontWeight: "bold", fontSize: 12 },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },

  row3: { flexDirection: "row", gap: 10, marginBottom: 10 },
  col: { flex: 1 },
  miniLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: COLORS.text.secondary,
    marginBottom: 4,
    textAlign: "center",
  },
  inputSmall: {
    backgroundColor: COLORS.input,
    padding: 10,
    borderRadius: RADIUS.sm,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
  },

  cameraContainer: { flex: 1, backgroundColor: "black" },
  cameraOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
    padding: 40,
  },
  closeCameraButton: {
    backgroundColor: COLORS.status.danger,
    padding: 15,
    borderRadius: RADIUS.md,
    alignItems: "center",
  },
});
