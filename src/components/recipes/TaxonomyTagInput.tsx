import { useEffect, useRef, useState } from "react";
import { CircleAlert, Search, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Taxonomy } from "@/types";

interface TaxonomyTagInputProps {
  value: Taxonomy[];
  onChange: (tags: Taxonomy[]) => void;
  error?: string;
}

export default function TaxonomyTagInput({ value, onChange, error }: TaxonomyTagInputProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Taxonomy[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        setLocalError(null);

        try {
          const response = await fetch(`/api/taxonomy?q=${encodeURIComponent(normalizedQuery)}`);
          const payload = (await response.json()) as { data?: Taxonomy[]; error?: string };

          if (!response.ok) {
            throw new Error(payload.error ?? "Failed to search taxonomy.");
          }

          const filtered = (payload.data ?? []).filter(
            (taxonomy) => !value.some((selected) => selected.id === taxonomy.id),
          );

          setSuggestions(filtered);
          setIsOpen(true);
        } catch (err) {
          setSuggestions([]);
          setIsOpen(true);
          setLocalError(err instanceof Error ? err.message : "Failed to search taxonomy.");
        } finally {
          setLoading(false);
        }
      })();
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [query, value]);

  function addTag(tag: Taxonomy) {
    if (value.some((selected) => selected.id === tag.id)) {
      setQuery("");
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    onChange([...value, tag]);
    setQuery("");
    setSuggestions([]);
    setIsOpen(false);
    setLocalError(null);
  }

  function removeTag(tagId: string) {
    onChange(value.filter((tag) => tag.id !== tagId));
  }

  async function handleCreateOrSelect() {
    const normalizedQuery = query.trim();
    if (!normalizedQuery || creating) {
      return;
    }

    const matchedSuggestion = suggestions.find(
      (suggestion) => suggestion.name.toLowerCase() === normalizedQuery.toLowerCase(),
    );
    if (matchedSuggestion) {
      addTag(matchedSuggestion);
      return;
    }

    setCreating(true);
    setLocalError(null);

    try {
      const response = await fetch("/api/taxonomy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: normalizedQuery }),
      });

      const payload = (await response.json()) as { data?: Taxonomy; error?: string };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Failed to create taxonomy.");
      }

      addTag(payload.data);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to create taxonomy.");
    } finally {
      setCreating(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleCreateOrSelect();
    }
  }

  return (
    <div ref={containerRef} className="relative space-y-2">
      <label htmlFor="taxonomy" className="mb-1 block text-sm text-blue-100/80">
        Taxonomy tags
      </label>

      <div
        className={cn(
          "rounded-lg border bg-white/10 px-3 py-3 text-white transition-colors",
          error ? "border-red-400/60" : "border-white/20",
        )}
      >
        {value.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {value.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm"
              >
                <Tag className="size-3" />
                {tag.name}
                <button
                  type="button"
                  className="text-white/60 transition-colors hover:text-white"
                  onClick={() => {
                    removeTag(tag.id);
                  }}
                  aria-label={`Remove ${tag.name}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <div className="relative">
          <Search className="absolute top-1/2 left-0 size-4 -translate-y-1/2 text-white/40" />
          <input
            id="taxonomy"
            type="text"
            value={query}
            onChange={(event) => {
              const nextQuery = event.target.value;
              setQuery(nextQuery);

              if (!nextQuery.trim()) {
                setSuggestions([]);
                setIsOpen(false);
                setLocalError(null);
              }
            }}
            onFocus={() => {
              if (suggestions.length > 0 || query.trim()) {
                setIsOpen(true);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a tag and press Enter"
            className="w-full border-0 bg-transparent pl-7 text-white placeholder-white/40 outline-none"
          />
        </div>
      </div>

      {error ? (
        <p className="mt-1 flex items-center gap-1 text-xs text-red-300">
          <CircleAlert className="size-3" />
          {error}
        </p>
      ) : null}

      {!error && localError ? (
        <p className="mt-1 flex items-center gap-1 text-xs text-red-300">
          <CircleAlert className="size-3" />
          {localError}
        </p>
      ) : null}

      {isOpen ? (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-slate-950/95 text-sm text-white shadow-2xl backdrop-blur">
          {loading ? <p className="px-3 py-2 text-white/60">Searching tags...</p> : null}

          {!loading && suggestions.length > 0 ? (
            <ul className="max-h-56 overflow-y-auto py-1">
              {suggestions.map((suggestion) => (
                <li key={suggestion.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-white/10"
                    onClick={() => {
                      addTag(suggestion);
                    }}
                  >
                    <span>{suggestion.name}</span>
                    {suggestion.category ? <span className="text-xs text-white/50">{suggestion.category}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {!loading && query.trim() ? (
            <button
              type="button"
              className="flex w-full items-center justify-between border-t border-white/10 px-3 py-2 text-left transition-colors hover:bg-white/10"
              onClick={() => {
                void handleCreateOrSelect();
              }}
            >
              <span>{creating ? "Creating..." : `Create "${query.trim()}"`}</span>
              <Tag className="size-4 text-white/50" />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
