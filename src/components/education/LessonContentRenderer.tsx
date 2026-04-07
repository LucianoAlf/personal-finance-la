import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, BookOpen, ArrowRight } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import type { ContentBlock } from '@/utils/education/content-blocks';
import { getLessonUrl } from '@/utils/education/lesson-navigation';
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
        <h2 className="text-xl font-bold mt-8 mb-3">{block.text}</h2>
      ) : (
        <h3 className="text-lg font-semibold mt-6 mb-2">{block.text}</h3>
      );

    case 'paragraph':
      return <p className="text-base leading-relaxed text-foreground/90">{block.text}</p>;

    case 'callout':
      return <LessonCallout variant={block.variant} title={block.title} text={block.text} />;

    case 'key_point':
      return (
        <div className="bg-primary/5 border-l-4 border-primary p-4 rounded-r-lg flex items-start gap-3">
          <Star className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed font-medium">{block.text}</p>
        </div>
      );

    case 'checklist':
      return <LessonChecklist title={block.title} items={block.items} />;

    case 'exercise':
      return <LessonExercise title={block.title} instructions={block.instructions} hint={block.hint} />;

    case 'glossary_link':
      return (
        <span className="inline-flex items-center gap-1.5 text-sm bg-muted/50 rounded-md px-2.5 py-1.5 border border-border/50">
          <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-foreground/80">{block.inline_definition}</span>
        </span>
      );

    case 'separator':
      return <Separator className="my-8" />;

    case 'summary':
      return <LessonSummary points={block.points} />;

    case 'next_step':
      return (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <p className="text-sm leading-relaxed">{block.text}</p>
            {block.lesson_slug && (
              <Button variant="outline" size="sm" asChild className="gap-1.5 shrink-0">
                <Link to={getLessonUrl(block.lesson_slug)}>
                  Próxima
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
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
      <p className="text-muted-foreground text-center py-8">
        Conteúdo desta lição será exibido aqui.
      </p>
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
