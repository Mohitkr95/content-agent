import { useState } from 'react';
import { Copy, Check, Star, Trash2, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { renderPost, formatDate } from '../lib/format';
import type { Post } from '../types';

type Props = {
  posts: Post[];
  onChange: (posts: Post[]) => void;
};

export default function Library({ posts, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(posts[0]?.id ?? null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');

  const visible = posts
    .filter((p) => (filter === 'favorites' ? p.is_favorite : true))
    .filter((p) =>
      query
        ? (p.topic + ' ' + p.content).toLowerCase().includes(query.toLowerCase())
        : true,
    );

  const active = visible.find((p) => p.id === activeId) ?? visible[0] ?? null;

  async function toggleFavorite(id: string) {
    const target = posts.find((p) => p.id === id);
    if (!target) return;
    const next = !target.is_favorite;
    onChange(posts.map((p) => (p.id === id ? { ...p, is_favorite: next } : p)));
    await supabase.from('posts').update({ is_favorite: next }).eq('id', id);
  }

  async function removePost(id: string) {
    onChange(posts.filter((p) => p.id !== id));
    if (activeId === id) setActiveId(null);
    await supabase.from('posts').delete().eq('id', id);
  }

  async function copy(p: Post) {
    await navigator.clipboard.writeText(p.content);
    setCopiedId(p.id);
    setTimeout(() => setCopiedId(null), 1600);
  }

  if (posts.length === 0) {
    return (
      <div className="max-w-5xl mx-auto">
        <h1 className="font-display text-4xl mb-2">Your library.</h1>
        <p className="text-neutral-500 mb-8">
          Drafts you generate show up here.
        </p>
        <div className="bg-white border border-dashed border-neutral-300 rounded-xl p-16 text-center">
          <p className="text-sm text-neutral-500">
            No posts yet. Head to Generate to create your first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-4xl mb-2">Your library.</h1>
        <p className="text-neutral-500">
          {posts.length} {posts.length === 1 ? 'draft' : 'drafts'} saved.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search drafts"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent text-sm"
            />
          </div>
          <div className="flex gap-1 text-xs">
            <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
              All
            </FilterChip>
            <FilterChip
              active={filter === 'favorites'}
              onClick={() => setFilter('favorites')}
            >
              Favorites
            </FilterChip>
          </div>
          <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
            {visible.map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveId(p.id)}
                className={`w-full text-left p-3 rounded-lg border transition ${
                  active?.id === p.id
                    ? 'border-neutral-950 bg-white'
                    : 'border-neutral-200 bg-white hover:border-neutral-400'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.topic}</div>
                    <div className="text-xs text-neutral-500 mt-0.5 flex items-center gap-2">
                      <span>{formatDate(p.created_at)}</span>
                      <span>·</span>
                      <span>{p.word_count}w</span>
                    </div>
                  </div>
                  {p.is_favorite && (
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                  )}
                </div>
              </button>
            ))}
            {visible.length === 0 && (
              <div className="text-sm text-neutral-500 p-3">No matches.</div>
            )}
          </div>
        </div>

        {active && (
          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden fade-in">
            <header className="px-6 py-4 border-b border-neutral-100 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-wider text-neutral-500 mb-0.5">
                  {formatDate(active.created_at)}
                </div>
                <div className="text-sm font-medium truncate">{active.topic}</div>
              </div>
              <button
                onClick={() => toggleFavorite(active.id)}
                className="p-2 rounded-md hover:bg-neutral-100 transition"
                title={active.is_favorite ? 'Unstar' : 'Star'}
              >
                <Star
                  className={`w-4 h-4 ${
                    active.is_favorite
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-neutral-400'
                  }`}
                />
              </button>
              <button
                onClick={() => copy(active)}
                className="bg-neutral-950 hover:bg-neutral-800 text-white rounded-md px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition"
              >
                {copiedId === active.id ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </>
                )}
              </button>
              <button
                onClick={() => removePost(active.id)}
                className="p-2 rounded-md text-neutral-500 hover:text-red-600 hover:bg-red-50 transition"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </header>
            <div
              className="post-body px-6 py-5 text-neutral-800"
              dangerouslySetInnerHTML={{ __html: renderPost(active.content) }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  active, onClick, children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md transition ${
        active
          ? 'bg-neutral-950 text-white'
          : 'bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-400'
      }`}
    >
      {children}
    </button>
  );
}
