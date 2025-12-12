import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { supabase } from '../lib/supabase';

export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      Alert.alert('Sign up failed', error.message);
      return;
    }

    Alert.alert('Check your email', 'Please confirm your email address to finish signing up.');
    router.replace('/dashboard');
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.card}>
        <Text style={styles.title}>Create an account</Text>
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          textContentType="emailAddress"
        />
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          textContentType="newPassword"
        />
        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSignup} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Creating account...' : 'Sign Up'}</Text>
        </TouchableOpacity>
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Link href="/login" style={styles.link}>
            Log in
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#1e293b',
    padding: 24,
    borderRadius: 12,
    gap: 12,
  },
  title: {
    fontSize: 24,
    color: '#e2e8f0',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#0b1224',
    color: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  button: {
    backgroundColor: '#06b6d4',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#0b1224',
    fontWeight: '700',
    fontSize: 16,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  footerText: {
    color: '#cbd5e1',
  },
  link: {
    color: '#38bdf8',
    fontWeight: '600',
  },
});
