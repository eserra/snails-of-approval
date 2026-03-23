"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SnailCard from "@/components/SnailCard";
import Filters from "@/components/Filters";

type Snail = {
  slug: string;
  name: string;
  yearAwarded: number;
  description: string | null;
  chapter: { name: string; slug: string };
  category: { name: string; slug: string };
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

function ListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [snails, setSnails] = useState<Snail[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);

  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/snails?${searchParams.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setSnails(data.snails);
        setPagination(data.pagination);
        setLoading(false);
      });
  }, [searchParams]);

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const params = new URLSearchParams(searchParams.toString());
    const q = formData.get("search") as string;
    if (q) {
      params.set("search", q);
    } else {
      params.delete("search");
    }
    params.delete("page");
    router.push(`/list?${params.toString()}`);
  }

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`/list?${params.toString()}`);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Directory</h1>

      <form onSubmit={handleSearch} className="mb-4">
        <div className="flex gap-2">
          <input
            name="search"
            type="text"
            defaultValue={search}
            placeholder="Search by name or description..."
            className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-sm"
          />
          <button
            type="submit"
            className="bg-amber-700 text-white px-4 py-2 rounded-md text-sm hover:bg-amber-800 transition-colors"
          >
            Search
          </button>
        </div>
      </form>

      <Filters className="mb-6" />

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : snails.length === 0 ? (
        <p className="text-gray-500">No results found.</p>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {pagination?.total} result{pagination?.total !== 1 ? "s" : ""}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {snails.map((snail) => (
              <SnailCard key={snail.slug} {...snail} />
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-2 text-sm text-gray-600">
                Page {page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= pagination.totalPages}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ListPageWrapper() {
  return (
    <Suspense>
      <ListPage />
    </Suspense>
  );
}
