import React, { memo } from "react";
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

type ItemProps = {
  item: any;
  onIncrement: (id: string, current: number) => void;
  onDecrement: (id: string, current: number) => void;
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
};

// 1. Mapeamento de nomes para exibição (Isto resolve o seu problema)
const LOCATION_NAMES: Record<string, string> = {
  fridge: "Geladeira",
  freezer: "Freezer",
  pantry: "Armário",
};

export const InventoryItemCard = memo(
  ({ item, onIncrement, onDecrement, onEdit, onDelete }: ItemProps) => {
    const getExpiryStatus = (dateString?: string | Date) => {
      if (!dateString) return null;
      const today = new Date();
      const expiry = new Date(dateString);
      today.setHours(0, 0, 0, 0);
      expiry.setHours(0, 0, 0, 0);
      const days = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);

      if (days < 0)
        return {
          text: `Venceu há ${Math.abs(days)}d`,
          color: "#d32f2f",
          bgColor: "#ffebee",
          icon: "alert-circle",
        };
      if (days === 0)
        return {
          text: "Vence HOJE",
          color: "#c62828",
          bgColor: "#ffebee",
          icon: "alert-circle",
        };
      if (days <= 30)
        return {
          text: `${days} dias`,
          color: "#e65100",
          bgColor: "#fff3e0",
          icon: "hourglass-outline",
        };
      const m = Math.floor(days / 30);
      return {
        text: `${m} meses`,
        color: "#2e7d32",
        bgColor: "#e8f5e9",
        icon: "calendar-outline",
      };
    };

    const status = getExpiryStatus(item.expiryDate);
    const alertTags = item.allergens
      ? item.allergens.split(",").filter((t: string) => t.trim() !== "")
      : [];

    const renderRightActions = (progress: any, dragX: any) => {
      const scale = dragX.interpolate({
        inputRange: [-100, 0],
        outputRange: [1, 0],
        extrapolate: "clamp",
      });
      return (
        <TouchableOpacity
          onPress={() => onDelete(item.id)}
          style={[styles.actionBtn, styles.deleteBtn]}
        >
          <Animated.View
            style={[styles.actionContent, { transform: [{ scale }] }]}
          >
            <Ionicons name="trash" size={28} color="white" />
            <Text style={styles.actionText}>Excluir</Text>
          </Animated.View>
        </TouchableOpacity>
      );
    };

    const renderLeftActions = (progress: any, dragX: any) => {
      const scale = dragX.interpolate({
        inputRange: [0, 100],
        outputRange: [0, 1],
        extrapolate: "clamp",
      });

      return (
        <TouchableOpacity
          onPress={() => onEdit(item)}
          style={[styles.actionBtn, styles.editSwipeBtn]}
        >
          <Animated.View
            style={[styles.actionContent, { transform: [{ scale }] }]}
          >
            <Ionicons name="pencil" size={28} color="white" />
            <Text style={styles.actionText}>Editar</Text>
          </Animated.View>
        </TouchableOpacity>
      );
    };

    return (
      <Swipeable
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        leftThreshold={40}
        rightThreshold={40}
      >
        <View
          style={[
            styles.card,
            status ? { borderLeftWidth: 5, borderLeftColor: status.color } : {},
          ]}
        >
          <Image
            source={
              item.image
                ? { uri: item.image }
                : require("../../assets/icon.png")
            }
            style={styles.image}
          />

          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>

            {/* 2. Tradução aplicada aqui embaixo */}
            <Text style={styles.brand}>
              <Ionicons
                name={
                  item.location === "fridge"
                    ? "thermometer-outline"
                    : item.location === "freezer"
                      ? "snow-outline"
                      : "cube-outline"
                }
                size={12}
                color="#666666"
                style={{ marginRight: 4 }}
              />
              {LOCATION_NAMES[item.location] || item.location}{" "}
              {item.brand ? `• ${item.brand}` : ""}
            </Text>

            <View style={styles.tagsRow}>
              {status && (
                <View
                  style={[
                    styles.expiryTag,
                    { backgroundColor: status.bgColor },
                  ]}
                >
                  <Text style={[styles.expiryText, { color: status.color }]}>
                    {status.text}
                  </Text>
                </View>
              )}
              {alertTags.slice(0, 1).map((tag, i) => (
                <View key={i} style={styles.alertTag}>
                  <Text style={styles.alertTagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.qtyControl}>
            <TouchableOpacity
              onPress={() => onDecrement(item.id, item.quantity)}
              style={styles.btnMini}
            >
              <Ionicons name="remove" size={18} color="#d32f2f" />
            </TouchableOpacity>
            <View style={{ alignItems: "center", minWidth: 30 }}>
              <Text style={styles.qtyText}>{item.quantity}</Text>
              <Text style={styles.unitText}>{item.unit}</Text>
            </View>
            <TouchableOpacity
              onPress={() => onIncrement(item.id, item.quantity)}
              style={styles.btnMini}
            >
              <Ionicons name="add" size={18} color="#388e3c" />
            </TouchableOpacity>
          </View>
        </View>
      </Swipeable>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    alignItems: "center",
    elevation: 2,
  },
  image: { width: 50, height: 50, borderRadius: 8, backgroundColor: "#eee" },
  info: { flex: 1, marginLeft: 10, justifyContent: "center" },
  name: { fontWeight: "bold", fontSize: 15, color: "#333" },
  brand: { fontSize: 11, color: "#666", textTransform: "capitalize" },
  tagsRow: { flexDirection: "row", marginTop: 4, gap: 4 },
  expiryTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  expiryText: { fontSize: 10, fontWeight: "700" },
  alertTag: {
    backgroundColor: "#fff3e0",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  alertTagText: { fontSize: 9, color: "#e65100", fontWeight: "bold" },
  qtyControl: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 2,
  },
  btnMini: { padding: 6 },
  qtyText: { fontSize: 13, fontWeight: "bold" },
  unitText: { fontSize: 9, color: "#888" },
  actionBtn: {
    justifyContent: "center",
    width: 100,
    marginBottom: 8,
    borderRadius: 12,
  },
  deleteBtn: {
    backgroundColor: "#d32f2f",
    alignItems: "flex-start",
    paddingLeft: 25,
    marginLeft: -15,
  },
  editSwipeBtn: {
    backgroundColor: "#007AFF",
    alignItems: "flex-end",
    paddingRight: 25,
    marginRight: -15,
  },
  actionContent: { alignItems: "center", justifyContent: "center", width: 60 },
  actionText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 4,
    textAlign: "center",
  },
});
