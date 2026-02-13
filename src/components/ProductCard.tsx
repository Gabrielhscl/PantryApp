import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";

type Props = {
  data: any;
  onEdit: () => void;
  onDelete: () => void;
};

export function ProductCard({ data, onEdit, onDelete }: Props) {
  // Ações ao deslizar (Botões Escondidos)
  const renderRightActions = (_: any, dragX: any) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });

    return (
      <View style={styles.actionsContainer}>
        {/* Botão Editar (Laranja) */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.editBtn]}
          onPress={onEdit}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons name="pencil" size={24} color="#FFF" />
            <Text style={styles.actionText}>Editar</Text>
          </Animated.View>
        </TouchableOpacity>

        {/* Botão Excluir (Vermelho) */}
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
      <View style={styles.card}>
        {/* Ícone ou Foto do Produto */}
        <View style={styles.iconBox}>
          {data.image ? (
            <Image source={{ uri: data.image }} style={styles.cardImage} />
          ) : (
            <Ionicons name="cube-outline" size={24} color="#007AFF" />
          )}
        </View>

        {/* Informações */}
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {data.name}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{data.brand || "Genérico"}</Text>
            <Text style={styles.dot}>•</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{data.defaultUnit}</Text>
            </View>
            {data.calories > 0 && (
              <>
                <Text style={styles.dot}>•</Text>
                <Text style={styles.metaText}>{data.calories} kcal</Text>
              </>
            )}
          </View>
        </View>

        {/* Setinha indicando que é clicável/arrastável */}
        <Ionicons
          name="chevron-back"
          size={20}
          color="#E5E5EA"
          style={{ transform: [{ rotate: "180deg" }] }}
        />
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 16,
    // Sombra suave
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F2F2F7",
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F2F2F7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    overflow: "hidden",
  },
  cardImage: { width: "100%", height: "100%", resizeMode: "cover" },

  content: { flex: 1 },
  title: { fontSize: 16, fontWeight: "700", color: "#1C1C1E", marginBottom: 4 },

  metaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  metaText: { fontSize: 13, color: "#8E8E93", fontWeight: "500" },
  dot: { marginHorizontal: 6, color: "#C7C7CC", fontSize: 10 },

  badge: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#007AFF",
    textTransform: "uppercase",
  },

  // AÇÕES (Swipe)
  actionsContainer: {
    flexDirection: "row",
    width: 150,
    height: "100%",
  },
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
