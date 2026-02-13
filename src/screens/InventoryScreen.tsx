import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";

// --- IMPORTS DA ARQUITETURA ---
import { useInventory } from "../hooks/useInventory";
import { InventoryItemCard } from "../components/InventoryItemCard";
import { Autocomplete } from "../components/Autocomplete";
import { ProductService } from "../services/productService";
import { NotificationService } from "../services/notificationService";
import { InventoryRepository } from "../repositories/inventoryRepository";

const UNIT_OPTIONS = [
  { label: "Unidade (un)", value: "un" },
  { label: "Quilograma (kg)", value: "kg" },
  { label: "Grama (g)", value: "g" },
  { label: "Litro (L)", value: "L" },
  { label: "Mililitro (ml)", value: "ml" },
  { label: "Pacote (pct)", value: "pct" },
  { label: "Caixa (cx)", value: "cx" },
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

export default function InventoryScreen() {
  const { items, filter, setFilter, actions, refresh } = useInventory();

  // Estados de UI
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Estados do Formulário
  const [name, setName] = useState("");
  const [packCount, setPackCount] = useState("1");
  const [packSize, setPackSize] = useState("");
  const [unit, setUnit] = useState("un");
  const [totalDisplay, setTotalDisplay] = useState("");
  const [expiry, setExpiry] = useState(new Date());
  const [location, setLocation] = useState("pantry");
  const [productImage, setProductImage] = useState<string | null>(null);
  const [calories, setCalories] = useState("");
  const [brand, setBrand] = useState("");

  // Tags de Alerta
  const [alertTags, setAlertTags] = useState<string[]>([]);
  const [currentTagInput, setCurrentTagInput] = useState("");

  const LOCATION_OPTIONS = [
    { id: "pantry", label: "Armário", icon: "cube-outline" },
    { id: "fridge", label: "Geladeira", icon: "thermometer-outline" },
    { id: "freezer", label: "Freezer", icon: "snow-outline" },
  ];

  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [scanned, setScanned] = useState(false);

  const displayItems = items.filter((i) =>
    i.name.toLowerCase().includes(searchText.toLowerCase()),
  );

  useEffect(() => {
    const count = parseFloat(packCount) || 0;
    const size = parseFloat(packSize);

    // Lógica para mostrar o total corretamente
    if (!isNaN(size) && size > 0) {
      setTotalDisplay(
        `Total: ${(count * size).toFixed(2).replace(".00", "")} ${unit}`,
      );
    } else {
      setTotalDisplay(`Total: ${count} ${unit}`);
    }
  }, [packCount, packSize, unit]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setPackCount("1");
    setPackSize("");
    setUnit("un");
    setProductImage(null);
    setCalories("");
    setBrand("");
    setTotalDisplay("");
    setExpiry(new Date());
    setAlertTags([]);
    setCurrentTagInput("");
    setLocation("pantry");
  };

  const addTag = (tag: string) => {
    const cleanTag = tag.trim();
    if (cleanTag && !alertTags.includes(cleanTag)) {
      setAlertTags([...alertTags, cleanTag]);
      setCurrentTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) =>
    setAlertTags(alertTags.filter((tag) => tag !== tagToRemove));

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setScanned(true);
    setIsScanning(false);
    setLoadingProduct(true);

    const info = await ProductService.fetchProductByBarcode(data);
    setLoadingProduct(false);

    // Preenchimento dos dados
    if (info.name) setName(info.name);
    if (info.image) setProductImage(info.image);
    if (info.calories) setCalories(info.calories.toString());
    if (info.brand) setBrand(info.brand);

    if (info.found) {
      if (info.location) setLocation(info.location);
      if (info.allergens) {
        const apiTags = info.allergens
          .split(",")
          .map((t: string) => t.trim())
          .filter((t: string) => t !== "");
        setAlertTags((prev) => [...new Set([...prev, ...apiTags])]);
      }

      if (info.packSize) {
        setPackSize(info.packSize.toString());
        if (info.packUnit) setUnit(info.packUnit);
      }
    } else {
      Alert.alert("Aviso", "Produto não encontrado. Preencha manualmente.");
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setName(item.name);
    setUnit(item.unit);
    // Tenta deduzir se foi calculado com packSize ou não
    // Simplificação: assume packSize 1 na edição se não tiver histórico
    setPackCount(item.quantity.toString());
    setPackSize("1");
    setProductImage(item.image);
    setCalories(item.calories ? item.calories.toString() : "");
    setBrand(item.brand || "");
    setLocation(item.location || "pantry");

    if (item.allergens) {
      setAlertTags(
        item.allergens.split(",").filter((t: string) => t.trim() !== ""),
      );
    }
    if (item.expiryDate) setExpiry(new Date(item.expiryDate));
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name || !packCount)
      return Alert.alert("Erro", "Preencha nome e quantidade.");

    let finalQuantity = parseFloat(packCount);
    const size = parseFloat(packSize);

    // Se o usuário preencheu o tamanho do pacote, multiplica
    if (!isNaN(size) && size > 0) finalQuantity = finalQuantity * size;

    const allergensString = alertTags.join(",");

    try {
      const itemData = {
        name,
        quantity: finalQuantity,
        unit,
        location,
        expiryDate: expiry,
        image: productImage,
        calories: calories ? parseFloat(calories) : 0,
        allergens: allergensString,
        brand,
      };

      if (editingId) {
        await InventoryRepository.updateItem(editingId, itemData);
        Alert.alert("Atualizado", "Item editado com sucesso!");
      } else {
        await InventoryRepository.createItem(itemData);
        await NotificationService.scheduleExpiryNotification(name, expiry);
        Alert.alert("Sucesso", "Item salvo! 📦");
      }

      setModalVisible(false);
      resetForm();
      refresh();
    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Falha ao salvar item.");
    }
  };

  if (isScanning) {
    if (!permission?.granted)
      return (
        <View style={styles.center}>
          <Text>Acesso à câmera negado.</Text>
          <TouchableOpacity onPress={requestPermission}>
            <Text style={{ color: "blue" }}>Permitir</Text>
          </TouchableOpacity>
        </View>
      );

    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📦 Meu Estoque</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            placeholder="Buscar alimento..."
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      <View style={styles.filters}>
        {["all", "fridge", "pantry", "freezer"].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f as any)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive,
              ]}
            >
              {f === "all"
                ? "Todos"
                : f === "fridge"
                  ? "Geladeira"
                  : f === "pantry"
                    ? "Armário"
                    : "Freezer"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={displayItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <InventoryItemCard
            item={item}
            onIncrement={actions.increment}
            onDecrement={actions.decrement}
            onEdit={handleEdit}
            onDelete={actions.removeItem}
          />
        )}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 50 }}>
            <Ionicons name="basket-outline" size={60} color="#ccc" />
            <Text style={{ color: "#999", marginTop: 10 }}>Estoque vazio</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          resetForm();
          setModalVisible(true);
        }}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setModalVisible(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId ? "Editar Produto" : "Novo Produto"}
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
                <View style={styles.imageSection}>
                  <TouchableOpacity
                    onPress={() => {
                      setScanned(false);
                      setIsScanning(true);
                    }}
                  >
                    {productImage ? (
                      <Image
                        source={{ uri: productImage }}
                        style={styles.proImage}
                      />
                    ) : (
                      <View style={styles.proImagePlaceholder}>
                        <Ionicons
                          name="camera-outline"
                          size={32}
                          color="#007AFF"
                        />
                        <Text style={styles.photoText}>Foto</Text>
                      </View>
                    )}
                    <View style={styles.scanBadge}>
                      <Ionicons name="barcode" size={16} color="white" />
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Nome do Produto</Text>
                  <Autocomplete
                    value={name}
                    onChangeText={setName}
                    placeholder="Ex: Arroz..."
                    onSelect={(item) => {
                      setName(item.name);
                      if (item.defaultUnit) setUnit(item.defaultUnit);
                    }}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Onde será guardado?</Text>
                  <View style={styles.locationContainer}>
                    {LOCATION_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.id}
                        style={[
                          styles.locationTag,
                          location === opt.id && styles.locationTagActive,
                        ]}
                        onPress={() => setLocation(opt.id)}
                      >
                        <Ionicons
                          name={opt.icon as any}
                          size={18}
                          color={location === opt.id ? "white" : "#666"}
                        />
                        <Text
                          style={[
                            styles.locationTagText,
                            location === opt.id && styles.locationTagTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* --- SEÇÃO DE QUANTIDADE E UNIDADE --- */}
                <View style={styles.calcCard}>
                  <Text style={styles.sectionLabel}>Quantidade & Unidade</Text>
                  <View style={styles.calcRow}>
                    {/* Input Quantidade */}
                    <View style={styles.calcInputWrapper}>
                      <Text style={styles.miniLabel}>Qtd.</Text>
                      <TextInput
                        keyboardType="numeric"
                        style={styles.calcInput}
                        value={packCount}
                        onChangeText={setPackCount}
                      />
                    </View>

                    <Ionicons
                      name="close"
                      size={20}
                      color="#999"
                      style={{ marginTop: 15 }}
                    />

                    {/* Input Tamanho/Peso */}
                    <View style={styles.calcInputWrapper}>
                      <Text style={styles.miniLabel}>Tam./Peso</Text>
                      <TextInput
                        keyboardType="numeric"
                        style={styles.calcInput}
                        value={packSize}
                        onChangeText={setPackSize}
                        placeholder="1"
                      />
                    </View>

                    {/* NOVO: Picker de Unidade */}
                    <View style={[styles.calcInputWrapper, { flex: 1.5 }]}>
                      <Text style={styles.miniLabel}>Unidade</Text>
                      <View style={styles.pickerWrapper}>
                        <Picker
                          selectedValue={unit}
                          onValueChange={(itemValue) => setUnit(itemValue)}
                          style={styles.pickerSlim}
                        >
                          {UNIT_OPTIONS.map((opt) => (
                            <Picker.Item
                              key={opt.value}
                              label={opt.label}
                              value={opt.value}
                              style={{ fontSize: 14 }}
                            />
                          ))}
                        </Picker>
                      </View>
                    </View>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalText}>Total Calculado: </Text>
                    <Text style={styles.totalValue}>{totalDisplay || "0"}</Text>
                  </View>
                </View>

                <View style={styles.rowArgs}>
                  <View style={styles.flexInput}>
                    <Text style={styles.label}>Kcal (100g)</Text>
                    <View style={styles.iconInput}>
                      <Ionicons
                        name="flame-outline"
                        size={18}
                        color="#ff9800"
                        style={{ marginRight: 8 }}
                      />
                      <TextInput
                        keyboardType="numeric"
                        style={styles.cleanInput}
                        value={calories}
                        onChangeText={setCalories}
                      />
                    </View>
                  </View>
                  <View style={[styles.flexInput, { marginLeft: 15 }]}>
                    <Text style={styles.label}>Validade</Text>
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(true)}
                      style={styles.dateSelector}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color="#007AFF"
                      />
                      <Text style={styles.dateText}>
                        {expiry.toLocaleDateString()}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Alertas & Etiquetas</Text>
                  <View style={styles.tagInputRow}>
                    <View style={styles.iconInputFlex}>
                      <Ionicons
                        name="pricetag-outline"
                        size={18}
                        color="#666"
                        style={{ marginRight: 8 }}
                      />
                      <TextInput
                        style={styles.cleanInput}
                        value={currentTagInput}
                        onChangeText={setCurrentTagInput}
                        placeholder="Ex: Sem Glúten..."
                        onSubmitEditing={() => addTag(currentTagInput)}
                      />
                    </View>
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
                    style={styles.suggestionScroll}
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
                </View>

                {showDatePicker && (
                  <DateTimePicker
                    value={expiry}
                    mode="date"
                    onChange={(e, d) => {
                      setShowDatePicker(false);
                      if (d) setExpiry(d);
                    }}
                  />
                )}
              </ScrollView>
            </KeyboardAvoidingView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.proSaveButton}
                onPress={handleSave}
              >
                <Text style={styles.proSaveText}>
                  {editingId ? "Salvar Alterações" : "Adicionar ao Estoque"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f2f7" },
  header: { padding: 16, backgroundColor: "white", paddingTop: 50 },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1c1c1e",
    marginBottom: 15,
  },
  searchBox: {
    flexDirection: "row",
    backgroundColor: "#f2f2f7",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  searchInput: { marginLeft: 10, flex: 1, fontSize: 16, color: "#333" },
  filters: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e5ea",
  },
  filterChipActive: { backgroundColor: "#007AFF", borderColor: "#007AFF" },
  filterText: { fontWeight: "600", color: "#666" },
  filterTextActive: { color: "white" },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
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
    height: "85%",
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
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#333" },
  closeBtn: { padding: 5, backgroundColor: "#f2f2f7", borderRadius: 20 },
  modalBody: { flex: 1, padding: 20 },
  imageSection: { alignItems: "center", marginBottom: 20 },
  proImage: {
    width: 100,
    height: 100,
    borderRadius: 30,
    resizeMode: "cover",
    borderWidth: 3,
    borderColor: "#fff",
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
  scanBadge: {
    position: "absolute",
    bottom: -5,
    right: -5,
    backgroundColor: "#333",
    padding: 8,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "white",
  },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 13, fontWeight: "600", color: "#666", marginBottom: 6 },
  iconInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e5ea",
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: "#fbfbfb",
    height: 50,
  },
  cleanInput: { flex: 1, fontSize: 16, color: "#333", height: "100%" },
  tagInputRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  iconInputFlex: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e5ea",
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: "#fbfbfb",
    height: 50,
    marginRight: 10,
  },
  addTagBtn: {
    backgroundColor: "#007AFF",
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  suggestionScroll: { flexDirection: "row", marginBottom: 15 },
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
  calcCard: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#eee",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#999",
    marginBottom: 10,
    textTransform: "uppercase",
  },
  calcRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 8, // Espaçamento entre colunas
  },
  calcInputWrapper: { flex: 1, alignItems: "center" },
  miniLabel: { fontSize: 10, color: "#888", marginBottom: 4 },
  calcInput: {
    width: "100%",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 16,
  },
  // ESTILOS DO PICKER (USADOS AGORA)
  pickerWrapper: {
    width: "100%",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    height: 48, // Altura compatível com os inputs
    justifyContent: "center",
    overflow: "hidden",
  },
  pickerSlim: {
    width: "100%",
    height: 50,
    backgroundColor: "transparent",
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
    padding: 8,
    backgroundColor: "#e3f2fd",
    borderRadius: 8,
  },
  totalText: { color: "#1565c0", fontWeight: "600", fontSize: 14 },
  totalValue: { color: "#1565c0", fontWeight: "bold", fontSize: 16 },
  rowArgs: { flexDirection: "row", marginBottom: 15 },
  flexInput: { flex: 1 },
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e5ea",
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: "white",
    height: 50,
  },
  dateText: { marginLeft: 8, fontSize: 16, color: "#333" },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    backgroundColor: "white",
  },
  proSaveButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  proSaveText: { color: "white", fontSize: 18, fontWeight: "bold" },
  cameraContainer: {
    flex: 1,
    backgroundColor: "black",
  },
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
  locationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 5,
  },
  locationTag: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#f2f2f7",
    borderWidth: 1,
    borderColor: "#e5e5ea",
    gap: 6,
  },
  locationTagActive: { backgroundColor: "#007AFF", borderColor: "#007AFF" },
  locationTagText: { fontSize: 13, fontWeight: "600", color: "#666" },
  locationTagTextActive: { color: "white" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
