import { useCallback, useMemo, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { EducationAnaMentorshipCard } from '@/components/education/EducationAnaMentorshipCard';
import { InvestorProfileQuestionnaire } from '@/components/education/InvestorProfileQuestionnaire';
import { EducationAchievementsSection } from '@/components/education/EducationAchievementsSection';
import { EducationDailyTipCard } from '@/components/education/EducationDailyTipCard';
import { EducationEmptyState } from '@/components/education/EducationEmptyState';
import { EducationGlossarySection } from '@/components/education/EducationGlossarySection';
import { EducationHero } from '@/components/education/EducationHero';
import { EducationInvestorProfileCard } from '@/components/education/EducationInvestorProfileCard';
import { EducationJourneySection } from '@/components/education/EducationJourneySection';
import { EducationProgressSection } from '@/components/education/EducationProgressSection';
import { Header } from '@/components/layout/Header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useEducationIntelligence } from '@/hooks/useEducationIntelligence';
import { useGamification } from '@/hooks/useGamification';
import { useInvestorProfile } from '@/hooks/useInvestorProfile';
import { useToast } from '@/hooks/use-toast';
import {
  buildAnaMentorshipPresentation,
  buildDailyTipPresentation,
  buildEducationHeroSubtitle,
  getLessonUrl,
  buildJourneyRows,
  hasResolvedTrustedInvestorProfile,
  buildProgressSummaryLines,
  shouldPromptInvestorProfileReview,
  shouldShowEducationFirstRunEmptyState,
  shouldShowInvestorProfileQuestionnaire,
  shouldShowGenericRecommendationNotice,
  type EducationCatalogLesson,
  type LessonProgressStatus,
} from '@/utils/education/view-model';
import { getEducationQualityLabel } from '@/utils/education/intelligence-contract';

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
    for (const t of catalog?.tracks ?? []) {
      map[t.slug] = t.title;
    }
    return map;
  }, [catalog?.tracks]);

  const progressByLessonId = useMemo(() => {
    const m = new Map<string, LessonProgressStatus>();
    for (const row of catalog?.progressRows ?? []) {
      m.set(row.lessonId, row.status);
    }
    return m;
  }, [catalog?.progressRows]);

  const lessonsByModuleId = useMemo(() => {
    const acc: Record<string, EducationCatalogLesson[]> = {};
    for (const lesson of catalog?.lessons ?? []) {
      if (!acc[lesson.moduleId]) acc[lesson.moduleId] = [];
      acc[lesson.moduleId].push(lesson);
    }
    for (const k of Object.keys(acc)) {
      acc[k].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return acc;
  }, [catalog?.lessons]);

  const journeyRows = useMemo(() => {
    if (!context || !catalog) return [];
    return buildJourneyRows({
      context,
      tracks: catalog.tracks,
      modules: catalog.modules,
      lessons: catalog.lessons,
      progressByLessonId,
    });
  }, [context, catalog, progressByLessonId]);

  const heroSubtitle = useMemo(() => {
    if (!context) return '';
    return buildEducationHeroSubtitle(context, trackTitleBySlug);
  }, [context, trackTitleBySlug]);

  const progressLines = useMemo(() => {
    if (!context) return [];
    return buildProgressSummaryLines(context);
  }, [context]);

  const tipPresentation = useMemo(() => {
    if (!context) return { narrativeText: null as string | null, deterministicReason: null as string | null };
    const p = buildDailyTipPresentation(context);
    return {
      narrativeText: p?.narrativeText ?? null,
      deterministicReason: p?.deterministicReason ?? null,
    };
  }, [context]);

  const nextLessonTitle = useMemo(() => {
    const id = context?.progress?.nextLessonId;
    if (!id || !catalog?.lessons) return null;
    return catalog.lessons.find((l) => l.id === id)?.title ?? null;
  }, [context?.progress?.nextLessonId, catalog?.lessons]);

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
    if (!context) return null;
    return buildAnaMentorshipPresentation(context, trackTitleBySlug, nextLessonTitle);
  }, [context, nextLessonTitle, trackTitleBySlug]);

  const showEmptyState = Boolean(
    context &&
      catalog &&
      shouldShowEducationFirstRunEmptyState(context, catalog.progressRows),
  );

  const showGenericNotice = Boolean(context && shouldShowGenericRecommendationNotice(context));

  const wrapLessonAction = useCallback(
    (fn: (id: string) => Promise<void>) => async (lessonId: string) => {
      try {
        await fn(lessonId);
      } catch (e) {
        toast({
          title: 'Não foi possível atualizar o progresso',
          description: e instanceof Error ? e.message : 'Tente novamente.',
          variant: 'destructive',
        });
      }
    },
    [toast],
  );

  const handleStartLesson = useMemo(
    () => wrapLessonAction(startLesson),
    [startLesson, wrapLessonAction],
  );

  const handleCompleteLesson = useMemo(
    () => wrapLessonAction(completeLesson),
    [completeLesson, wrapLessonAction],
  );

  const handleContinueSuggested = useCallback(async () => {
    const id = context?.progress?.nextLessonId;
    if (!id) return;
    await handleStartLesson(id);
    navigate(getLessonUrl(id));
  }, [context?.progress?.nextLessonId, handleStartLesson, navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Educação Financeira"
        subtitle="Aprenda a cuidar melhor do seu dinheiro"
        icon={<GraduationCap size={24} />}
      />

      <div className="p-6 space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              Não foi possível carregar o hub educacional. Verifique sua conexão e tente novamente.
            </AlertDescription>
          </Alert>
        )}

        <EducationHero
          loading={pageLoading}
          subtitle={heroSubtitle}
          levelLabel={gamification.loading ? null : gamification.levelTitle}
          streakDays={gamification.profile?.current_streak ?? null}
        />

        {showEmptyState && <EducationEmptyState />}

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
