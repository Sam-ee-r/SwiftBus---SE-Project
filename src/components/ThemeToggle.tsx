import { useTheme } from "@/components/theme-provider"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <div className="flex items-center gap-1 bg-surface-container/40 p-1 rounded-xl border border-white/5 backdrop-blur-md">
      <button
        onClick={() => setTheme("light")}
        className={`p-2 rounded-lg transition-all ${theme === 'light' ? 'bg-electric-violet text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        title="Light Mode"
      >
        <span className="material-symbols-outlined text-[20px]">light_mode</span>
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'bg-electric-violet text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        title="Dark Mode"
      >
        <span className="material-symbols-outlined text-[20px]">dark_mode</span>
      </button>
      <button
        onClick={() => setTheme("system")}
        className={`p-2 rounded-lg transition-all ${theme === 'system' ? 'bg-electric-violet text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        title="System Preference"
      >
        <span className="material-symbols-outlined text-[20px]">desktop_windows</span>
      </button>
    </div>
  )
}
