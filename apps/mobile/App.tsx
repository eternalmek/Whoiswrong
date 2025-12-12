import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BrandButton, BrandCard, BrandInput, BrandScreen, Heading, Label, Paragraph, Subheading, theme } from '@whoiswrong/ui';
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
        if (first) setSelectedJudgeId(first.id || first.slug);
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
    <BrandScreen
      title="WhoIsWrong.io"
      subtitle="Let AI settle your debates with the same judges and vibe as the website."
    >
      <BrandCard>
        <Subheading>Choose a Judge</Subheading>
        <Paragraph>
          Pick from the same viral judges that power the web experience. Free judges are highlighted first.
        </Paragraph>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.judgeRow}>
          {loadingJudges ? (
            <Paragraph>Loading judges...</Paragraph>
          ) : (
            judges.map((judge) => {
              const id = judge.id || judge.slug || judge.name;
              const isSelected = selectedJudgeId === id;
              return (
                <View key={id} style={[styles.judgeCard, isSelected && styles.judgeCardSelected]}>
                  <Text style={styles.judgeName}>{judge.name}</Text>
                  {judge.category ? <Text style={styles.judgeCategory}>{judge.category}</Text> : null}
                  {judge.description ? <Paragraph style={styles.judgeDescription}>{judge.description}</Paragraph> : null}
                  <BrandButton
                    label={isSelected ? 'Selected' : 'Select'}
                    onPress={() => setSelectedJudgeId(id)}
                    style={styles.judgeButton}
                  />
                </View>
              );
            })
          )}
          {!loadingJudges && !judges.length ? (
            <Paragraph style={styles.helper}>No judges available right now.</Paragraph>
          ) : null}
        </ScrollView>
      </BrandCard>

      <BrandCard>
        <Subheading>Describe the debate</Subheading>
        <Paragraph style={styles.helper}>Give quick context, then add both sides.</Paragraph>
        <Label>Context (optional)</Label>
        <BrandInput
          value={context}
          onChangeText={setContext}
          placeholder="Add any background details..."
          multiline
          numberOfLines={3}
        />
        <View style={styles.row}>
          <View style={styles.flexItem}>
            <Label>Side A</Label>
            <BrandInput value={optionA} onChangeText={setOptionA} placeholder="Describe side A" />
          </View>
          <View style={styles.gap} />
          <View style={styles.flexItem}>
            <Label>Side B</Label>
            <BrandInput value={optionB} onChangeText={setOptionB} placeholder="Describe side B" />
          </View>
        </View>
        <BrandButton label="Judge now" onPress={handleSubmit} loading={submitting} />
      </BrandCard>

      {verdict ? (
        <BrandCard style={styles.resultCard}>
          <Heading>Verdict</Heading>
          <Paragraph>Winner: {verdict.winner}</Paragraph>
          <Paragraph>Loser: {verdict.loser}</Paragraph>
          <Subheading>Reasoning</Subheading>
          <Paragraph>{verdict.reasoning || 'No details provided.'}</Paragraph>
        </BrandCard>
      ) : null}

      <Paragraph style={styles.footer}>
        The app talks to the same production API as whoiswrong.io. Keep using the website normally — this mobile build
        just mirrors the experience.
      </Paragraph>
    </BrandScreen>
  );
}

const styles = StyleSheet.create({
  judgeRow: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
  },
  judgeCard: {
    width: 220,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  judgeCardSelected: {
    borderColor: theme.colors.accent,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 8,
  },
  judgeName: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 16,
  },
  judgeCategory: {
    color: theme.colors.accentSecondary,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  judgeDescription: {
    marginBottom: theme.spacing.sm,
  },
  helper: {
    color: theme.colors.muted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginVertical: theme.spacing.sm,
  },
  flexItem: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  gap: {
    width: theme.spacing.sm,
  },
  judgeButton: {
    marginTop: 'auto',
  },
  resultCard: {
    marginTop: theme.spacing.md,
  },
  footer: {
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
});
