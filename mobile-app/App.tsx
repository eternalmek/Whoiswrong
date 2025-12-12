import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { fetchJudges, Judge } from './src/api/judges';
import { submitVerdict, VerdictResult } from './src/api/verdict';

export default function App() {
  const [judges, setJudges] = useState<Judge[]>([]);
  const [selectedJudgeId, setSelectedJudgeId] = useState<string | undefined>(undefined);
  const [context, setContext] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [loadingJudges, setLoadingJudges] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verdict, setVerdict] = useState<VerdictResult | null>(null);

  useEffect(() => {
    const loadJudges = async () => {
      setLoadingJudges(true);
      try {
        const data = await fetchJudges();
        setJudges(data);
        const first = data[0];
        if (first) {
          setSelectedJudgeId(first.id || first.slug);
        }
      } catch (error: any) {
        Alert.alert('Unable to load judges', error?.message || 'Please try again.');
      } finally {
        setLoadingJudges(false);
      }
    };

    loadJudges();
  }, []);

  const selectedJudge = useMemo(
    () => judges.find((j) => j.id === selectedJudgeId || j.slug === selectedJudgeId),
    [judges, selectedJudgeId]
  );

  const handleSubmit = async () => {
    if (!optionA.trim() || !optionB.trim()) {
      Alert.alert('Missing options', 'Please enter both sides before requesting a verdict.');
      return;
    }

    setSubmitting(true);
    setVerdict(null);

    try {
      const result = await submitVerdict({
        context,
        optionA: optionA.trim(),
        optionB: optionB.trim(),
        judgeId: selectedJudgeId,
      });
      setVerdict(result);
    } catch (error: any) {
      Alert.alert('Unable to judge', error?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.heading}>WhoIsWrong</Text>
        <Text style={styles.subheading}>Get instant AI-powered verdicts using the same judges as whoiswrong.io.</Text>

        <View style={styles.section}>
          <Text style={styles.label}>Choose a judge</Text>
          {loadingJudges ? (
            <ActivityIndicator />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.judgeList}>
              {judges.map((judge) => {
                const isSelected = selectedJudgeId === (judge.id || judge.slug);
                return (
                  <View
                    key={judge.id || judge.slug || judge.name}
                    style={[styles.judgeCard, isSelected && styles.judgeCardSelected]}
                  >
                    <Text style={styles.judgeName}>{judge.name}</Text>
                    {judge.category ? <Text style={styles.judgeCategory}>{judge.category}</Text> : null}
                    <Button title={isSelected ? 'Selected' : 'Select'} onPress={() => setSelectedJudgeId(judge.id || judge.slug)} />
                  </View>
                );
              })}
            </ScrollView>
          )}
          {!loadingJudges && !judges.length ? <Text style={styles.helper}>No judges available right now.</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Context (optional)</Text>
          <TextInput
            value={context}
            onChangeText={setContext}
            style={styles.input}
            placeholder="Add any background details..."
            multiline
          />
        </View>

        <View style={styles.row}>
          <View style={styles.flexItem}>
            <Text style={styles.label}>Side A</Text>
            <TextInput
              value={optionA}
              onChangeText={setOptionA}
              style={styles.input}
              placeholder="Describe side A"
            />
          </View>
          <View style={styles.spacer} />
          <View style={styles.flexItem}>
            <Text style={styles.label}>Side B</Text>
            <TextInput
              value={optionB}
              onChangeText={setOptionB}
              style={styles.input}
              placeholder="Describe side B"
            />
          </View>
        </View>

        <View style={styles.section}>
          {submitting ? (
            <ActivityIndicator />
          ) : (
            <Button title="Judge Now" onPress={handleSubmit} />
          )}
        </View>

        {verdict ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Result</Text>
            <Text style={styles.resultText}>Winner: {verdict.winner}</Text>
            <Text style={styles.resultText}>Loser: {verdict.loser}</Text>
            <Text style={styles.resultReasoningLabel}>Reasoning</Text>
            <Text style={styles.resultReasoning}>{verdict.reasoning || 'No details provided.'}</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.helper}>
            The mobile app reuses the production backend at whoiswrong.io, including the /api/judges and /api/judge endpoints.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
  },
  heading: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 6,
    color: '#0f172a',
  },
  subheading: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 16,
  },
  section: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 8,
    fontWeight: '600',
  },
  judgeList: {
    paddingVertical: 4,
  },
  judgeCard: {
    backgroundColor: '#e2e8f0',
    padding: 12,
    borderRadius: 12,
    marginRight: 12,
    width: 180,
  },
  judgeCardSelected: {
    borderWidth: 2,
    borderColor: '#0f172a',
  },
  judgeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  judgeCategory: {
    fontSize: 12,
    color: '#334155',
    marginBottom: 8,
  },
  helper: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
  },
  flexItem: {
    flex: 1,
  },
  spacer: {
    width: 12,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 12,
    minHeight: 48,
    color: '#0f172a',
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginTop: 6,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 4,
  },
  resultReasoningLabel: {
    fontSize: 12,
    color: '#475569',
    marginTop: 10,
    marginBottom: 4,
    fontWeight: '600',
  },
  resultReasoning: {
    fontSize: 14,
    color: '#0f172a',
    lineHeight: 20,
  },
  footer: {
    marginTop: 12,
    marginBottom: 24,
  },
});
