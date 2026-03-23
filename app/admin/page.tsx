"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

export default function AdminDashboard() {
  const { data: session } = useSession();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <p className="text-gray-600 mb-8">
        Welcome back, {session?.user?.name || "Admin"}.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/admin/snails"
          className="block border border-gray-200 rounded-lg p-6 hover:border-amber-300 transition-colors"
        >
          <h2 className="font-semibold text-gray-900 mb-1">Snails</h2>
          <p className="text-sm text-gray-500">
            Manage award recipients
          </p>
        </Link>
        <Link
          href="/admin/chapters"
          className="block border border-gray-200 rounded-lg p-6 hover:border-amber-300 transition-colors"
        >
          <h2 className="font-semibold text-gray-900 mb-1">Chapters</h2>
          <p className="text-sm text-gray-500">
            Manage Slow Food chapters
          </p>
        </Link>
        <Link
          href="/admin/categories"
          className="block border border-gray-200 rounded-lg p-6 hover:border-amber-300 transition-colors"
        >
          <h2 className="font-semibold text-gray-900 mb-1">Categories</h2>
          <p className="text-sm text-gray-500">
            Manage award categories
          </p>
        </Link>
      </div>
    </div>
  );
}
