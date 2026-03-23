import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import SnailCard from "@/components/SnailCard";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const chapter = await prisma.chapter.findUnique({
    where: { slug },
    select: { name: true },
  });
  if (!chapter) return { title: "Not Found" };
  return { title: `${chapter.name} | Snails of Approval` };
}

export default async function ChapterDetailPage({ params }: Props) {
  const { slug } = await params;

  const chapter = await prisma.chapter.findUnique({
    where: { slug },
    include: {
      snails: {
        where: { status: "published" },
        orderBy: { name: "asc" },
        include: {
          category: { select: { name: true, slug: true } },
          chapter: { select: { name: true, slug: true } },
        },
      },
    },
  });

  if (!chapter) notFound();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/chapters"
        className="text-sm text-amber-700 hover:text-amber-800 mb-4 inline-block"
      >
        &larr; All chapters
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">{chapter.name}</h1>

      {chapter.snails.length === 0 ? (
        <p className="text-gray-500">No awards in this chapter yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {chapter.snails.map((snail) => (
            <SnailCard key={snail.slug} {...snail} />
          ))}
        </div>
      )}
    </div>
  );
}
