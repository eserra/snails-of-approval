import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWrite } from "@/lib/rbac";
import {
  toSfusaChapter,
  fetchSfusaAwardees,
  buildAwardeeIndex,
  matchOnMap,
} from "@/lib/sfusa-map";

// Refreshes every snail's `onSfusaMap` flag from the live Slow Food USA map.
export async function POST(request: NextRequest) {
  const forbidden = await requireWrite(request);
  if (forbidden) return forbidden;

  const chapters = await prisma.chapter.findMany({
    select: { id: true, name: true },
  });

  let checked = 0;
  let onMap = 0;
  let changed = 0;
  const perChapter: Record<string, { onMap: number; total: number }> = {};
  const errors: string[] = [];

  for (const chapter of chapters) {
    const snails = await prisma.snail.findMany({
      where: { chapterId: chapter.id },
      select: { id: true, name: true, zip: true, onSfusaMap: true },
    });
    if (snails.length === 0) continue;

    let index;
    try {
      index = buildAwardeeIndex(
        await fetchSfusaAwardees(toSfusaChapter(chapter.name))
      );
    } catch (e) {
      errors.push(`${chapter.name}: ${(e as Error).message}`);
      continue;
    }

    const toOn: number[] = [];
    const toOff: number[] = [];
    let chapterOnMap = 0;
    for (const s of snails) {
      checked++;
      const isOn = matchOnMap({ name: s.name, zip: s.zip }, index) !== null;
      if (isOn) {
        onMap++;
        chapterOnMap++;
      }
      if (isOn && !s.onSfusaMap) toOn.push(s.id);
      else if (!isOn && s.onSfusaMap) toOff.push(s.id);
    }

    if (toOn.length) {
      await prisma.snail.updateMany({
        where: { id: { in: toOn } },
        data: { onSfusaMap: true },
      });
    }
    if (toOff.length) {
      await prisma.snail.updateMany({
        where: { id: { in: toOff } },
        data: { onSfusaMap: false },
      });
    }
    changed += toOn.length + toOff.length;
    perChapter[chapter.name] = { onMap: chapterOnMap, total: snails.length };
  }

  return NextResponse.json({ checked, onMap, changed, perChapter, errors });
}
