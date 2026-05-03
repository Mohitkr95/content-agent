import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_SUPABASE_ANON_KEY) as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const FUNCTIONS_URL = `${supabaseUrl}/functions/v1`;

export async function callFunction<T>(
  slug: string,
  body: unknown,
  accessToken: string,
): Promise<T> {
  const res = await fetch(`${FUNCTIONS_URL}/${slug}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }
  return data as T;
}
