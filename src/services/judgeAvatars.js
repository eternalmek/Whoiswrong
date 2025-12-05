const axios = require('axios');
const { supabaseServiceRole } = require('../supabaseClient');

const IMAGE_PROVIDER = (process.env.IMAGE_GENERATION_PROVIDER || 'OPENAI').toUpperCase();
const IMAGE_API_KEY = process.env.IMAGE_GENERATION_API_KEY;
const BUCKET = 'judge-photos';
const avatarPromptTemplate = (name, category) =>
  `Create a stylized digital portrait avatar of a person who looks like ${name}.
Style: Semi-realistic digital art with soft painterly brushwork, slightly stylized features.
The portrait should capture the recognizable essence and distinctive features of ${name} including their typical expression, hairstyle, and facial structure.
Centered head and shoulders portrait, professional studio lighting, gradient background.
High quality, artistic interpretation, no text, no watermark, no logos.
Category context: ${category || 'Celebrity'}.
The image should be instantly recognizable as resembling ${name} while being an original artistic creation.`;

let generating = null;

async function generateImage(prompt) {
  if (!IMAGE_API_KEY) {
    throw new Error('IMAGE_GENERATION_API_KEY not configured');
  }

  if (IMAGE_PROVIDER === 'OPENAI') {
    const resp = await axios.post(
      'https://api.openai.com/v1/images/generations',
      {
        model: process.env.OPENAI_IMAGE_MODEL || 'dall-e-3',
        prompt,
        size: '1024x1024',
        response_format: 'b64_json',
        n: 1,
      },
      {
        headers: {
          Authorization: `Bearer ${IMAGE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const b64 = resp.data?.data?.[0]?.b64_json;
    if (!b64) throw new Error('No image returned from OpenAI');
    return Buffer.from(b64, 'base64');
  }

  if (IMAGE_PROVIDER === 'STABILITY') {
    const resp = await axios.post(
      'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
      {
        text_prompts: [{ text: prompt }],
        cfg_scale: 7,
        clip_guidance_preset: 'FAST_BLUE',
        height: 1024,
        width: 1024,
        steps: 30,
      },
      {
        headers: {
          Authorization: `Bearer ${IMAGE_API_KEY}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 30000,
      }
    );

    const base64 = resp.data?.artifacts?.[0]?.base64;
    if (!base64) throw new Error('No image returned from Stability');
    return Buffer.from(base64, 'base64');
  }

  throw new Error(`Unsupported IMAGE_GENERATION_PROVIDER: ${IMAGE_PROVIDER}`);
}

async function uploadAvatar(slug, buffer) {
  const filename = `${slug}.png`;
  const { error } = await supabaseServiceRole.storage
    .from(BUCKET)
    .upload(filename, buffer, { contentType: 'image/png', upsert: true });
  if (error) throw error;
  const { data } = supabaseServiceRole.storage.from(BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

async function ensureJudgeAvatars() {
  if (!supabaseServiceRole || generating) return generating || null;
  generating = doEnsure()
    .catch((err) => {
      console.warn('Failed generating judge avatars', err.message || err);
    })
    .finally(() => {
      generating = null;
    });
  return generating;
}

async function doEnsure() {
  if (!IMAGE_API_KEY) return;

  const { data: missing, error } = await supabaseServiceRole
    .from('judges')
    .select('id, slug, name, category, photo_url')
    .is('photo_url', null)
    .eq('is_active', true);

  if (error) {
    console.warn('Unable to check judges needing avatars', error);
    return;
  }

  for (const judge of missing || []) {
    try {
      const prompt = avatarPromptTemplate(judge.name, judge.category);
      const imageBuffer = await generateImage(prompt);
      const url = await uploadAvatar(judge.slug, imageBuffer);
      await supabaseServiceRole
        .from('judges')
        .update({ photo_url: url })
        .eq('id', judge.id);
    } catch (err) {
      console.warn(`Failed avatar for ${judge.name}`, err.message || err);
    }
  }
}

module.exports = { ensureJudgeAvatars };
