"use client";

import { useState, useRef, useEffect } from "react";

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
};

type Props = {
  value: string;
  onChange: (address: string, lat?: string, lon?: string) => void;
  className?: string;
  placeholder?: string;
};

export default function AddressAutocomplete({
  value,
  onChange,
  className,
  placeholder,
}: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync external value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleInput(val: string) {
    setQuery(val);
    onChange(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.length < 5) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("q", val);
        url.searchParams.set("format", "json");
        url.searchParams.set("limit", "5");
        url.searchParams.set("countrycodes", "us");
        const res = await fetch(url.toString(), {
          headers: { "User-Agent": "SnailsOfApproval/1.0" },
        });
        if (res.ok) {
          const data: NominatimResult[] = await res.json();
          setResults(data);
          setOpen(data.length > 0);
        }
      } catch {
        // Silently fail — user can still type manually
      } finally {
        setLoading(false);
      }
    }, 400);
  }

  function handleSelect(result: NominatimResult) {
    setQuery(result.display_name);
    onChange(result.display_name, result.lat, result.lon);
    setOpen(false);
    setResults([]);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className={className}
        placeholder={placeholder}
      />
      {loading && (
        <div className="absolute right-3 top-2.5 text-xs text-gray-400">
          Searching...
        </div>
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => handleSelect(r)}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-900 transition-colors"
              >
                {r.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
