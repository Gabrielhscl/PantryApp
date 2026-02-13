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

type RecipeCardProps = {
  data: any;
  status: { status: string; label: string; color: string };
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function RecipeCard({
  data,
  status,
  onPress,
  onEdit,
  onDelete,
}: RecipeCardProps) {
  const renderRightActions = (_: any, dragX: any) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });
    return (
      <View style={styles.actionsContainer}>
        {/* BOTÃO EDITAR (Laranja) */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.editBtn]}
          onPress={onEdit}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons name="pencil" size={24} color="#FFF" />
            <Text style={styles.actionText}>Editar</Text>
          </Animated.View>
        </TouchableOpacity>

        {/* BOTÃO EXCLUIR (Vermelho) */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={onDelete}
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
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={[styles.card, { borderLeftColor: status.color }]}
      >
        <View style={styles.imageContainer}>
          {data.image ? (
            <Image source={{ uri: data.image }} style={styles.image} />
          ) : (
            <Ionicons name="restaurant-outline" size={30} color="#007AFF" />
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {data.name}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={14} color="#666" />
            <Text style={styles.metaText}>{data.preparationTime} min</Text>
            <Text style={styles.dot}>•</Text>
            <Ionicons name="people-outline" size={14} color="#666" />
            <Text style={styles.metaText}>{data.servings} porções</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: status.color + "20" },
            ]}
          >
            <Ionicons
              name={
                status.status === "ready" ? "checkmark-circle" : "alert-circle"
              }
              size={12}
              color={status.color}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={20} color="#E5E5EA" />
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  swipeContainer: { marginBottom: 12, borderRadius: 16, overflow: "hidden" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 16,
    borderLeftWidth: 5,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F2F2F7",
  },
  imageContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: "#F2F2F7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%", resizeMode: "cover" },
  content: { flex: 1, marginRight: 10 },
  title: { fontSize: 16, fontWeight: "700", color: "#1C1C1E", marginBottom: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  metaText: { fontSize: 12, color: "#666", marginLeft: 4, marginRight: 8 },
  dot: { color: "#CCC", marginRight: 8, fontSize: 10 },
  statusBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: { fontSize: 11, fontWeight: "700" },

  // AÇÕES SWIPE (Ajustado)
  actionsContainer: { flexDirection: "row", width: 150, height: "100%" }, // Aumentado para caber 2 botões
  actionBtn: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
  },
  editBtn: { backgroundColor: "#FF9500" }, // Laranja
  deleteBtn: { backgroundColor: "#FF3B30" }, // Vermelho
  actionText: { color: "#FFF", fontSize: 11, fontWeight: "700", marginTop: 4 },
});
