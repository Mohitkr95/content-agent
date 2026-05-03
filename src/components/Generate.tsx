import { useState } from 'react';
import { Wand as Wand2, RefreshCw, Copy, Check, Star, ArrowRight } from 'lucide-react';
import { supabase, callFunction } from '../lib/supabase';
import { renderPost } from '../lib/format';
import type { Post } from '../types';

type Props = {
  accessToken: string;
  userId: string;
  onPostSaved: (post: Post) => void;
};

export default function Generate({ accessToken, userId, onPostSaved }: Props) {
  const [hint, setHint] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [topicSetId, setTopicSetId] = useState<string | null>(null);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [generatingPost, setGeneratingPost] = useState(false);
  const [post, setPost] = useState<Post | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerateTopics() {
    setError(null);
    setLoadingTopics(true);
    setSelectedIdx(null);
    setPost(null);
    try {
      const data = await callFunction<{ topics: string[] }>(
        'generate-topics',
        { hint },
        accessToken,
      );
      setTopics(data.topics);

      const { data: inserted, error: insertError } = await supabase
        .from('topic_sets')
        .insert({ user_id: userId, topics: data.topics, prompt_hint: hint })
        .select()
        .maybeSingle();
      if (insertError) throw insertError;
      setTopicSetId(inserted?.id ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate topics');
    } finally {
      setLoadingTopics(false);
    }
  }

  async function handleGeneratePost(idx: number) {
    const topic = topics[idx];
    if (!topic) return;
    setSelectedIdx(idx);
    setGeneratingPost(true);
    setPost(null);
    setError(null);
    try {
      const data = await callFunction<{ content: string; word_count: number }>(
        'generate-post',
        { topic },
        accessToken,
      );
      const { data: saved, error: insertError } = await supabase
        .from('posts')
        .insert({
          user_id: userId,
          topic_set_id: topicSetId,
          topic,
          content: data.content,
          word_count: data.word_count,
        })
        .select()
        .maybeSingle();
      if (insertError) throw insertError;
      if (saved) {
        setPost(saved as Post);
        onPostSaved(saved as Post);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate post');
    } finally {
      setGeneratingPost(false);
    }
  }

  async function copyPost() {
    if (!post) return;
    await navigator.clipboard.writeText(post.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function toggleFavorite() {
    if (!post) return;
    const next = !post.is_favorite;
    setPost({ ...post, is_favorite: next });
    await supabase.from('posts').update({ is_favorite: next }).eq('id', post.id);
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-4xl mb-2">Compose a post.</h1>
        <p className="text-neutral-500">
          Start with ten sharp ideas, then expand the one you like.
        </p>
      </div>

      <section className="bg-white border border-neutral-200 rounded-xl p-5 mb-6">
        <label className="block text-xs font-medium text-neutral-600 mb-2">
          Optional focus (leave blank for open-ended)
        </label>
        <div className="flex gap-2">
          <input
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="e.g. diffusion models, information theory, Bayesian inference"
            className="flex-1 px-3.5 py-2.5 rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition text-sm"
          />
          <button
            onClick={handleGenerateTopics}
            disabled={loadingTopics}
            className="bg-neutral-950 hover:bg-neutral-800 text-white rounded-lg px-4 py-2.5 text-sm font-medium flex items-center gap-2 transition disabled:opacity-60 whitespace-nowrap"
          >
            {loadingTopics ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4" />
            )}
            {topics.length ? 'Regenerate' : 'Generate topics'}
          </button>
        </div>
      </section>

      {error && (
        <div className="mb-6 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {loadingTopics && topics.length === 0 && (
        <div className="grid gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg shimmer" />
          ))}
        </div>
      )}

      {topics.length > 0 && (
        <section className="mb-6 fade-in">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-neutral-700">Topic ideas</h2>
            <span className="text-xs text-neutral-500">
              {topics.length} suggestions - pick one to expand
            </span>
          </div>
          <div className="grid gap-2">
            {topics.map((t, i) => {
              const isSelected = selectedIdx === i;
              return (
                <button
                  key={i}
                  onClick={() => handleGeneratePost(i)}
                  disabled={generatingPost}
                  className={`group text-left bg-white border rounded-lg px-4 py-3.5 transition flex items-center gap-4 ${
                    isSelected
                      ? 'border-neutral-950 ring-1 ring-neutral-950'
                      : 'border-neutral-200 hover:border-neutral-400'
                  } disabled:opacity-60`}
                >
                  <span className="font-mono text-xs text-neutral-400 w-5">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="flex-1 text-sm text-neutral-800">{t}</span>
                  {isSelected && generatingPost ? (
                    <RefreshCw className="w-4 h-4 text-neutral-500 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-700 transition" />
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {generatingPost && !post && (
        <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-3">
          <div className="h-4 w-2/3 shimmer rounded" />
          <div className="h-3 shimmer rounded" />
          <div className="h-3 shimmer rounded" />
          <div className="h-3 w-4/5 shimmer rounded" />
          <div className="h-3 shimmer rounded" />
          <div className="h-3 w-3/4 shimmer rounded" />
        </div>
      )}

      {post && (
        <section className="bg-white border border-neutral-200 rounded-xl overflow-hidden fade-in">
          <header className="px-6 py-4 border-b border-neutral-100 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wider text-neutral-500 mb-0.5">
                Draft
              </div>
              <div className="text-sm font-medium truncate">{post.topic}</div>
            </div>
            <div className="text-xs text-neutral-500 font-mono">
              {post.word_count}w
            </div>
            <button
              onClick={toggleFavorite}
              className="p-2 rounded-md hover:bg-neutral-100 transition"
              title={post.is_favorite ? 'Unstar' : 'Star'}
            >
              <Star
                className={`w-4 h-4 ${
                  post.is_favorite
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-neutral-400'
                }`}
              />
            </button>
            <button
              onClick={copyPost}
              className="bg-neutral-950 hover:bg-neutral-800 text-white rounded-md px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copy
                </>
              )}
            </button>
          </header>
          <div
            className="post-body px-6 py-5 text-neutral-800"
            dangerouslySetInnerHTML={{ __html: renderPost(post.content) }}
          />
        </section>
      )}
    </div>
  );
}
