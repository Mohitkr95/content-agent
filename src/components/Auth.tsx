import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function Auth() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden md:flex flex-col justify-between w-1/2 bg-neutral-950 text-neutral-100 p-12">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-neutral-950" />
          </div>
          <span className="font-semibold tracking-tight">Lumen</span>
        </div>
        <div className="space-y-6 max-w-md">
          <h1 className="font-display text-5xl leading-tight">
            A studio for deeply technical content.
          </h1>
          <p className="text-neutral-400 text-lg leading-relaxed">
            Generate research-grade posts on ML, AI, and mathematics.
            Ideation, drafting, and publishing - in one place.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-neutral-800">
            <Stat label="Topics / run" value="10" />
            <Stat label="Post length" value="250w" />
            <Stat label="Models" value="MiniMax" />
          </div>
        </div>
        <p className="text-xs text-neutral-500">
          © {new Date().getFullYear()} Lumen Studio
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="md:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold tracking-tight">Lumen</span>
          </div>
          <h2 className="font-display text-3xl mb-1">
            {mode === 'signin' ? 'Welcome back' : 'Create your studio'}
          </h2>
          <p className="text-neutral-500 text-sm mb-8">
            {mode === 'signin'
              ? 'Sign in to access your drafts.'
              : 'Start generating in under a minute.'}
          </p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition"
                placeholder="you@domain.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition"
                placeholder="At least 6 characters"
              />
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-neutral-950 hover:bg-neutral-800 text-white rounded-lg px-4 py-2.5 font-medium text-sm flex items-center justify-center gap-2 transition disabled:opacity-60"
            >
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
          <div className="mt-6 text-sm text-neutral-500 text-center">
            {mode === 'signin' ? (
              <>
                No account?{' '}
                <button
                  onClick={() => setMode('signup')}
                  className="text-neutral-950 font-medium hover:underline"
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have one?{' '}
                <button
                  onClick={() => setMode('signin')}
                  className="text-neutral-950 font-medium hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-2xl font-display">{value}</div>
      <div className="text-xs text-neutral-500 mt-0.5">{label}</div>
    </div>
  );
}
