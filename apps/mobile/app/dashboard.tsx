import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { supabase } from '../lib/supabase';
import { useSession } from './_layout';

export default function Dashboard() {
  const router = useRouter();
  const { session } = useSession();
  const email = session?.user?.email ?? 'Unknown user';

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Logout failed', error.message);
      return;
    }
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>You are signed in as</Text>
        <Text style={styles.email}>{email}</Text>
        <TouchableOpacity style={styles.button} onPress={handleLogout}>
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    color: '#e2e8f0',
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    color: '#cbd5e1',
  },
  email: {
    fontSize: 18,
    color: '#38bdf8',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 12,
  },
  buttonText: {
    color: '#0b1224',
    fontWeight: '700',
    fontSize: 16,
  },
});
