import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chapters | Snails of Approval",
};

export default async function ChaptersPage() {
  const chapters = await prisma.chapter.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { snails: { where: { status: "published" } } } },
    },
  });

  // Group chapters by state
  const byState = chapters.reduce(
    (acc, ch) => {
      if (!acc[ch.state]) acc[ch.state] = [];
      acc[ch.state].push(ch);
      return acc;
    },
    {} as Record<string, typeof chapters>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Chapters</h1>

      {Object.entries(byState)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([state, stateChapters]) => (
          <div key={state} className="mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">
              {state}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {stateChapters.map((ch) => (
                <Link
                  key={ch.slug}
                  href={`/chapters/${ch.slug}`}
                  className="block border border-gray-200 rounded-lg p-4 hover:border-amber-300 hover:shadow-sm transition-all"
                >
                  <span className="font-medium text-gray-900">{ch.name}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    {ch._count.snails} award
                    {ch._count.snails !== 1 ? "s" : ""}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}

      {chapters.length === 0 && (
        <p className="text-gray-500">No chapters yet.</p>
      )}
    </div>
  );
}
