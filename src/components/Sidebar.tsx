import { Sparkles, Zap, Library, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

export type View = 'generate' | 'library';

type Props = {
  view: View;
  onChange: (v: View) => void;
  email: string;
  postCount: number;
};

export default function Sidebar({ view, onChange, email, postCount }: Props) {
  return (
    <aside className="w-60 shrink-0 border-r border-neutral-200 bg-white flex flex-col">
      <div className="p-5 border-b border-neutral-200">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold tracking-tight">Lumen</span>
          <span className="ml-auto text-[10px] uppercase tracking-wider text-neutral-400 font-medium">
            Beta
          </span>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        <NavItem
          icon={<Zap className="w-4 h-4" />}
          label="Generate"
          active={view === 'generate'}
          onClick={() => onChange('generate')}
        />
        <NavItem
          icon={<Library className="w-4 h-4" />}
          label="Library"
          badge={postCount > 0 ? String(postCount) : undefined}
          active={view === 'library'}
          onClick={() => onChange('library')}
        />
      </nav>
      <div className="p-3 border-t border-neutral-200">
        <div className="px-2 py-2">
          <div className="text-xs text-neutral-500">Signed in</div>
          <div className="text-sm font-medium truncate">{email}</div>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 transition"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

function NavItem({
  icon, label, active, onClick, badge,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition ${
        active
          ? 'bg-neutral-950 text-white'
          : 'text-neutral-700 hover:bg-neutral-100'
      }`}
    >
      {icon}
      <span>{label}</span>
      {badge && (
        <span
          className={`ml-auto text-[11px] px-1.5 py-0.5 rounded ${
            active ? 'bg-white/15' : 'bg-neutral-200 text-neutral-600'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
