import React, { useState, useEffect } from 'react';
import { 
  View, 
  TextInput, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../database/db';
import { products, inventoryItems } from '../database/schema'; 
import { eq, like, sql } from 'drizzle-orm';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSelect: (item: any) => void;
  placeholder?: string;
};

export function Autocomplete({ value, onChangeText, onSelect, placeholder }: Props) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const searchProducts = async () => {
      if (value.length < 2) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const results = await db
          .select({
            id: products.id,
            name: products.name,
            defaultUnit: products.defaultUnit,
            brand: products.brand,
            totalStock: sql<number>`coalesce(sum(${inventoryItems.quantity}), 0)` 
          })
          .from(products)
          .leftJoin(inventoryItems, eq(products.id, inventoryItems.productId))
          .where(like(products.name, `%${value}%`))
          .groupBy(products.id)
          .limit(5);

        setSuggestions(results);
      } catch (e) {
        console.error("Erro no autocomplete:", e);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(searchProducts, 300);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder || "Digite para buscar..."}
          placeholderTextColor="#C7C7CC"
        />
        {loading && <ActivityIndicator style={styles.loader} color="#007AFF" />}
      </View>

      {/* CORREÇÃO DO ERRO: 
         Trocamos FlatList por View + Map.
         Como são poucos itens (max 5), isso é mais performático e elimina o erro de VirtualizedList.
      */}
      {suggestions.length > 0 && (
        <View style={styles.listContainer}>
          {suggestions.map((item) => {
            const hasStock = item.totalStock > 0;
            return (
              <TouchableOpacity 
                key={item.id}
                style={styles.item} 
                onPress={() => {
                  onSelect(item); 
                  setSuggestions([]);
                  Keyboard.dismiss();
                }}
              >
                <View style={{flex: 1}}>
                  <Text style={styles.itemText}>{item.name}</Text>
                  <Text style={styles.itemMeta}>
                    {item.brand ? item.brand : "Genérico"} • {item.defaultUnit}
                  </Text>
                </View>

                {hasStock ? (
                  <View style={styles.stockBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#FFF" />
                    <Text style={styles.stockText}>
                      {item.totalStock} {item.defaultUnit}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.noStockBadge}>
                    <Text style={styles.noStockText}>Sem estoque</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Botão de Criar Novo (Rodapé da Lista) */}
          <TouchableOpacity 
            style={styles.createBtn}
            onPress={() => {
              onSelect({ 
                id: `static_${Date.now()}`, 
                name: value, 
                defaultUnit: 'un' 
              });
              setSuggestions([]);
              Keyboard.dismiss();
            }}
          >
            <View style={styles.createIcon}>
              <Ionicons name="add" size={16} color="#FFF" />
            </View>
            <Text style={styles.createBtnText}>Cadastrar "{value}" como novo</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { zIndex: 10, marginBottom: 10 },
  inputContainer: { flexDirection: 'row', alignItems: 'center' },
  input: { 
    flex: 1, 
    backgroundColor: '#F2F2F7', 
    padding: 12, 
    borderRadius: 10, 
    fontSize: 16,
    color: '#1C1C1E'
  },
  loader: { position: 'absolute', right: 10 },
  
  listContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    // Removemos maxHeight fixo para deixar a lista fluir naturalmente
    elevation: 10,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8,
    position: 'absolute',
    top: 50,
    left: 0, right: 0,
    zIndex: 999
  },
  
  item: { 
    padding: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F2F2F7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  itemText: { fontWeight: '600', color: '#1C1C1E', fontSize: 15 },
  itemMeta: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4
  },
  stockText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  
  noStockBadge: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  noStockText: { color: '#8E8E93', fontSize: 10, fontWeight: '600' },

  createBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 14, 
    backgroundColor: '#F0F9FF',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12
  },
  createIcon: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#007AFF',
    justifyContent: 'center', alignItems: 'center', marginRight: 10
  },
  createBtnText: { color: '#007AFF', fontWeight: 'bold', fontSize: 14 }
});