import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";

type InventoryItemProps = {
  item: {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    image?: string | null;
    expiryDate?: Date | string | null;
    createdAt?: Date | string | null; // Adicionado createdAt
    brand?: string;
    location?: string;
    packSize?: number;
    packUnit?: string;
    category?: string;
    calories?: number; // Nutrição
    carbs?: number;
    protein?: number;
    fat?: number;
    fiber?: number;
    sodium?: number;
    allergens?: string;
  };
  onIncrement?: (id: string) => void;
  onDecrement?: (id: string) => void;
  onPress: (item: any) => void;
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
};

// Categorias que devem ser mostradas sempre como PESO TOTAL (não unidades)
const BULK_CATEGORIES = ["Carnes", "Frutas", "Legumes", "Grãos", "Frios"];

export function InventoryItemCard({
  item,
  onPress,
  onEdit,
  onDelete,
}: InventoryItemProps) {
  // --- CORES POR LOCAL ---
  const getLocationColor = (loc?: string) => {
    switch (loc) {
      case "fridge":
        return "#42A5F5"; // Azul (Geladeira)
      case "freezer":
        return "#26C6DA"; // Ciano (Freezer)
      case "pantry":
      default:
        return "#FFB74D"; // Laranja (Armário)
    }
  };

  const locationColor = getLocationColor(item.location);

  // --- VENCIMENTO ---
  const getExpiryStatus = (date?: Date | string | null) => {
    if (!date) return null;
    const expiry = new Date(date);
    expiry.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil(
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays < 0)
      return {
        color: "#FF3B30",
        bg: "#FFEBEE",
        icon: "alert-circle",
        label:
          Math.abs(diffDays) === 1
            ? "Venceu ontem"
            : `Venceu há ${Math.abs(diffDays)} d`,
      };
    if (diffDays === 0)
      return {
        color: "#D32F2F",
        bg: "#FFCDD2",
        icon: "alarm",
        label: "Vence hoje",
      };
    if (diffDays <= 3)
      return {
        color: "#FF9500",
        bg: "#FFF3E0",
        icon: "warning",
        label: `Vence em ${diffDays} d`,
      };

    let label = "";
    if (diffDays < 30) label = `${diffDays} d`;
    else if (diffDays < 365) label = `${Math.floor(diffDays / 30)} m`;
    else label = `${Math.floor(diffDays / 365)} a`;

    return { color: "#34C759", bg: "#E8F5E9", icon: "calendar-outline", label };
  };

  const status = getExpiryStatus(item.expiryDate);

  // --- NOVA LÓGICA DE EXIBIÇÃO ---
  const renderQuantityDisplay = () => {
    const qty = item.quantity;
    const pSize = item.packSize || 0;

    // Verifica se é categoria de granel (Carne, Fruta...)
    const isBulk = BULK_CATEGORIES.some((cat) => item.category?.includes(cat));

    // LÓGICA 1: GRANEL (Mostra Total Formatado: Kg ou L)
    if (isBulk) {
      let displayQty = qty;
      let displayUnit = item.unit;

      // Converte gramas para Kg se passar de 1000
      if (item.unit === "g" && qty >= 1000) {
        displayQty = parseFloat((qty / 1000).toFixed(2)); // Ex: 1.5
        displayUnit = "kg";
      }
      // Converte ml para Litros se passar de 1000
      else if (item.unit === "ml" && qty >= 1000) {
        displayQty = parseFloat((qty / 1000).toFixed(2));
        displayUnit = "L";
      }

      return (
        <View style={styles.quantityBadge}>
          <Text style={styles.qtyValue}>{displayQty}</Text>
          <Text style={styles.qtyUnit}>{displayUnit}</Text>
        </View>
      );
    }

    // LÓGICA 2: EMBALADOS (Mantém sua lógica de Unidade + Sobra)
    // Se não tiver tamanho de pacote, mostra normal
    if (!pSize || pSize <= 0) {
      return (
        <View style={styles.quantityBadge}>
          <Text style={styles.qtyValue}>{qty}</Text>
          <Text style={styles.qtyUnit}>{item.unit}</Text>
        </View>
      );
    }

    const units = Math.floor(qty / pSize);
    const remainder = parseFloat((qty - units * pSize).toFixed(2));

    if (remainder === 0) {
      return (
        <View style={styles.quantityBadge}>
          <Text style={styles.qtyValue}>{units}</Text>
          <Text style={styles.qtyUnit}>UN</Text>
        </View>
      );
    }

    if (units === 0) {
      return (
        <View style={styles.quantityBadge}>
          <Text style={styles.qtyValue}>{remainder}</Text>
          <Text style={styles.qtyUnit}>{item.unit}</Text>
        </View>
      );
    }

    return (
      <View style={styles.quantityBadgeColumn}>
        <View style={{ flexDirection: "row", alignItems: "baseline" }}>
          <Text style={styles.qtyValue}>{units}</Text>
          <Text style={styles.qtyUnit}> UN</Text>
        </View>
        <Text style={styles.qtyRemainder}>
          + {remainder}
          {item.unit}
        </Text>
      </View>
    );
  };

  // SWIPE ACTIONS
  const renderRightActions = (_: any, dragX: any) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });

    return (
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.editBtn]}
          onPress={() => onEdit(item)}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons name="pencil" size={24} color="#FFF" />
            <Text style={styles.actionText}>Editar</Text>
          </Animated.View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() => onDelete(item.id)}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons name="trash" size={24} color="#FFF" />
            <Text style={styles.actionText}>Excluir</Text>
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      containerStyle={styles.swipeContainer}
    >
      {/* Envolvemos o View do Card com TouchableOpacity */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onPress(item)} // <-- AQUI CHAMA O MODAL
        style={[styles.card, { borderLeftColor: locationColor }]}
      >
        <View style={styles.iconBox}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.cardImage} />
          ) : (
            <Ionicons name="cube-outline" size={24} color="#007AFF" />
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.metaColumn}>
            <Text style={styles.brandText}>
              {item.brand || "Genérico"}
              {BULK_CATEGORIES.some((cat) => item.category?.includes(cat))
                ? ` • ${item.category}`
                : ""}
            </Text>
            {status ? (
              <View
                style={[styles.expiryBadge, { backgroundColor: status.bg }]}
              >
                <Ionicons
                  name={status.icon as any}
                  size={10}
                  color={status.color}
                  style={{ marginRight: 3 }}
                />
                <Text style={[styles.expiryText, { color: status.color }]}>
                  {status.label}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {renderQuantityDisplay()}
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  swipeContainer: { marginBottom: 10, borderRadius: 16, overflow: "hidden" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    borderLeftWidth: 6,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F2F2F7",
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#F2F2F7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    overflow: "hidden",
    marginLeft: 4,
  },
  cardImage: { width: "100%", height: "100%", resizeMode: "cover" },
  content: { flex: 1, marginRight: 8, justifyContent: "center" },
  title: { fontSize: 16, fontWeight: "700", color: "#1C1C1E", marginBottom: 4 },
  metaColumn: { flexDirection: "column", alignItems: "flex-start", gap: 4 },
  brandText: { fontSize: 12, color: "#8E8E93", fontWeight: "500" },

  expiryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  expiryText: { fontSize: 10, fontWeight: "700" },

  quantityBadge: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F2F7",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    minWidth: 60,
  },
  quantityBadgeColumn: {
    alignItems: "flex-end",
    justifyContent: "center",
    backgroundColor: "#F2F2F7",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    minWidth: 60,
  },
  qtyValue: { fontSize: 16, fontWeight: "800", color: "#1C1C1E" },
  qtyUnit: {
    fontSize: 9,
    color: "#8E8E93",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  qtyRemainder: {
    fontSize: 9,
    color: "#FF9500",
    fontWeight: "600",
    marginTop: -2,
  },

  actionsContainer: { flexDirection: "row", width: 150, height: "100%" },
  actionBtn: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
  },
  editBtn: { backgroundColor: "#FF9500" },
  deleteBtn: { backgroundColor: "#FF3B30" },
  actionText: { color: "#FFF", fontSize: 11, fontWeight: "700", marginTop: 4 },
});
