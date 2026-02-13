import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';

type Props = {
  data: any;
  onPress: () => void;
  onEdit: () => void;   // Nova prop
  onDelete: () => void; // Nova prop
  variant?: 'local' | 'api';
};

export function RecipeCard({ data, onPress, onEdit, onDelete, variant = 'local' }: Props) {
  
  // O que aparece quando arrasta para a esquerda
  const renderRightActions = (_: any, dragX: any) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.actionsContainer}>
        {/* Botão Editar */}
        <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={onEdit}>
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons name="pencil" size={24} color="#FFF" />
            <Text style={styles.actionText}>Editar</Text>
          </Animated.View>
        </TouchableOpacity>

        {/* Botão Excluir */}
        <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={onDelete}>
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons name="trash" size={24} color="#FFF" />
            <Text style={styles.actionText}>Excluir</Text>
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  // Se for API, não tem swipe. Se for Local, tem.
  if (variant === 'api') {
    return <CardContent data={data} onPress={onPress} variant={variant} />;
  }

  return (
    <Swipeable renderRightActions={renderRightActions} containerStyle={styles.swipeContainer}>
      <CardContent data={data} onPress={onPress} variant={variant} />
    </Swipeable>
  );
}

// Extraí o conteúdo para não repetir código
function CardContent({ data, onPress, variant }: any) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={[styles.iconBox, variant === 'api' && styles.apiIconBox]}>
        <Ionicons 
          name={variant === 'api' ? 'sparkles' : 'restaurant'} 
          size={24} 
          color={variant === 'api' ? '#FFF' : '#007AFF'} 
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{data.name}</Text>
        <View style={styles.metaRow}>
          <View style={styles.badge}>
            <Ionicons name="time-outline" size={12} color="#666" />
            <Text style={styles.badgeText}>{data.preparationTime} min</Text>
          </View>
          <View style={styles.badge}>
            <Ionicons name="people-outline" size={12} color="#666" />
            <Text style={styles.badgeText}>{data.servings} porções</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    marginBottom: 12, // Movemos a margem para o container do Swipe
    borderRadius: 20,
    overflow: 'hidden',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 20,
    // Sombra
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: '#F2F2F7',
  },
  // ... Estilos do CardContent iguais aos anteriores ...
  iconBox: { width: 50, height: 50, borderRadius: 16, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  apiIconBox: { backgroundColor: '#8E44AD' },
  content: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: '#1C1C1E', marginBottom: 6 },
  metaRow: { flexDirection: 'row', gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#666' },

  // ESTILOS DO SWIPE (Ações)
  actionsContainer: {
    flexDirection: 'row',
    width: 160, // Largura total dos botões ocultos
    height: '100%',
  },
  actionBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  editBtn: { backgroundColor: '#FF9500' }, // Laranja
  deleteBtn: { backgroundColor: '#FF3B30' }, // Vermelho
  actionText: { color: '#FFF', fontSize: 10, fontWeight: 'bold', marginTop: 4 },
});