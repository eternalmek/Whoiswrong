import React from 'react';
import { Pressable, StyleSheet, Text, PressableProps, ActivityIndicator } from 'react-native';
import { theme } from '../theme';

interface BrandButtonProps extends PressableProps {
  label: string;
  loading?: boolean;
}

export function BrandButton({ label, loading, style, ...rest }: BrandButtonProps) {
  return (
    <Pressable style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, style]} {...rest}>
      {loading ? <ActivityIndicator color={theme.colors.text} /> : <Text style={styles.label}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.accent,
    borderRadius: 999,
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 8,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ translateY: 1 }],
  },
  label: {
    color: theme.colors.text,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontSize: 16,
  },
});
