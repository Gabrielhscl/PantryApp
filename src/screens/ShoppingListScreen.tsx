import { View, Text, StyleSheet } from "react-native";

export default function ShoppingListScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🛒 Lista de Compras</Text>
      <Text>Aqui ficarão seus alimentos</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
});
