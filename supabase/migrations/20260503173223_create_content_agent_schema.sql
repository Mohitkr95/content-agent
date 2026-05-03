/*
  # Content Agent SaaS Schema

  1. New Tables
    - `profiles` - User profiles with plan tier and optional MiniMax API key
      - `id` (uuid, pk, references auth.users)
      - `email` (text)
      - `plan` (text, default 'free')
      - `created_at` (timestamptz)
    - `topic_sets` - Batches of 10 generated topics
      - `id` (uuid, pk)
      - `user_id` (uuid, references auth.users)
      - `topics` (jsonb) - array of topic strings
      - `prompt_hint` (text) - optional focus area
      - `created_at` (timestamptz)
    - `posts` - Generated technical posts
      - `id` (uuid, pk)
      - `user_id` (uuid, references auth.users)
      - `topic_set_id` (uuid, nullable, references topic_sets)
      - `topic` (text)
      - `content` (text) - the generated post body
      - `word_count` (int, default 0)
      - `is_favorite` (boolean, default false)
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled on all three tables
    - Policies scope every row to auth.uid() ownership
    - Separate select/insert/update/delete policies per table
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  plan text NOT NULL DEFAULT 'free',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE TABLE IF NOT EXISTS topic_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  prompt_hint text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE topic_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own topic sets"
  ON topic_sets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own topic sets"
  ON topic_sets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own topic sets"
  ON topic_sets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_set_id uuid REFERENCES topic_sets(id) ON DELETE SET NULL,
  topic text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  word_count int NOT NULL DEFAULT 0,
  is_favorite boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS posts_user_created_idx ON posts(user_id, created_at DESC);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own posts"
  ON posts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own posts"
  ON posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own posts"
  ON posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
