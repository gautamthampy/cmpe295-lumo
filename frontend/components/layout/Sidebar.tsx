'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/',                 label: 'Dashboard',     icon: '🏠', color: 'from-violet-400 to-purple-300' },
  { href: '/lessons',          label: 'Lessons',       icon: '📚', color: 'from-sky-400 to-cyan-300' },
  { href: '/lessons/editor',   label: 'Lesson Editor', icon: '✨', color: 'from-amber-300 to-yellow-200' },
  { href: '/lessons/analytics',label: 'Analytics',     icon: '📊', color: 'from-pink-400 to-rose-300' },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className="w-64 flex flex-col justify-between m-4 rounded-[1.75rem] p-6 flex-shrink-0 relative z-10 border-2"
      style={{
        background: 'var(--sidebar-bg)',
        borderColor: '#e4deff',
      }}
    >
      <div>
        {/* Branding */}
        <div className="flex items-center gap-3 mb-10 pl-1">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-400 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-violet-200">
            L
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gradient leading-none">
              LUMO
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400 mt-0.5">Study Coach</p>
          </div>
        </div>

        {/* Navigation */}
        <nav aria-label="Main navigation">
          <ul className="space-y-2">
            {navItems.map(({ href, label, icon, color }) => {
              const active = isActive(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-sm transition-all ${
                      active
                        ? 'bg-white text-violet-700 shadow-md shadow-violet-100 border border-violet-100'
                        : 'text-slate-600 hover:bg-white/60 hover:text-violet-700'
                    }`}
                  >
                    <span
                      className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-lg shadow-sm flex-shrink-0`}
                      aria-hidden="true"
                    >
                      {icon}
                    </span>
                    <span>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Daily Goal */}
      <div className="bg-white rounded-2xl p-4 border border-violet-100 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg" aria-hidden="true">🌟</span>
          <h3 className="text-sm font-bold text-slate-700">Daily Goal</h3>
        </div>
        <div className="w-full bg-violet-100 rounded-full h-3 mb-2 overflow-hidden">
          <div
            className="h-3 rounded-full w-3/4 relative"
            style={{ background: 'linear-gradient(90deg, var(--color-accent-gold), var(--color-accent-mint))' }}
            role="progressbar"
            aria-valuenow={75}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Daily study goal: 75% complete"
          >
            <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,.25)25%,transparent_25%,transparent_50%,rgba(255,255,255,.25)_50%,rgba(255,255,255,.25)_75%,transparent_75%,transparent)] bg-[length:0.75rem_0.75rem] animate-[progress_1s_linear_infinite]" />
          </div>
        </div>
        <p className="text-xs text-slate-500 font-medium">45 / 60 mins — almost there!</p>
      </div>
    </aside>
  );
}
