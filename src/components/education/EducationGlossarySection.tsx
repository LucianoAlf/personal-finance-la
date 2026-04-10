import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { EducationGlossaryTermRow } from '@/hooks/useEducationIntelligence';
import { filterGlossaryTermsForSearch } from '@/utils/education/view-model';
import {
  educationBodyClassName,
  educationHeadingClassName,
  educationShellClassName,
  educationSubtlePanelClassName,
} from './education-shell';

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
      <Card className={educationShellClassName}>
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
    <Card className={educationShellClassName}>
      <CardHeader className="space-y-2">
        <CardTitle className={educationHeadingClassName}>Glossário</CardTitle>
        <p className={educationBodyClassName}>
          Consulte termos do universo financeiro e entenda os conceitos mais citados ao longo das aulas.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="education-glossary-search" className="flex items-center gap-2 text-sm text-foreground">
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

        <ul className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
          {rows.map((term) => (
            <li key={term.slug} className={cn(educationSubtlePanelClassName, 'px-4 py-4')}>
              <p className="font-medium text-foreground">{term.term}</p>
              <p className="mt-1 text-sm text-foreground/85">{term.short_definition}</p>
              {term.extended_text ? (
                <p className={cn(educationBodyClassName, 'mt-2')}>{term.extended_text}</p>
              ) : null}
            </li>
          ))}
        </ul>

        {rows.length === 0 ? (
          <p className={educationBodyClassName}>Nenhum termo encontrado para esta busca.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
