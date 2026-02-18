import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

type Props = {
  item: any;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function ShoppingItemCard({ item, onToggle, onEdit, onDelete }: Props) {
  const totalValue = Number(item.price) || 0;
  const quantity = Number(item.quantity) || 1;
  const unit = item.unit?.toLowerCase() || 'un';

  // --- NOVA LÓGICA DE FORMATAÇÃO DE UNIDADES ---
  let displayQuantity = quantity;
  let displayUnit = unit;
  let displayUnitPrice = totalValue / quantity;
  let displayUnitLabel = unit;

  // 1. Converter Gramas para Quilogramas se for >= 1000g
  if (unit === 'g' && quantity >= 1000) {
    displayQuantity = quantity / 1000;
    displayUnit = 'kg';
    
    // Se convertermos para kg, o preço unitário que queremos mostrar é o Preço por Kg
    displayUnitPrice = totalValue / displayQuantity;
    displayUnitLabel = 'kg';
  }
  // 2. Converter Mililitros para Litros se for >= 1000ml
  else if (unit === 'ml' && quantity >= 1000) {
    displayQuantity = quantity / 1000;
    displayUnit = 'L';
    
    // O preço unitário que queremos mostrar é o Preço por Litro
    displayUnitPrice = totalValue / displayQuantity;
    displayUnitLabel = 'L';
  }

  // Formata o número para não ter zeros desnecessários (ex: "1.5" em vez de "1.500")
  // Se for inteiro, não mete casas decimais. Se for quebrado, limita a 2, máximo 3.
  const formatQuantity = (num: number) => {
    return Number.isInteger(num) ? String(num) : Number(num.toFixed(3)).toString();
  };

  const renderRightActions = (_progress: any, dragX: Animated.AnimatedInterpolation<number>) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.primary }]} onPress={onEdit}>
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons name="pencil" size={22} color="#FFF" />
          </Animated.View>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.status.danger }]} onPress={onDelete}>
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons name="trash-outline" size={22} color="#FFF" />
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions} containerStyle={styles.swipeContainer}>
      <TouchableOpacity 
        activeOpacity={0.8} 
        style={styles.card} 
        onPress={onToggle}
      >
        
        <View style={[styles.checkbox, item.isChecked && styles.checkedBox]}>
          {item.isChecked && <Ionicons name="checkmark" size={16} color="#FFF" />}
        </View>

        <View style={styles.content}>
          <Text style={[styles.name, item.isChecked && styles.checkedText]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.metaRow}>
            {/* AGORA USA A QUANTIDADE E UNIDADE INTELIGENTES */}
            <Text style={[styles.quantity, item.isChecked && styles.checkedSubText]}>
              {formatQuantity(displayQuantity)}{displayUnit}
            </Text>
            
            {/* O PREÇO MOSTRA O VALOR POR KG OU LITRO SE APLICÁVEL */}
            {totalValue > 0 && (
              <Text style={[styles.priceUnit, item.isChecked && styles.checkedSubText]}>
                • R$ {displayUnitPrice.toFixed(2).replace('.', ',')}/{displayUnitLabel}
              </Text>
            )}
          </View>
        </View>

        {totalValue > 0 && (
          <View style={styles.priceContainer}>
            <Text style={[styles.totalPrice, item.isChecked && styles.checkedSubText]}>
              R$ {totalValue.toFixed(2).replace('.', ',')}
            </Text>
          </View>
        )}

      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  swipeContainer: { 
    marginBottom: SPACING.sm, 
    borderRadius: RADIUS.md, 
    backgroundColor: 'transparent', 
    overflow: 'hidden' 
  },
  card: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.card, 
    padding: SPACING.md, 
    borderRadius: RADIUS.md, 
    borderWidth: 1, 
    borderColor: COLORS.border 
  },
  checkbox: { 
    width: 24, 
    height: 24, 
    borderRadius: RADIUS.sm, 
    borderWidth: 2, 
    borderColor: COLORS.text.secondary, 
    marginRight: SPACING.md, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: COLORS.card 
  },
  checkedBox: { 
    backgroundColor: COLORS.status.success, 
    borderColor: COLORS.status.success 
  },
  content: { 
    flex: 1, 
    justifyContent: 'center' 
  },
  name: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: COLORS.text.primary, 
    marginBottom: 4 
  },
  checkedText: { 
    textDecorationLine: 'line-through', 
    color: COLORS.text.secondary 
  },
  metaRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flexWrap: 'wrap' 
  },
  quantity: { 
    fontSize: 13, 
    color: COLORS.text.secondary, 
    fontWeight: '600' 
  },
  priceUnit: { 
    fontSize: 13, 
    color: COLORS.text.secondary, 
    marginLeft: 4 
  },
  priceContainer: { 
    marginLeft: SPACING.md, 
    alignItems: 'flex-end', 
    justifyContent: 'center' 
  },
  totalPrice: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: COLORS.primary 
  },
  checkedSubText: {
    color: COLORS.border, 
  },
  actionsContainer: { 
    flexDirection: 'row', 
    width: 130, 
    height: '100%' 
  },
  actionBtn: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
});