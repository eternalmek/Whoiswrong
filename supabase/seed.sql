-- Seed data for Who Is Wrong? development
-- This file is run after migrations during `supabase db reset`

-- Insert some sample judgements for testing
INSERT INTO public.judgements (context, option_a, option_b, wrong, right, reason, roast)
VALUES
  (
    'Pizza debate',
    'Pineapple Pizza',
    'Regular Pizza',
    'Pineapple Pizza',
    'Regular Pizza',
    'Fruit on pizza is a crime against Italy.',
    'You have the palate of a toddler.'
  ),
  (
    'Movie night decision',
    'Watching the same movie again',
    'Trying something new',
    'Watching the same movie again',
    'Trying something new',
    'Life is too short to rewatch things.',
    'Are you 5? Even toddlers get bored of reruns.'
  ),
  (
    'Morning routine',
    'Coffee',
    'Tea',
    'Tea',
    'Coffee',
    'Coffee is the nectar of productivity.',
    'Tea drinkers just want to nap all day.'
  )
ON CONFLICT DO NOTHING;
