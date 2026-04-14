import { useEffect, useState } from "react";
import { UserRole, type AuthUser } from "@/types/invoice";

export function AccountManager() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(UserRole.MAKER);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/accounts", { credentials: "include" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Unable to fetch accounts");
        return;
      }

      setUsers(data.users || []);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const createAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/auth/accounts", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: username.trim(), password, role }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to create account");
        return;
      }

      setMessage(`Account ${data.user.username} created`);
      setUsername("");
      setPassword("");
      setRole(UserRole.MAKER);
      await fetchAccounts();
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Account Management</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Create maker, checker 1, checker 2, and signer accounts.</p>

        {message && <p className="mt-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-3 py-2 rounded-lg">{message}</p>}
        {error && <p className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</p>}

        <form onSubmit={createAccount} className="mt-4 grid gap-4 md:grid-cols-4">
          <input
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
          />
          <select
            value={role}
            onChange={e => setRole(e.target.value as UserRole)}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
          >
            {Object.values(UserRole).map(currentRole => (
              <option key={currentRole} value={currentRole}>
                {currentRole.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
          >
            Create Account
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Existing Accounts</h3>
        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading accounts...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700 text-left">
                  <th className="py-2 text-gray-600 dark:text-gray-300">Username</th>
                  <th className="py-2 text-gray-600 dark:text-gray-300">Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-gray-100 dark:border-slate-800">
                    <td className="py-2 text-gray-900 dark:text-gray-100">{user.username}</td>
                    <td className="py-2 text-blue-700 dark:text-blue-300 font-semibold">{user.role.replace(/_/g, " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
