"use client";

import { useState, useRef, useEffect } from "react";
import {
  type PhotonFeature,
  type ResolvedAddress,
  addressKey,
  formatSuggestion,
  isAddressResult,
  resolveAddress,
} from "@/lib/address";

type Suggestion = { label: string; resolved: ResolvedAddress };

export type SearchBias = { lat: number; lon: number };

type Props = {
  value: string;
  /**
   * Rough centre to search around — the chapter's, or the snail's own address.
   * Without it a half-typed street matches nationally: "130 w 3rd st" returns
   * Wabasha, Minnesota before Manhattan.
   */
  bias?: SearchBias | null;
  /** Fires on every keystroke, with the raw text. */
  onChange: (address: string) => void;
  /** Fires when a suggestion is picked, with the address split into fields. */
  onSelect?: (resolved: ResolvedAddress) => void;
  className?: string;
  placeholder?: string;
};

export default function AddressAutocomplete({
  value,
  bias,
  onChange,
  onSelect,
  className,
  placeholder,
}: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [noStreet, setNoStreet] = useState(false);
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
      setNoStreet(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        // Photon rather than Nominatim: it matches partial input, which is what
        // an autocomplete gets. Nominatim parses the query as a finished address
        // and mismatches badly on anything half-typed.
        const url = new URL("https://photon.komoot.io/api/");
        url.searchParams.set("q", val);
        // Over-fetch: several businesses often share one street address, and the
        // duplicates collapse into a single suggestion below.
        url.searchParams.set("limit", "10");
        if (bias) {
          url.searchParams.set("lat", String(bias.lat));
          url.searchParams.set("lon", String(bias.lon));
        }
        const res = await fetch(url.toString(), {
          headers: { "User-Agent": "SnailsOfApproval/1.0" },
        });
        if (res.ok) {
          const body = await res.json();
          const data: PhotonFeature[] = body.features ?? [];
          const addresses = data.filter(isAddressResult);
          // Distinct addresses only — several businesses often share one street address.
          const seen = new Set<string>();
          const suggestions: Suggestion[] = [];
          for (const r of addresses) {
            const key = addressKey(r);
            const label = formatSuggestion(r);
            if (!label || seen.has(key)) continue;
            seen.add(key);
            suggestions.push({ label, resolved: resolveAddress(r) });
            if (suggestions.length === 5) break;
          }
          setResults(suggestions);
          // Nothing matched had a street — say so rather than showing an empty box.
          setNoStreet(suggestions.length === 0 && data.length > 0);
          setOpen(suggestions.length > 0 || data.length > 0);
        }
      } catch {
        // Silently fail — user can still type manually
      } finally {
        setLoading(false);
      }
    }, 400);
  }

  function handleSelect(suggestion: Suggestion) {
    setQuery(suggestion.resolved.address);
    onChange(suggestion.resolved.address);
    onSelect?.(suggestion.resolved);
    setOpen(false);
    setResults([]);
    setNoStreet(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => (results.length > 0 || noStreet) && setOpen(true)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className={className}
        placeholder={placeholder}
      />
      {loading && (
        <div className="absolute right-3 top-2.5 text-xs text-gray-400">
          Searching...
        </div>
      )}
      {open && (results.length > 0 || noStreet) && (
        <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {noStreet ? (
            <li className="px-3 py-2 text-sm text-gray-400">
              No street address matched. Try a house number and street.
            </li>
          ) : (
            results.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => handleSelect(s)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-900 transition-colors"
                >
                  {s.label}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
