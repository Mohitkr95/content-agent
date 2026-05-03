import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import Sidebar, { View } from './components/Sidebar';
import Generate from './components/Generate';
import Library from './components/Library';
import type { Post } from './types';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);
  const [view, setView] = useState<View>('generate');
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setBooting(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setPosts([]);
      return;
    }
    (async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .maybeSingle();
      if (!profile) {
        await supabase.from('profiles').insert({
          id: session.user.id,
          email: session.user.email ?? '',
        });
      }
      const { data } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setPosts(data as Post[]);
    })();
  }, [session?.user?.id]);

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return <Auth />;

  return (
    <div className="min-h-screen flex">
      <Sidebar
        view={view}
        onChange={setView}
        email={session.user.email ?? ''}
        postCount={posts.length}
      />
      <main className="flex-1 p-10 overflow-y-auto">
        {view === 'generate' && (
          <Generate
            accessToken={session.access_token}
            userId={session.user.id}
            onPostSaved={(p) => setPosts((prev) => [p, ...prev])}
          />
        )}
        {view === 'library' && <Library posts={posts} onChange={setPosts} />}
      </main>
    </div>
  );
}
