import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Star } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { ContentBlock } from '@/utils/education/content-blocks';
import { getLessonUrl } from '@/utils/education/lesson-navigation';
import {
  educationBodyClassName,
  educationShellClassName,
  educationSubtlePanelClassName,
  educationTonePanelClassName,
} from './education-shell';
import { LessonCallout } from './LessonCallout';
import { LessonChecklist } from './LessonChecklist';
import { LessonExercise } from './LessonExercise';
import { LessonSummary } from './LessonSummary';

interface LessonContentRendererProps {
  blocks: ContentBlock[];
}

function renderBlock(block: ContentBlock) {
  switch (block.type) {
    case 'heading':
      return block.level === 2 ? (
        <h2 className="mb-3 mt-8 text-xl font-semibold tracking-tight text-foreground">{block.text}</h2>
      ) : (
        <h3 className="mb-2 mt-6 text-lg font-semibold tracking-tight text-foreground">{block.text}</h3>
      );

    case 'paragraph':
      return <p className="text-base leading-relaxed text-foreground/90">{block.text}</p>;

    case 'callout':
      return <LessonCallout variant={block.variant} title={block.title} text={block.text} />;

    case 'key_point':
      return (
        <div className={cn(educationTonePanelClassName('violet'), 'flex items-start gap-3 rounded-[22px] px-4 py-4')}>
          <Star className="mt-0.5 h-5 w-5 shrink-0 text-violet-100" />
          <p className="text-sm font-medium leading-relaxed text-violet-50">{block.text}</p>
        </div>
      );

    case 'checklist':
      return <LessonChecklist title={block.title} items={block.items} />;

    case 'exercise':
      return <LessonExercise title={block.title} instructions={block.instructions} hint={block.hint} />;

    case 'glossary_link':
      return (
        <span
          className={cn(
            educationSubtlePanelClassName,
            'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm',
          )}
        >
          <BookOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="text-foreground/80">{block.inline_definition}</span>
        </span>
      );

    case 'separator':
      return <Separator className="my-8" />;

    case 'summary':
      return <LessonSummary points={block.points} />;

    case 'next_step':
      return (
        <Card className={educationShellClassName}>
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <p className={cn(educationBodyClassName, 'text-sm text-foreground/90')}>{block.text}</p>
            {block.lesson_slug ? (
              <Button variant="outline" size="sm" asChild className="shrink-0 gap-1.5">
                <Link to={getLessonUrl(block.lesson_slug)}>
                  Próxima
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      );

    default:
      return null;
  }
}

export function LessonContentRenderer({ blocks }: LessonContentRendererProps) {
  if (blocks.length === 0) {
    return (
      <div className={cn(educationSubtlePanelClassName, 'px-5 py-8 text-center')}>
        <p className={educationBodyClassName}>Conteúdo desta lição será exibido aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {blocks.map((block, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          {renderBlock(block)}
        </motion.div>
      ))}
    </div>
  );
}
