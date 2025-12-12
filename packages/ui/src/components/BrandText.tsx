import React from 'react';
import { Text, StyleSheet, TextProps } from 'react-native';
import { theme } from '../theme';

export function Heading({ children, style, ...rest }: TextProps) {
  return (
    <Text style={[styles.heading, style]} {...rest}>
      {children}
    </Text>
  );
}

export function Subheading({ children, style, ...rest }: TextProps) {
  return (
    <Text style={[styles.subheading, style]} {...rest}>
      {children}
    </Text>
  );
}

export function Paragraph({ children, style, ...rest }: TextProps) {
  return (
    <Text style={[styles.paragraph, style]} {...rest}>
      {children}
    </Text>
  );
}

export function Label({ children, style, ...rest }: TextProps) {
  return (
    <Text style={[styles.label, style]} {...rest}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: theme.spacing.sm,
  },
  subheading: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  paragraph: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    color: theme.colors.muted,
    fontSize: 13,
    marginBottom: theme.spacing.xs,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
