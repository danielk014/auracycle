import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, CalendarDays, TrendingUp, Settings, Sparkles } from "lucide-react";

const NAV_ITEMS = [
  { name: "Home", icon: Home, page: "Home" },
  { name: "Calendar", icon: CalendarDays, page: "Calendar" },
  { name: "Luna AI", icon: Sparkles, page: "AIAssistant" },
  { name: "Insights", icon: TrendingUp, page: "Insights" },
  { name: "Settings", icon: Settings, page: "Settings" },
];

const HIDE_NAV_PAGES = ["LogEntry"];

export default function Layout({ children, currentPageName }) {
  const showNav = !HIDE_NAV_PAGES.includes(currentPageName);

  return (
    <div className="min-h-screen">
      <main className="pb-safe">
        {children}
      </main>

      {showNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-purple-100 shadow-[0_-4px_24px_rgba(139,92,246,0.08)]">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-around px-2 py-2 pb-safe">
                {NAV_ITEMS.map((item) => {
                  const isActive = currentPageName === item.page;
                  return (
                    <Link
                      key={item.name}
                      to={createPageUrl(item.page)}
                      className={`relative flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-2xl transition-all duration-200 ${
                        isActive ? "" : "text-slate-400 hover:text-purple-400"
                      }`}
                    >
                      {isActive && (
                        <span className="absolute inset-0 rounded-2xl bg-gradient-to-b from-purple-50 to-pink-50" />
                      )}
                      <item.icon
                        className={`relative w-5 h-5 transition-all duration-200 ${
                          isActive
                            ? "text-purple-600 stroke-[2.5]"
                            : "stroke-[1.8]"
                        }`}
                      />
                      <span
                        className={`relative text-[9px] font-semibold transition-all duration-200 ${
                          isActive ? "text-purple-600" : ""
                        }`}
                      >
                        {item.name}
                      </span>
                      {isActive && (
                        <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
                      )}
                    </Link>
                  );
                })}
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}
