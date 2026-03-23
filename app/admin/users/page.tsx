"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type User = {
  id: number;
  email: string;
  name: string;
  role: string;
  createdAt: string;
};

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("editor");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (session?.user?.role !== "admin") {
      router.push("/admin");
      return;
    }
    loadUsers();
  }, [session, router]);

  async function loadUsers() {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      setUsers(await res.json());
    }
    setLoading(false);
  }

  function startNew() {
    setEditId(null);
    setName("");
    setEmail("");
    setPassword("");
    setRole("editor");
    setError("");
    setShowForm(true);
  }

  function startEdit(user: User) {
    setEditId(user.id);
    setName(user.name);
    setEmail(user.email);
    setPassword("");
    setRole(user.role);
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const body: Record<string, string> = { name, email, role };
    if (password) body.password = password;

    const url = editId ? `/api/admin/users/${editId}` : "/api/admin/users";
    const method = editId ? "PUT" : "POST";

    if (!editId && !password) {
      setError("Password is required for new users");
      setSaving(false);
      return;
    }

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to save");
      setSaving(false);
      return;
    }

    setShowForm(false);
    setSaving(false);
    setLoading(true);
    loadUsers();
  }

  async function handleDelete(id: number, userName: string) {
    if (!confirm(`Delete user "${userName}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Failed to delete");
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }

  if (session?.user?.role !== "admin") return null;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <button
          onClick={startNew}
          className="bg-amber-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-amber-800 transition-colors"
        >
          Add User
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 border border-gray-200 rounded-lg space-y-3">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
              {error}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password {editId ? "(leave blank to keep)" : "*"}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
              >
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-amber-700 text-white px-4 py-2 rounded-md text-sm hover:bg-amber-800 disabled:opacity-50"
            >
              {saving ? "Saving..." : editId ? "Update" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="border border-gray-300 px-4 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="pb-3 font-medium text-gray-500">Name</th>
              <th className="pb-3 font-medium text-gray-500">Email</th>
              <th className="pb-3 font-medium text-gray-500">Role</th>
              <th className="pb-3 font-medium text-gray-500"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-gray-100">
                <td className="py-3 font-medium text-gray-900">{user.name}</td>
                <td className="py-3 text-gray-600">{user.email}</td>
                <td className="py-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      user.role === "admin"
                        ? "bg-purple-100 text-purple-800"
                        : user.role === "editor"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="py-3 text-right space-x-3">
                  <button
                    onClick={() => startEdit(user)}
                    className="text-amber-700 hover:text-amber-800 text-xs"
                  >
                    Edit
                  </button>
                  {String(user.id) !== session?.user?.id && (
                    <button
                      onClick={() => handleDelete(user.id, user.name)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
