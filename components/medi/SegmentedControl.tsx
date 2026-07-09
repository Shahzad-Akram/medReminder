import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/colors';

interface SegmentedControlProps {
  options: { label: string; count?: number }[];
  selected: number;
  onSelect: (index: number) => void;
}

export const SegmentedControl = ({ options, selected, onSelect }: SegmentedControlProps) => (
  <View style={styles.container}>
    {options.map((option, index) => {
      const isActive = selected === index;
      return (
        <Pressable
          key={option.label}
          onPress={() => onSelect(index)}
          style={[styles.option, isActive && styles.optionActive]}
          accessibilityRole="button"
          accessibilityState={{ selected: isActive }}>
          <Text style={[styles.label, isActive && styles.labelActive]}>{option.label}</Text>
          {option.count !== undefined && (
            <View style={[styles.count, isActive && styles.countActive]}>
              <Text style={[styles.countText, isActive && styles.countTextActive]}>{option.count}</Text>
            </View>
          )}
        </Pressable>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 4,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
  },
  optionActive: {
    backgroundColor: Colors.primary,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  labelActive: {
    color: Colors.white,
  },
  count: {
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  countTextActive: {
    color: Colors.white,
  },
});
