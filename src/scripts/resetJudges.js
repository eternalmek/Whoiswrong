#!/usr/bin/env node
/**
 * Reset Judges Script
 * Deletes all existing judges and repopulates with the new celebrity list
 * Run with: node src/scripts/resetJudges.js
 */

require('dotenv').config();
const { supabaseServiceRole } = require('../supabaseClient');
const { newCelebrityJudges } = require('../data/newJudges');
const crypto = require('crypto');

// Generate deterministic UUID v5 from slug
function slugToUuid(slug) {
  if (!slug) return crypto.randomUUID();
  
  const namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const namespaceBytes = Buffer.from(namespace.replace(/-/g, ''), 'hex');
  const nameBytes = Buffer.from('whoiswrong-judge-' + slug, 'utf8');
  
  const hash = crypto.createHash('sha1')
    .update(namespaceBytes)
    .update(nameBytes)
    .digest('hex');
  
  const uuid = [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '5' + hash.slice(13, 16),
    ((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + hash.slice(18, 20),
    hash.slice(20, 32)
  ].join('-');
  
  return uuid;
}

async function resetJudges() {
  if (!supabaseServiceRole) {
    console.error('❌ Supabase service role not configured. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
    process.exit(1);
  }

  console.log('🔄 Starting judge reset process...\n');

  // Step 1: Delete all existing judges
  console.log('🗑️  Deleting all existing judges...');
  const { error: deleteError } = await supabaseServiceRole
    .from('judges')
    .delete()
    .gte('created_at', '1970-01-01T00:00:00Z'); // Explicit condition: delete all records since epoch

  if (deleteError) {
    console.error('❌ Error deleting judges:', deleteError);
    process.exit(1);
  }
  console.log('✅ All existing judges deleted.\n');

  // Step 2: Insert new judges
  console.log('📝 Inserting new celebrity judges...');
  
  const judgeRows = newCelebrityJudges.map((judge) => ({
    id: slugToUuid(judge.slug),
    name: judge.name,
    slug: judge.slug,
    description: judge.description,
    category: judge.category,
    personality_prompt: judge.personality_prompt,
    is_celebrity: judge.is_celebrity,
    is_ai_default: judge.is_ai_default || false,
    is_free: judge.is_free,
    is_default_free: judge.is_free, // backward compatibility
    is_active: judge.is_active,
    color_theme: judge.color_theme,
    price: judge.price,
    price_id: judge.price_id,
    avatar_url: judge.avatar_url,
    photo_url: judge.avatar_placeholder || judge.avatar_url,
    image_url: judge.avatar_url || judge.avatar_placeholder,
  }));

  const { data: insertedJudges, error: insertError } = await supabaseServiceRole
    .from('judges')
    .insert(judgeRows)
    .select();

  if (insertError) {
    console.error('❌ Error inserting judges:', insertError);
    process.exit(1);
  }

  console.log(`✅ Successfully inserted ${insertedJudges.length} judges.\n`);

  // Step 3: Display summary
  console.log('📊 Judge Summary:');
  console.log('━'.repeat(60));
  
  const freeJudges = insertedJudges.filter(j => j.is_free);
  const paidJudges = insertedJudges.filter(j => !j.is_free);
  
  console.log(`\n🆓 FREE JUDGES (${freeJudges.length}):`);
  freeJudges.forEach((judge, i) => {
    console.log(`   ${i + 1}. ${judge.name} (${judge.slug})`);
  });
  
  console.log(`\n💰 PAID JUDGES (${paidJudges.length}):`);
  paidJudges.forEach((judge, i) => {
    console.log(`   ${i + 1}. ${judge.name} (${judge.slug}) - $${judge.price}`);
  });
  
  console.log('\n━'.repeat(60));
  console.log('✨ Judge reset complete!\n');
}

// Run the script
resetJudges().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
