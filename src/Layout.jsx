import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, CalendarDays, TrendingUp, Settings, Sparkles } from "lucide-react";

const NAV_ITEMS = [
  { name: "Home", icon: Home, page: "Home" },
  { name: "Calendar", icon: CalendarDays, page: "Calendar" },
  { name: "AI", icon: Sparkles, page: "AIAssistant" },
  { name: "Insights", icon: TrendingUp, page: "Insights" },
  { name: "Settings", icon: Settings, page: "Settings" },
];

const HIDE_NAV_PAGES = ["LogEntry"];

export default function Layout({ children, currentPageName }) {
  const showNav = !HIDE_NAV_PAGES.includes(currentPageName);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <style>{`
        :root {
          --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
        }
        body {
          font-family: var(--font-sans);
          -webkit-font-smoothing: antialiased;
        }
      `}</style>

      <main className="pb-safe">
        {children}
      </main>

      {showNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 z-50">
          <div className="max-w-lg mx-auto flex items-center justify-around py-2 px-2">
            {NAV_ITEMS.map((item) => {
              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={item.name}
                  to={createPageUrl(item.page)}
                  className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all ${
                    isActive
                      ? "text-rose-500"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
                  <span className={`text-[10px] font-medium ${isActive ? "text-rose-500" : ""}`}>
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}