'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '../theme/ThemeProvider';

const items = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/account', label: 'Account', icon: '👤' },
];

export default function BottomBar() {
  const path = usePathname();
  const { resolvedTheme, toggleTheme } = useTheme();
  return (
    <nav className="hidden sm:block sm:static sm:bg-transparent sm:border-0 sm:mt-4">
      <ul className="max-w-5xl mx-auto grid grid-cols-2 gap-2 p-2 sm:flex sm:justify-end sm:gap-3 sm:p-0">
        {items.map((it) => {
          const active = path === it.href;
          return (
            <li key={it.href} className="flex items-center justify-center">
              <Link href={it.href} className={`flex items-center sm:flex-row flex-col justify-center rounded-xl px-3 py-2 text-xs ${active ? 'text-app' : 'muted'} hover:text-app pressable`}>
                <span aria-hidden className="text-lg sm:mr-1">{it.icon}</span>
                <span className="hidden sm:inline">{it.label}</span>
              </Link>
            </li>
          );
        })}
        <li className="hidden sm:flex items-center">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
            className="ml-2 rounded-lg border border-app px-3 py-2 text-xs text-app/70 hover:bg-[color:var(--surface)] pressable"
          >
            {resolvedTheme === 'dark' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </li>
      </ul>
    </nav>
  );
}


