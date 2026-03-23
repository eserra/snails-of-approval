"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SessionProvider, useSession, signOut } from "next-auth/react";
import { useState } from "react";

const navItems = [
  { href: "/admin", label: "Dashboard", adminOnly: false },
  { href: "/admin/snails", label: "Snails", adminOnly: false },
  { href: "/admin/chapters", label: "Chapters", adminOnly: false },
  { href: "/admin/categories", label: "Categories", adminOnly: false },
  { href: "/admin/users", label: "Users", adminOnly: true },
];

function AdminNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (pathname === "/admin/login") return null;

  const filteredItems = navItems.filter(
    (item) => !item.adminOnly || session?.user?.role === "admin"
  );

  const navLinks = (
    <>
      <nav className="space-y-1 flex-1">
        {filteredItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              pathname === item.href
                ? "bg-amber-100 text-amber-800"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {session?.user && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <p className="text-xs text-gray-500 mb-2">{session.user.email}</p>
          <button
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Sign out
          </button>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Mobile admin bar */}
      <div className="md:hidden border-b border-gray-200 bg-gray-50 px-4 py-3 flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">Admin</span>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1 text-gray-600"
          aria-label="Toggle admin menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>
      {mobileOpen && (
        <div className="md:hidden bg-gray-50 border-b border-gray-200 px-4 pb-4">
          {navLinks}
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-gray-50 border-r border-gray-200 min-h-[calc(100vh-4rem)] p-4 flex-col">
        {navLinks}
      </aside>
    </>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="md:flex">
        <AdminNav />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </SessionProvider>
  );
}
