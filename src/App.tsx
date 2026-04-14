import { useInvoice } from "@/context/InvoiceContext";
import { Dashboard } from "@/components/Dashboard";
import { InvoiceForm } from "@/components/InvoiceForm";
import { InvoiceList } from "@/components/InvoiceList";
import { InvoiceDetail } from "@/components/InvoiceDetail";
import { LoginForm } from "@/components/LoginForm";
import { AccountManager } from "@/components/AccountManager";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types/invoice";
import { useEffect, useState } from "react";
import "./index.css";

type ThemeMode = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "theme-mode";

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function InvoiceApp() {
  const { user, loading, logout } = useAuth();
  const { role, selectedInvoice } = useInvoice();
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");

  useEffect(() => {
    const storedMode = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    if (storedMode === "light" || storedMode === "dark" || storedMode === "system") {
      setThemeMode(storedMode);
    }
  }, []);

  useEffect(() => {
    const applyTheme = () => {
      const resolvedTheme = themeMode === "system" ? getSystemTheme() : themeMode;
      document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
      document.documentElement.style.colorScheme = resolvedTheme;
    };

    applyTheme();
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);

    if (themeMode !== "system") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => applyTheme();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleSystemThemeChange);
      return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
    }

    mediaQuery.addListener(handleSystemThemeChange);
    return () => mediaQuery.removeListener(handleSystemThemeChange);
  }, [themeMode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 text-gray-700 dark:text-gray-200">
        Loading session...
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 dark:bg-slate-900 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Invoice Approval System</h1>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-6">
              <div className="flex items-center gap-3">
                <label htmlFor="theme-mode" className="text-sm font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  Theme Mode
                </label>
                <select
                  id="theme-mode"
                  value={themeMode}
                  onChange={event => setThemeMode(event.target.value as ThemeMode)}
                  className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-gray-100"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm text-gray-600 dark:text-gray-300">Signed in as</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{user.username}</p>
                </div>
                <button
                  onClick={logout}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-sm font-semibold"
                >
                  Logout
                </button>
              </div>
              <div className="flex items-center gap-2 text-right">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">Current Role:</span>
                <p className="text-lg font-semibold text-blue-600 whitespace-nowrap">{user.role.replace(/_/g, " ")}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {user.role === "ADMIN" ? (
          <AccountManager />
        ) : (
          <>
            <Dashboard />

            {role === UserRole.MAKER && <InvoiceForm />}

            <InvoiceList />
            {!selectedInvoice || (selectedInvoice.status !== "INCOMPLETE" && selectedInvoice.status !== "MISMATCH") ? (
              <InvoiceDetail />
            ) : null}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12 dark:bg-slate-900 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
          <p>Invoice Approval System &copy; 2026 - All rights reserved</p>
        </div>
      </footer>
    </div>
  );
}

export function App() {
  return <InvoiceApp />;
}

export default App;
