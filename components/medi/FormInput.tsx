import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/colors';

interface FormInputProps extends TextInputProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  required?: boolean;
  rightElement?: React.ReactNode;
}

export const FormInput = ({ label, icon, required, rightElement, ...props }: FormInputProps) => (
  <View style={styles.container}>
    <Text style={styles.label}>
      {label}
      {required && <Text style={styles.required}> *</Text>}
    </Text>
    <View style={styles.inputRow}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
      </View>
      <TextInput
        style={styles.input}
        placeholderTextColor={Colors.textMuted}
        {...props}
      />
      {rightElement}
    </View>
  </View>
);

interface PrimaryButtonProps {
  title: string;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'outline' | 'danger';
}

export const PrimaryButton = ({ title, onPress, icon, variant = 'primary' }: PrimaryButtonProps) => (
  <Pressable
    onPress={onPress}
    style={[
      styles.button,
      variant === 'primary' && styles.buttonPrimary,
      variant === 'outline' && styles.buttonOutline,
      variant === 'danger' && styles.buttonDanger,
    ]}
    accessibilityRole="button">
    {icon && (
      <Ionicons
        name={icon}
        size={20}
        color={variant === 'primary' ? Colors.white : variant === 'danger' ? Colors.error : Colors.primary}
      />
    )}
    <Text
      style={[
        styles.buttonText,
        variant === 'primary' && styles.buttonTextPrimary,
        variant === 'outline' && styles.buttonTextOutline,
        variant === 'danger' && styles.buttonTextDanger,
      ]}>
      {title}
    </Text>
    <Ionicons
      name="chevron-forward"
      size={18}
      color={variant === 'primary' ? Colors.white : variant === 'danger' ? Colors.error : Colors.primary}
    />
  </Pressable>
);

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.navy,
    marginBottom: Spacing.sm,
  },
  required: {
    color: Colors.primary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    minHeight: 52,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: Spacing.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  buttonPrimary: {
    backgroundColor: Colors.primary,
  },
  buttonOutline: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  buttonDanger: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  buttonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  buttonTextPrimary: {
    color: Colors.white,
  },
  buttonTextOutline: {
    color: Colors.primary,
  },
  buttonTextDanger: {
    color: Colors.error,
  },
});
