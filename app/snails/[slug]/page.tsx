import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const snail = await prisma.snail.findUnique({
    where: { slug, status: "published" },
    select: { name: true, description: true },
  });
  if (!snail) return { title: "Not Found" };
  return {
    title: `${snail.name} | Snails of Approval`,
    description: snail.description || undefined,
  };
}

export default async function SnailDetailPage({ params }: Props) {
  const { slug } = await params;

  const snail = await prisma.snail.findUnique({
    where: { slug, status: "published" },
    include: {
      chapter: { select: { name: true, slug: true } },
      category: { select: { name: true, slug: true } },
    },
  });

  if (!snail) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/list"
        className="text-sm text-amber-700 hover:text-amber-800 mb-4 inline-block"
      >
        &larr; Back to directory
      </Link>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{snail.name}</h1>
          <span className="text-sm bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
            {snail.yearAwarded}
          </span>
        </div>

        <div className="flex gap-2 mb-4">
          <span className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded">
            {snail.category.name}
          </span>
          <Link
            href={`/chapters/${snail.chapter.slug}`}
            className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
          >
            {snail.chapter.name}
          </Link>
        </div>

        {snail.description && (
          <p className="text-gray-700 mb-6 whitespace-pre-line">
            {snail.description}
          </p>
        )}

        <div className="border-t border-gray-200 pt-4 space-y-2">
          {snail.address && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">Address:</span> {snail.address}
            </p>
          )}
          {snail.phone && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">Phone:</span>{" "}
              <a href={`tel:${snail.phone}`} className="text-amber-700">
                {snail.phone}
              </a>
            </p>
          )}
          {snail.email && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">Email:</span>{" "}
              <a href={`mailto:${snail.email}`} className="text-amber-700">
                {snail.email}
              </a>
            </p>
          )}
        </div>

        {(snail.website || snail.facebookUrl || snail.instagramUrl) && (
          <div className="border-t border-gray-200 pt-4 mt-4 flex gap-4">
            {snail.website && (
              <a
                href={snail.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-amber-700 hover:text-amber-800"
              >
                Website
              </a>
            )}
            {snail.facebookUrl && (
              <a
                href={snail.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-amber-700 hover:text-amber-800"
              >
                Facebook
              </a>
            )}
            {snail.instagramUrl && (
              <a
                href={snail.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-amber-700 hover:text-amber-800"
              >
                Instagram
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
