-- Add pricing fields to judges table as specified
-- Fields: image_url (renamed from avatar_url for consistency), personality_prompt (renamed from system_prompt), price, is_free

-- Add price column (default 0.99 for paid judges)
ALTER TABLE public.judges ADD COLUMN IF NOT EXISTS price numeric(10,2) DEFAULT 0.99;

-- Add is_free column (replaces is_default_free for clarity)
ALTER TABLE public.judges ADD COLUMN IF NOT EXISTS is_free boolean DEFAULT false;

-- Add personality_prompt as alias column (maps to system_prompt for compatibility)
-- We'll use system_prompt as the storage but the API will return personality_prompt
ALTER TABLE public.judges ADD COLUMN IF NOT EXISTS personality_prompt text;

-- Add image_url as alias for avatar_url
ALTER TABLE public.judges ADD COLUMN IF NOT EXISTS image_url text;

-- Update existing records: sync is_free from is_default_free
UPDATE public.judges SET is_free = is_default_free WHERE is_free IS NULL OR is_free != is_default_free;

-- Update existing records: sync personality_prompt from system_prompt if not set
UPDATE public.judges SET personality_prompt = system_prompt WHERE personality_prompt IS NULL AND system_prompt IS NOT NULL;

-- Update existing records: sync image_url from avatar_url if not set  
UPDATE public.judges SET image_url = avatar_url WHERE image_url IS NULL AND avatar_url IS NOT NULL;

-- Set price to 0 for free judges
UPDATE public.judges SET price = 0 WHERE is_free = true;

-- Set price to 0.99 for non-free judges
UPDATE public.judges SET price = 0.99 WHERE is_free = false OR is_free IS NULL;

-- Create index on is_free for efficient filtering
CREATE INDEX IF NOT EXISTS idx_judges_is_free ON public.judges (is_free);
