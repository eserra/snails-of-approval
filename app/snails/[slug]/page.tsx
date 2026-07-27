import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { Metadata } from "next";
import { contactRoleLabel } from "@/lib/contact-roles";

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
      contacts: {
        where: { isPublic: true },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, role: true, email: true, phone: true },
      },
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
          {snail.yearAwarded && (
            <span className="text-sm bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
              {snail.yearAwarded}
            </span>
          )}
        </div>

        <div className="flex gap-2 mb-4">
          {snail.category && (
            <span className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded">
              {snail.category.name}
            </span>
          )}
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

        <div className="border-t border-gray-200 pt-4 space-y-3">
          {snail.address && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">Address:</span> {snail.address}
            </p>
          )}
          {snail.contacts.map((contact) => (
            <div key={contact.id} className="text-sm text-gray-600">
              <p className="font-medium text-gray-900">
                {contact.name}
                <span className="ml-2 text-xs font-normal text-gray-500">
                  {contactRoleLabel(contact.role)}
                </span>
              </p>
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="text-amber-700">
                  {contact.phone}
                </a>
              )}
              {contact.phone && contact.email && (
                <span className="mx-2 text-gray-300">&middot;</span>
              )}
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="text-amber-700">
                  {contact.email}
                </a>
              )}
            </div>
          ))}
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
