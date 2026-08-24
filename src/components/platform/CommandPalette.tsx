"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

type Result = { type: string; id: string; title: string; href: string };

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open || q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { credentials: "include" });
      if (!res.ok) return;
      const j = await res.json();
      setResults(j.results ?? []);
    }, 200);
    return () => clearTimeout(t);
  }, [q, open]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setQ("");
      router.push(href);
    },
    [router]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 p-4 pt-[12vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-white/10 px-4">
          <Search className="h-4 w-4 text-muted" />
          <input
            autoFocus
            className="w-full bg-transparent py-3 text-sm outline-none"
            placeholder="Search cameras, incidents, alerts… (⌘K)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {results.map((r) => (
            <li key={`${r.type}-${r.id}`}>
              <button
                type="button"
                onClick={() => go(r.href)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-white/5"
              >
                <span>{r.title}</span>
                <span className="text-xs uppercase text-muted">{r.type}</span>
              </button>
            </li>
          ))}
          {q.length >= 2 && results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted">No results</li>
          )}
          {q.length < 2 && (
            <li className="px-3 py-6 text-center text-sm text-muted">Type at least 2 characters</li>
          )}
        </ul>
      </div>
    </div>
  );
}
