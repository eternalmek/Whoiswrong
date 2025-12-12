import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { fetchDebates } from '../api/debates';
import type { Debate } from '../types';

export default function FeedScreen() {
  const [debates, setDebates] = useState<Debate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDebates();
  }, []);

  const loadDebates = async () => {
    try {
      const data = await fetchDebates(20, 0);
      setDebates(data);
    } catch (error) {
      console.error('Error loading debates:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDebates();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0f172a" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Community Feed</Text>
        <Text style={styles.subtitle}>See what others are debating</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {debates.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🤔</Text>
            <Text style={styles.emptyTitle}>No debates yet</Text>
            <Text style={styles.emptyText}>
              Be the first to create a public debate!
            </Text>
          </View>
        ) : (
          debates.map((debate) => (
            <View key={debate.id} style={styles.debateCard}>
              <View style={styles.debateHeader}>
                {debate.judge_name && (
                  <Text style={styles.judgeName}>
                    Judge: {debate.judge_name}
                  </Text>
                )}
                <Text style={styles.timestamp}>
                  {new Date(debate.created_at).toLocaleDateString()}
                </Text>
              </View>

              {debate.context && (
                <Text style={styles.context}>{debate.context}</Text>
              )}

              <View style={styles.options}>
                <View style={styles.optionBox}>
                  <Text style={styles.optionLabel}>Side A</Text>
                  <Text style={styles.optionText}>{debate.option_a}</Text>
                </View>
                <View style={styles.optionBox}>
                  <Text style={styles.optionLabel}>Side B</Text>
                  <Text style={styles.optionText}>{debate.option_b}</Text>
                </View>
              </View>

              <View style={styles.verdict}>
                <View style={styles.verdictRow}>
                  <Text style={styles.verdictLabel}>Winner:</Text>
                  <Text style={styles.verdictWinner}>{debate.right_side}</Text>
                </View>
                <View style={styles.verdictRow}>
                  <Text style={styles.verdictLabel}>Loser:</Text>
                  <Text style={styles.verdictLoser}>{debate.wrong_side}</Text>
                </View>
                {debate.verdict_text && (
                  <Text style={styles.verdictText} numberOfLines={3}>
                    {debate.verdict_text}
                  </Text>
                )}
              </View>

              <View style={styles.stats}>
                <Text style={styles.statText}>❤️ {debate.like_count || 0}</Text>
                <Text style={styles.statText}>💬 {debate.comment_count || 0}</Text>
              </View>
            </View>
          ))
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  content: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  debateCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  debateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  judgeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  timestamp: {
    fontSize: 12,
    color: '#94a3b8',
  },
  context: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  options: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  optionBox: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 12,
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  optionText: {
    fontSize: 14,
    color: '#0f172a',
  },
  verdict: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  verdictRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  verdictLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78350f',
    marginRight: 8,
  },
  verdictWinner: {
    fontSize: 14,
    color: '#166534',
    fontWeight: '600',
  },
  verdictLoser: {
    fontSize: 14,
    color: '#991b1b',
  },
  verdictText: {
    fontSize: 13,
    color: '#78350f',
    marginTop: 8,
    lineHeight: 18,
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
  },
  statText: {
    fontSize: 14,
    color: '#64748b',
  },
});
