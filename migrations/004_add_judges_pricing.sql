-- Add pricing fields to judges table as specified
-- Fields: image_url, personality_prompt, price, is_free

-- Add price column (default 0.99 for paid judges)
ALTER TABLE public.judges ADD COLUMN IF NOT EXISTS price numeric(10,2) DEFAULT 0.99;

-- Add is_free column (replaces is_default_free for clarity)
ALTER TABLE public.judges ADD COLUMN IF NOT EXISTS is_free boolean DEFAULT false;

-- Add personality_prompt column (canonical field for judge prompts)
-- Note: system_prompt is the legacy field, personality_prompt is the new standard
ALTER TABLE public.judges ADD COLUMN IF NOT EXISTS personality_prompt text;

-- Add image_url column (canonical field for judge images)
-- Note: photo_url and avatar_url are legacy fields, image_url is the new standard
ALTER TABLE public.judges ADD COLUMN IF NOT EXISTS image_url text;

-- Update existing records: sync is_free from is_default_free
UPDATE public.judges SET is_free = is_default_free WHERE is_free IS NULL OR is_free != is_default_free;

-- Update existing records: sync personality_prompt from system_prompt if not set
UPDATE public.judges SET personality_prompt = system_prompt WHERE personality_prompt IS NULL AND system_prompt IS NOT NULL;

-- Update existing records: sync image_url from photo_url or avatar_url if not set  
UPDATE public.judges SET image_url = COALESCE(photo_url, avatar_url) WHERE image_url IS NULL AND (photo_url IS NOT NULL OR avatar_url IS NOT NULL);

-- Set price to 0 for free judges
UPDATE public.judges SET price = 0 WHERE is_free = true;

-- Set price to 0.99 for non-free judges
UPDATE public.judges SET price = 0.99 WHERE is_free = false OR is_free IS NULL;

-- Create index on is_free for efficient filtering
CREATE INDEX IF NOT EXISTS idx_judges_is_free ON public.judges (is_free);
