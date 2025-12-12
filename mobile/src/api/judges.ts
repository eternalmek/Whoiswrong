import { supabase } from '../lib/supabase';
import type { Judge } from '../types';

const API_BASE_URL = 'https://www.whoiswrong.io';

/**
 * Fetch all active judges from the API
 */
export async function fetchJudges(): Promise<Judge[]> {
  try {
    // First try to fetch from the API endpoint
    const response = await fetch(`${API_BASE_URL}/api/judges`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Normalize the judges data
    return (data.judges || data || []).map((judge: any) => ({
      id: judge.id || judge.slug,
      name: judge.name,
      slug: judge.slug,
      description: judge.description || judge.bio,
      category: judge.category,
      personality_prompt: judge.personality_prompt || judge.system_prompt,
      photo_url: judge.photo_url || judge.avatar_url || judge.image_url,
      avatar_url: judge.avatar_url || judge.photo_url || judge.image_url,
      image_url: judge.image_url || judge.photo_url || judge.avatar_url,
      is_free: judge.is_free ?? judge.is_default_free ?? false,
      price: judge.price ?? (judge.is_free ? 0 : 0.99),
      is_active: judge.is_active ?? true,
      emoji: judge.emoji || '⭐',
    }));
  } catch (error) {
    console.error('Error fetching judges from API:', error);
    
    // Fallback to direct Supabase query
    try {
      const { data, error: supabaseError } = await supabase
        .from('judges')
        .select('*')
        .eq('is_active', true)
        .order('is_free', { ascending: false })
        .order('name');
      
      if (supabaseError) throw supabaseError;
      
      return (data || []).map((judge: any) => ({
        id: judge.id || judge.slug,
        name: judge.name,
        slug: judge.slug,
        description: judge.description,
        category: judge.category,
        personality_prompt: judge.personality_prompt,
        photo_url: judge.photo_url || judge.avatar_url || judge.image_url,
        avatar_url: judge.avatar_url || judge.photo_url || judge.image_url,
        image_url: judge.image_url || judge.photo_url || judge.avatar_url,
        is_free: judge.is_free ?? judge.is_default_free ?? false,
        price: judge.price ?? 0.99,
        is_active: judge.is_active ?? true,
        emoji: '⭐',
      }));
    } catch (dbError) {
      console.error('Error fetching judges from Supabase:', dbError);
      throw new Error('Failed to load judges. Please try again later.');
    }
  }
}

/**
 * Get a specific judge by ID or slug
 */
export async function getJudgeById(id: string): Promise<Judge | null> {
  const judges = await fetchJudges();
  return judges.find(j => j.id === id || j.slug === id) || judges[0] || null;
}
