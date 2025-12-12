import { supabase } from '../lib/supabase';
import type { Debate } from '../types';

/**
 * Fetch public debates feed
 */
export async function fetchDebates(limit: number = 20, offset: number = 0): Promise<Debate[]> {
  try {
    const { data, error } = await supabase
      .from('debates')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching debates:', error);
    return [];
  }
}

/**
 * Get a specific debate by ID
 */
export async function getDebateById(id: string): Promise<Debate | null> {
  try {
    const { data, error } = await supabase
      .from('debates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error fetching debate:', error);
    return null;
  }
}

/**
 * Vote on a debate
 */
export async function voteOnDebate(debateId: string, voteValue: number, voterFingerprint: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('votes')
      .insert([{
        debate_id: debateId,
        voter_fingerprint: voterFingerprint,
        vote_value: voteValue,
      }]);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error voting on debate:', error);
    return false;
  }
}
