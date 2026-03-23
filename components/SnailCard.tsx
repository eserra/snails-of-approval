import Link from "next/link";

type SnailCardProps = {
  slug: string;
  name: string;
  yearAwarded: number | null;
  description: string | null;
  chapter: { name: string };
  category: { name: string } | null;
};

export default function SnailCard({
  slug,
  name,
  yearAwarded,
  description,
  chapter,
  category,
}: SnailCardProps) {
  return (
    <Link
      href={`/snails/${slug}`}
      className="block border border-gray-200 rounded-lg p-5 hover:border-amber-300 hover:shadow-sm transition-all"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-900">{name}</h3>
        {yearAwarded && (
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full whitespace-nowrap ml-2">
            {yearAwarded}
          </span>
        )}
      </div>
      <div className="flex gap-2 mb-2">
        <span className="text-xs text-gray-500">{category?.name}</span>
        <span className="text-xs text-gray-400">&middot;</span>
        <span className="text-xs text-gray-500">{chapter.name}</span>
      </div>
      {description && (
        <p className="text-sm text-gray-600 line-clamp-2">{description}</p>
      )}
    </Link>
  );
}
