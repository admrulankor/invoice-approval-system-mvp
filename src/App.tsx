import { InvoiceProvider, useInvoice } from "@/context/InvoiceContext";
import { RoleSelector } from "@/components/RoleSelector";
import { Dashboard } from "@/components/Dashboard";
import { InvoiceForm } from "@/components/InvoiceForm";
import { InvoiceList } from "@/components/InvoiceList";
import { InvoiceDetail } from "@/components/InvoiceDetail";
import { UserRole } from "@/types/invoice";
import { useEffect, useState } from "react";
import "./index.css";

type ThemeMode = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "theme-mode";

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function InvoiceApp() {
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 dark:bg-slate-900 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Invoice Approval System</h1>
              <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">Multi-level workflow with strict approval controls</p>
            </div>
            <div className="flex items-end gap-4">
              <div className="text-right">
                <label htmlFor="theme-mode" className="text-sm font-medium text-gray-600 block mb-1 dark:text-gray-300">
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
              <div className="text-right">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Current Role:</span>
                <p className="text-lg font-semibold text-blue-600">{role.replace(/_/g, " ")}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <RoleSelector />
        <Dashboard />

        {role === UserRole.MAKER && <InvoiceForm />}

        <InvoiceList />
        {!selectedInvoice || (selectedInvoice.status !== "INCOMPLETE" && selectedInvoice.status !== "MISMATCH") ? (
          <InvoiceDetail />
        ) : null}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12 dark:bg-slate-900 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Invoice Approval System &copy; 2026 - All rights reserved</p>
        </div>
      </footer>
    </div>
  );
}

export function App() {
  return (
    <InvoiceProvider>
      <InvoiceApp />
    </InvoiceProvider>
  );
}

export default App;
