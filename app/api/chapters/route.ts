import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Centroid = { chapter_id: number; lat: string | null; lon: string | null };

export async function GET() {
  const [chapters, centroids] = await Promise.all([
    prisma.chapter.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { snails: { where: { status: "published" } } } },
      },
    }),
    // Rough centre of each chapter, averaged over the addresses it already has.
    // The address autocomplete biases its search towards this, which is what
    // makes a half-typed street resolve locally instead of nationally. Averaging
    // what's there beats storing coordinates on the chapter: nobody has to keep
    // them up to date, and a chapter that moves follows its own snails.
    prisma.$queryRaw<Centroid[]>`
      SELECT s.chapter_id,
             AVG(l.latitude)::text  AS lat,
             AVG(l.longitude)::text AS lon
      FROM locations l
      JOIN snails s ON s.id = l.snail_id
      WHERE l.latitude IS NOT NULL AND l.longitude IS NOT NULL
      GROUP BY s.chapter_id
    `,
  ]);

  const byChapter = new Map(
    centroids
      .filter((c) => c.lat !== null && c.lon !== null)
      .map((c) => [c.chapter_id, { lat: Number(c.lat), lon: Number(c.lon) }])
  );

  return NextResponse.json(
    chapters.map((chapter) => ({
      ...chapter,
      centroid: byChapter.get(chapter.id) ?? null,
    }))
  );
}
