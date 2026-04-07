import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import type { EducationGlossaryTermRow } from '@/hooks/useEducationIntelligence';
import { filterGlossaryTermsForSearch } from '@/utils/education/view-model';

interface EducationGlossarySectionProps {
  loading: boolean;
  terms: EducationGlossaryTermRow[];
}

export function EducationGlossarySection({ loading, terms }: EducationGlossarySectionProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () =>
      filterGlossaryTermsForSearch(
        terms.map((t) => ({
          slug: t.slug,
          term: t.term,
          short_definition: t.short_definition,
        })),
        query,
      ),
    [terms, query],
  );

  const rows = useMemo(() => {
    const slugSet = new Set(filtered.map((t) => t.slug));
    return terms.filter((t) => slugSet.has(t.slug));
  }, [filtered, terms]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (terms.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Glossário</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="education-glossary-search" className="flex items-center gap-2">
            <Search size={16} aria-hidden />
            Buscar termo
          </Label>
          <Input
            id="education-glossary-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex.: CDI, juros, dívidas..."
            autoComplete="off"
          />
        </div>
        <ul className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
          {rows.map((t) => (
            <li key={t.slug} className="border-b border-gray-100 pb-4 last:border-0">
              <p className="font-medium text-gray-900">{t.term}</p>
              <p className="text-sm text-gray-700 mt-1">{t.short_definition}</p>
              {t.extended_text && (
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">{t.extended_text}</p>
              )}
            </li>
          ))}
        </ul>
        {rows.length === 0 && <p className="text-sm text-gray-500">Nenhum termo encontrado para esta busca.</p>}
      </CardContent>
    </Card>
  );
}
