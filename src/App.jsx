import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { pagesConfig } from "./pages.config";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import Login from "@/pages/Login";
import Onboarding from "@/pages/Onboarding";
import { useEffect } from "react";
import { getCycleSettings, getCycleLogs } from "@/lib/db";
import { checkAllNotifications } from "@/lib/notifications";
import { buildCycles, predictNextPeriod } from "@/lib/cycleStats";

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) =>
  Layout ? <Layout currentPageName={currentPageName}>{children}</Layout> : <>{children}</>;

function NotificationChecker() {
  useEffect(() => {
    const runCheck = async () => {
      try {
        const [settings, logs] = await Promise.all([getCycleSettings(), getCycleLogs(200)]);
        if (!settings) return;
        const cycles    = buildCycles(logs);
        const prediction = predictNextPeriod(cycles, settings);
        checkAllNotifications(settings, logs, prediction);
      } catch {}
    };
    const timer = setTimeout(runCheck, 2000);
    return () => clearTimeout(timer);
  }, []);
  return null;
}

const AuthenticatedApp = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: "linear-gradient(160deg, #faf5ff 0%, #fff0f8 100%)" }}>
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-xl shadow-violet-200 mb-4 animate-pulse">
          <span className="text-white text-2xl">🌙</span>
        </div>
        <div className="w-8 h-8 border-4 border-purple-200 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in → show Login
  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  // Logged in but onboarding not complete → show Onboarding
  if (!profile?.onboarding_completed) {
    return (
      <Routes>
        <Route path="*" element={<Onboarding />} />
      </Routes>
    );
  }

  // Fully authenticated → main app
  return (
    <>
      <NotificationChecker />
      <Routes>
        <Route
          path="/"
          element={
            <LayoutWrapper currentPageName={mainPageKey}>
              <MainPage />
            </LayoutWrapper>
          }
        />
        {Object.entries(Pages).map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            }
          />
        ))}
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
