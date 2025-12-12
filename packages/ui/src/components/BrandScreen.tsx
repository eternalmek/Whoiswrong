import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ScrollView, StyleSheet, Text, ViewProps } from 'react-native';
import { theme } from '../theme';

interface BrandScreenProps extends ViewProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function BrandScreen({ title, subtitle, style, children }: BrandScreenProps) {
  return (
    <View style={[styles.root, style]}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  title: {
    color: theme.colors.text,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 14,
    marginTop: 4,
    marginBottom: theme.spacing.sm,
    lineHeight: 20,
  },
});
