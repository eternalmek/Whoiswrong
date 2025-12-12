import React from 'react';
import { TextInput, StyleSheet, TextInputProps } from 'react-native';
import { theme } from '../theme';

export function BrandInput(props: TextInputProps) {
  return <TextInput placeholderTextColor={theme.colors.muted} style={styles.input} {...props} />;
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    color: theme.colors.text,
    minHeight: 52,
  },
});
