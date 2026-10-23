import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { BookOpen, Search, SearchX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { GLOSSARY, type GlossaryEntry } from "@/lib/glossary";
import { cn } from "@/lib/utils";

const CATEGORIES = Array.from(new Set(GLOSSARY.map((g) => g.category)));

export default function GlossaryPage() {
  const { hash } = useLocation();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<GlossaryEntry["category"] | "todas">("todas");
  const target = hash.replace("#", "");

  useEffect(() => {
    if (!target) return;
    const el = document.getElementById(target);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [target]);

  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GLOSSARY.filter((g) => category === "todas" || g.category === category).filter((g) =>
      q ? [g.term, g.aka ?? "", g.short, g.long].some((t) => t.toLowerCase().includes(q)) : true,
    );
  }, [query, category]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <BookOpen className="size-6 text-primary" /> Glossário
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Termos do modelo, da neuroimagem e dos testes cognitivos, em linguagem clínica. Os mesmos termos aparecem
          sublinhados nas telas do caso — passe o mouse para ver a definição curta.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar termo…"
            aria-label="Buscar no glossário"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Categoria">
          {(["todas", ...CATEGORIES] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                category === c ? "border-primary bg-primary text-white" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {c === "todas" ? "Todas" : c}
            </button>
          ))}
        </div>
      </div>

      {entries.length === 0 ? (
        <Card>
          <EmptyState icon={SearchX} title="Nenhum termo encontrado" description="Tente outra palavra ou outra categoria." />
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Card
              key={entry.id}
              id={entry.id}
              className={cn("scroll-mt-24 p-5 transition-shadow", target === entry.id && "ring-2 ring-primary")}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-semibold">
                  {entry.term}
                  {entry.aka && <span className="ml-2 text-sm font-normal text-muted-foreground">{entry.aka}</span>}
                </h2>
                <Badge variant="secondary">{entry.category}</Badge>
              </div>
              <p className="mt-2 text-sm font-medium">{entry.short}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{entry.long}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
