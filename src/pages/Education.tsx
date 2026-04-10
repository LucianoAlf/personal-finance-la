import { useCallback, useMemo, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { EducationAchievementsSection } from '@/components/education/EducationAchievementsSection';
import { EducationAnaMentorshipCard } from '@/components/education/EducationAnaMentorshipCard';
import { EducationDailyTipCard } from '@/components/education/EducationDailyTipCard';
import { EducationEmptyState } from '@/components/education/EducationEmptyState';
import { EducationGlossarySection } from '@/components/education/EducationGlossarySection';
import { EducationHero } from '@/components/education/EducationHero';
import { EducationInvestorProfileCard } from '@/components/education/EducationInvestorProfileCard';
import { EducationJourneySection } from '@/components/education/EducationJourneySection';
import { EducationProgressSection } from '@/components/education/EducationProgressSection';
import { InvestorProfileQuestionnaire } from '@/components/education/InvestorProfileQuestionnaire';
import { Header } from '@/components/layout/Header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useEducationIntelligence } from '@/hooks/useEducationIntelligence';
import { useGamification } from '@/hooks/useGamification';
import { useInvestorProfile } from '@/hooks/useInvestorProfile';
import { useToast } from '@/hooks/use-toast';
import { getEducationQualityLabel } from '@/utils/education/intelligence-contract';
import {
  buildAnaMentorshipPresentation,
  buildDailyTipPresentation,
  buildEducationHeroSubtitle,
  buildJourneyRows,
  buildProgressSummaryLines,
  getLessonUrl,
  hasResolvedTrustedInvestorProfile,
  shouldPromptInvestorProfileReview,
  shouldShowEducationFirstRunEmptyState,
  shouldShowGenericRecommendationNotice,
  shouldShowInvestorProfileQuestionnaire,
  type EducationCatalogLesson,
  type LessonProgressStatus,
} from '@/utils/education/view-model';

export function Education() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const {
    context,
    catalog,
    isLoading: educationLoading,
    error,
    startLesson,
    completeLesson,
    isSavingProgress,
  } = useEducationIntelligence();
  const gamification = useGamification();
  const { latestAssessment, trustedAssessment, isLoading: investorProfileLoading } = useInvestorProfile();
  const [isInvestorQuestionnaireOpen, setIsInvestorQuestionnaireOpen] = useState(false);

  const pageLoading = authLoading || (Boolean(user) && educationLoading);

  const trackTitleBySlug = useMemo(() => {
    const map: Record<string, string> = {};
    for (const track of catalog?.tracks ?? []) {
      map[track.slug] = track.title;
    }
    return map;
  }, [catalog?.tracks]);

  const progressByLessonId = useMemo(() => {
    const progressMap = new Map<string, LessonProgressStatus>();
    for (const row of catalog?.progressRows ?? []) {
      progressMap.set(row.lessonId, row.status);
    }
    return progressMap;
  }, [catalog?.progressRows]);

  const lessonsByModuleId = useMemo(() => {
    const lessonsMap: Record<string, EducationCatalogLesson[]> = {};

    for (const lesson of catalog?.lessons ?? []) {
      if (!lessonsMap[lesson.moduleId]) {
        lessonsMap[lesson.moduleId] = [];
      }
      lessonsMap[lesson.moduleId].push(lesson);
    }

    for (const moduleId of Object.keys(lessonsMap)) {
      lessonsMap[moduleId].sort((a, b) => a.sortOrder - b.sortOrder);
    }

    return lessonsMap;
  }, [catalog?.lessons]);

  const journeyRows = useMemo(() => {
    if (!context || !catalog) {
      return [];
    }

    return buildJourneyRows({
      context,
      tracks: catalog.tracks,
      modules: catalog.modules,
      lessons: catalog.lessons,
      progressByLessonId,
    });
  }, [catalog, context, progressByLessonId]);

  const heroSubtitle = useMemo(() => {
    if (!context) {
      return '';
    }
    return buildEducationHeroSubtitle(context, trackTitleBySlug);
  }, [context, trackTitleBySlug]);

  const progressLines = useMemo(() => {
    if (!context) {
      return [];
    }
    return buildProgressSummaryLines(context);
  }, [context]);

  const tipPresentation = useMemo(() => {
    if (!context) {
      return { narrativeText: null as string | null, deterministicReason: null as string | null };
    }

    const presentation = buildDailyTipPresentation(context);
    return {
      narrativeText: presentation?.narrativeText ?? null,
      deterministicReason: presentation?.deterministicReason ?? null,
    };
  }, [context]);

  const nextLessonTitle = useMemo(() => {
    const nextLessonId = context?.progress?.nextLessonId;
    if (!nextLessonId || !catalog?.lessons) {
      return null;
    }

    return catalog.lessons.find((lesson) => lesson.id === nextLessonId)?.title ?? null;
  }, [catalog?.lessons, context?.progress?.nextLessonId]);

  const reviewInvestorProfile = useMemo(
    () =>
      shouldPromptInvestorProfileReview(
        trustedAssessment?.effectiveAt ?? latestAssessment?.effective_at ?? null,
      ),
    [latestAssessment?.effective_at, trustedAssessment?.effectiveAt],
  );

  const showInvestorQuestionnaire = useMemo(
    () =>
      shouldShowInvestorProfileQuestionnaire({
        isLoading: authLoading || pageLoading || investorProfileLoading || !user,
        hasTrustedProfile: hasResolvedTrustedInvestorProfile({
          canonicalProfileKey: context?.investorProfile?.profileKey,
          assessmentProfileKey: trustedAssessment?.profileKey,
        }),
        forceOpen: isInvestorQuestionnaireOpen,
        reviewRequired: reviewInvestorProfile,
      }),
    [
      authLoading,
      context?.investorProfile?.profileKey,
      investorProfileLoading,
      isInvestorQuestionnaireOpen,
      pageLoading,
      reviewInvestorProfile,
      trustedAssessment?.profileKey,
      user,
    ],
  );

  const anaMentorshipPresentation = useMemo(() => {
    if (!context) {
      return null;
    }

    return buildAnaMentorshipPresentation(context, trackTitleBySlug, nextLessonTitle);
  }, [context, nextLessonTitle, trackTitleBySlug]);

  const showEmptyState = Boolean(
    context &&
      catalog &&
      shouldShowEducationFirstRunEmptyState(context, catalog.progressRows),
  );

  const showGenericNotice = Boolean(context && shouldShowGenericRecommendationNotice(context));

  const wrapLessonAction = useCallback(
    (fn: (lessonId: string) => Promise<void>) => async (lessonId: string) => {
      try {
        await fn(lessonId);
      } catch (err) {
        toast({
          title: 'Não foi possível atualizar o progresso',
          description: err instanceof Error ? err.message : 'Tente novamente.',
          variant: 'destructive',
        });
      }
    },
    [toast],
  );

  const handleStartLesson = useMemo(() => wrapLessonAction(startLesson), [startLesson, wrapLessonAction]);
  const handleCompleteLesson = useMemo(() => wrapLessonAction(completeLesson), [completeLesson, wrapLessonAction]);

  const handleContinueSuggested = useCallback(async () => {
    const nextLessonId = context?.progress?.nextLessonId;
    if (!nextLessonId) {
      return;
    }

    await handleStartLesson(nextLessonId);
    navigate(getLessonUrl(nextLessonId));
  }, [context?.progress?.nextLessonId, handleStartLesson, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Header
        title="Educação Financeira"
        subtitle="Aprenda a cuidar melhor do seu dinheiro"
        icon={<GraduationCap size={24} />}
      />

      <div className="space-y-6 p-6">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>
              Não foi possível carregar o hub educacional. Verifique sua conexão e tente novamente.
            </AlertDescription>
          </Alert>
        ) : null}

        <EducationHero
          loading={pageLoading}
          subtitle={heroSubtitle}
          levelLabel={gamification.loading ? null : gamification.levelTitle}
          streakDays={gamification.profile?.current_streak ?? null}
        />

        {showEmptyState ? <EducationEmptyState /> : null}

        <EducationInvestorProfileCard
          loading={pageLoading || investorProfileLoading}
          section={context?.investorProfile ?? null}
          reviewRequired={reviewInvestorProfile}
          questionnaireVersion={latestAssessment?.questionnaire_version ?? null}
          onOpenQuestionnaire={() => setIsInvestorQuestionnaireOpen(true)}
        />

        {showInvestorQuestionnaire ? (
          <InvestorProfileQuestionnaire
            mode={trustedAssessment?.profileKey ? 'review' : 'initial'}
            onSubmitted={() => setIsInvestorQuestionnaireOpen(false)}
            onCancel={trustedAssessment?.profileKey ? () => setIsInvestorQuestionnaireOpen(false) : undefined}
          />
        ) : null}

        <EducationProgressSection
          loading={pageLoading}
          section={context?.progress ?? null}
          summaryLines={progressLines}
          nextLessonTitle={nextLessonTitle}
          onContinueNextLesson={handleContinueSuggested}
          continueDisabled={isSavingProgress || !context?.progress?.nextLessonId}
        />

        <EducationAnaMentorshipCard
          loading={pageLoading}
          presentation={anaMentorshipPresentation}
          nextLessonId={context?.progress?.nextLessonId ?? null}
          qualityLabel={context ? getEducationQualityLabel(context.quality.ana.source) : null}
        />

        <EducationJourneySection
          loading={pageLoading}
          trackRows={journeyRows}
          lessonsByModuleId={lessonsByModuleId}
          lessonProgress={progressByLessonId}
          showGenericNotice={showGenericNotice}
          isSaving={isSavingProgress}
          onStartLesson={handleStartLesson}
          onCompleteLesson={handleCompleteLesson}
        />

        <EducationAchievementsSection badges={gamification.badges} loading={gamification.loading} />

        <EducationDailyTipCard
          loading={pageLoading}
          narrativeText={tipPresentation.narrativeText}
          deterministicReason={tipPresentation.deterministicReason}
        />

        <EducationGlossarySection loading={pageLoading} terms={catalog?.glossaryTerms ?? []} />
      </div>
    </div>
  );
}
