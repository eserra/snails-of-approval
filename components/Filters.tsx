"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type FilterOption = { slug: string; name: string };

export default function Filters({ className = "" }: { className?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [chapters, setChapters] = useState<FilterOption[]>([]);
  const [categories, setCategories] = useState<FilterOption[]>([]);
  // Read from the data rather than a window off the current year: the award goes
  // back to 2007, and a fixed window would hide every snail older than it.
  const [years, setYears] = useState<number[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/chapters"),
      fetch("/api/categories"),
      fetch("/api/snails/years"),
    ]).then(async ([chapRes, catRes, yearRes]) => {
      setChapters(await chapRes.json());
      setCategories(await catRes.json());
      setYears(await yearRes.json());
    });
  }, []);

  const currentChapter = searchParams.get("chapter") || "";
  const currentCategory = searchParams.get("category") || "";
  const currentYear = searchParams.get("year") || "";

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`?${params.toString()}`);
  }

  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      <select
        value={currentChapter}
        onChange={(e) => updateFilter("chapter", e.target.value)}
        className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
      >
        <option value="">All Chapters</option>
        {chapters.map((ch) => (
          <option key={ch.slug} value={ch.slug}>
            {ch.name}
          </option>
        ))}
      </select>

      <select
        value={currentCategory}
        onChange={(e) => updateFilter("category", e.target.value)}
        className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
      >
        <option value="">All Categories</option>
        {categories.map((cat) => (
          <option key={cat.slug} value={cat.slug}>
            {cat.name}
          </option>
        ))}
      </select>

      <select
        value={currentYear}
        onChange={(e) => updateFilter("year", e.target.value)}
        className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
      >
        <option value="">All Years</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      {(currentChapter || currentCategory || currentYear) && (
        <button
          onClick={() => router.push("?")}
          className="text-sm text-amber-700 hover:text-amber-800 underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
