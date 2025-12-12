import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { fetchJudges } from '../api/judges';
import { submitVerdict } from '../api/verdict';
import type { Judge, VerdictResult } from '../types';

export default function HomeScreen() {
  const [judges, setJudges] = useState<Judge[]>([]);
  const [selectedJudge, setSelectedJudge] = useState<Judge | null>(null);
  const [context, setContext] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verdict, setVerdict] = useState<VerdictResult | null>(null);

  useEffect(() => {
    loadJudges();
  }, []);

  const loadJudges = async () => {
    setLoading(true);
    try {
      const data = await fetchJudges();
      setJudges(data);
      if (data.length > 0) {
        setSelectedJudge(data[0]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load judges');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!optionA.trim() || !optionB.trim()) {
      Alert.alert('Missing Information', 'Please enter both sides of the debate');
      return;
    }

    setSubmitting(true);
    setVerdict(null);

    try {
      const result = await submitVerdict({
        context,
        optionA: optionA.trim(),
        optionB: optionB.trim(),
        judgeId: selectedJudge?.id || selectedJudge?.slug,
      });
      setVerdict(result);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to get verdict');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setContext('');
    setOptionA('');
    setOptionB('');
    setVerdict(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>⚖️ WhoisWrong</Text>
          <Text style={styles.subtitle}>Get instant AI-powered verdicts</Text>
        </View>

        {/* Judge Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose a Judge</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#0f172a" />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.judgeScroll}
            >
              {judges.map((judge) => (
                <TouchableOpacity
                  key={judge.id}
                  style={[
                    styles.judgeCard,
                    selectedJudge?.id === judge.id && styles.judgeCardSelected,
                  ]}
                  onPress={() => setSelectedJudge(judge)}
                >
                  {judge.photo_url || judge.avatar_url ? (
                    <Image
                      source={{ uri: judge.photo_url || judge.avatar_url }}
                      style={styles.judgeImage}
                    />
                  ) : (
                    <View style={styles.judgePlaceholder}>
                      <Text style={styles.judgeEmoji}>{judge.emoji || '⭐'}</Text>
                    </View>
                  )}
                  <Text style={styles.judgeName}>{judge.name}</Text>
                  {judge.category && (
                    <Text style={styles.judgeCategory}>{judge.category}</Text>
                  )}
                  {judge.is_free && (
                    <View style={styles.freeBadge}>
                      <Text style={styles.freeBadgeText}>FREE</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Context Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Context (optional)</Text>
          <TextInput
            style={styles.textArea}
            value={context}
            onChangeText={setContext}
            placeholder="Add any background details..."
            multiline
            numberOfLines={3}
            placeholderTextColor="#94a3b8"
          />
        </View>

        {/* Options Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Side A</Text>
          <TextInput
            style={styles.input}
            value={optionA}
            onChangeText={setOptionA}
            placeholder="Describe the first side"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Side B</Text>
          <TextInput
            style={styles.input}
            value={optionB}
            onChangeText={setOptionB}
            placeholder="Describe the second side"
            placeholderTextColor="#94a3b8"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>Get Verdict</Text>
          )}
        </TouchableOpacity>

        {/* Verdict Result */}
        {verdict && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Verdict</Text>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Winner:</Text>
              <Text style={styles.resultValue}>{verdict.winner}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Loser:</Text>
              <Text style={styles.resultValue}>{verdict.loser}</Text>
            </View>
            <View style={styles.resultReasoning}>
              <Text style={styles.resultLabel}>Reasoning:</Text>
              <Text style={styles.resultText}>{verdict.reasoning}</Text>
            </View>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>New Debate</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  judgeScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  judgeCard: {
    width: 140,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  judgeCardSelected: {
    borderColor: '#0f172a',
    backgroundColor: '#f1f5f9',
  },
  judgeImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
  },
  judgePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  judgeEmoji: {
    fontSize: 40,
  },
  judgeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 4,
  },
  judgeCategory: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },
  freeBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  freeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 16,
    fontSize: 16,
    color: '#0f172a',
  },
  textArea: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 16,
    fontSize: 16,
    color: '#0f172a',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  resultRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  resultLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginRight: 8,
  },
  resultValue: {
    fontSize: 16,
    color: '#0f172a',
    flex: 1,
  },
  resultReasoning: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  resultText: {
    fontSize: 15,
    color: '#0f172a',
    lineHeight: 22,
    marginTop: 8,
  },
  resetButton: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  resetButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
});
