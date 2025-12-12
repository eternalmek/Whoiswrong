import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#f8fafc', '#e2e8f0', '#cbd5e1']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.emoji}>⚖️</Text>
            <Text style={styles.title}>WhoisWrong</Text>
            <Text style={styles.subtitle}>
              Get instant AI-powered verdicts from celebrity judges
            </Text>
          </View>

          <View style={styles.features}>
            <View style={styles.feature}>
              <Text style={styles.featureEmoji}>🎭</Text>
              <Text style={styles.featureTitle}>Celebrity Judges</Text>
              <Text style={styles.featureText}>
                Choose from AI versions of your favorite celebrities
              </Text>
            </View>

            <View style={styles.feature}>
              <Text style={styles.featureEmoji}>⚡</Text>
              <Text style={styles.featureTitle}>Instant Verdicts</Text>
              <Text style={styles.featureText}>
                Get quick, witty judgments on any debate
              </Text>
            </View>

            <View style={styles.feature}>
              <Text style={styles.featureEmoji}>🌍</Text>
              <Text style={styles.featureTitle}>Global Community</Text>
              <Text style={styles.featureText}>
                Join thousands settling debates worldwide
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Onboarding')}
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: height * 0.1,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  emoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  title: {
    fontSize: 42,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 20,
  },
  features: {
    flex: 1,
    justifyContent: 'center',
  },
  feature: {
    alignItems: 'center',
    marginBottom: 40,
  },
  featureEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#0f172a',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 'auto',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
