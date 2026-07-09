import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';

interface ProgressRingProps {
  percent: number;
  size?: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
}

export const ProgressRing = ({
  percent,
  size = 80,
  color = Colors.primary,
  trackColor = Colors.border,
  children,
}: ProgressRingProps) => (
  <View
    style={[
      styles.ring,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        borderColor: trackColor,
      },
    ]}>
    <View
      style={[
        styles.fill,
        {
          width: size - 8,
          height: size - 8,
          borderRadius: (size - 8) / 2,
          borderColor: color,
          borderTopColor: percent >= 25 ? color : trackColor,
          borderRightColor: percent >= 50 ? color : trackColor,
          borderBottomColor: percent >= 75 ? color : trackColor,
          borderLeftColor: percent >= 100 ? color : percent >= 50 ? color : trackColor,
        },
      ]}>
      {children ?? <Text style={[styles.percent, { color }]}>{Math.round(percent)}%</Text>}
    </View>
  </View>
);

const styles = StyleSheet.create({
  ring: {
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: {
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  percent: {
    fontSize: 18,
    fontWeight: '700',
  },
});
