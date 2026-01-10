import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface TestAnswers {
  [questionId: string]: number;
}

export interface TestResult {
  id: string;
  owner_id: string;
  consent_given: boolean;
  consent_at: string | null;
  domain_cycle_score: number;
  domain_energy_score: number;
  domain_mental_score: number;
  domain_body_score: number;
  total_score: number;
  result_category: 'low' | 'moderate' | 'high';
  answers: TestAnswers;
  created_at: string;
  updated_at: string;
}

// Questions organized by domain
export const QUESTIONS = {
  cycle: [
    { id: 'cycle_1', text: 'Mijn cyclus is onregelmatiger geworden' },
    { id: 'cycle_2', text: 'Mijn menstruatie is zwaarder of juist lichter dan vroeger' },
    { id: 'cycle_3', text: 'Ik heb vaker PMS-achtige klachten' },
    { id: 'cycle_4', text: 'Ik heb opvliegers of warmte-aanvallen' },
    { id: 'cycle_5', text: 'Nachtelijk zweten verstoort mijn slaap' },
  ],
  energy: [
    { id: 'energy_1', text: 'Ik voel me vaak vermoeid ondanks voldoende slaap' },
    { id: 'energy_2', text: 'Ik word \'s nachts wakker en kan moeilijk doorslapen' },
    { id: 'energy_3', text: 'Ik voel me \'s ochtends niet uitgerust' },
    { id: 'energy_4', text: 'Mijn energie schommelt sterk over de dag' },
  ],
  mental: [
    { id: 'mental_1', text: 'Ik ervaar meer prikkelbaarheid of stemmingswisselingen' },
    { id: 'mental_2', text: 'Ik heb vaker last van brain fog of concentratieproblemen' },
    { id: 'mental_3', text: 'Ik voel me sneller overweldigd of gespannen' },
    { id: 'mental_4', text: 'Ik herken mezelf emotioneel minder goed' },
  ],
  body: [
    { id: 'body_1', text: 'Ik kom makkelijker aan dan vroeger' },
    { id: 'body_2', text: 'Herstel na sport of inspanning duurt langer' },
    { id: 'body_3', text: 'Ik heb vaker gewrichts- of spierklachten' },
    { id: 'body_4', text: 'Mijn huid of haar is zichtbaar veranderd' },
  ],
};

export const ANSWER_OPTIONS = [
  { value: 0, label: 'Nooit' },
  { value: 1, label: 'Soms' },
  { value: 2, label: 'Regelmatig' },
  { value: 3, label: 'Vaak / bijna altijd' },
];

export const MAX_SCORES = {
  cycle: 15,
  energy: 12,
  mental: 12,
  body: 12,
  total: 51,
};

export function calculateDomainScore(answers: TestAnswers, domain: keyof typeof QUESTIONS): number {
  return QUESTIONS[domain].reduce((sum, q) => sum + (answers[q.id] || 0), 0);
}

export function calculateTotalScore(answers: TestAnswers): number {
  return Object.keys(QUESTIONS).reduce(
    (sum, domain) => sum + calculateDomainScore(answers, domain as keyof typeof QUESTIONS),
    0
  );
}

export function getResultCategory(totalScore: number): 'low' | 'moderate' | 'high' {
  if (totalScore <= 15) return 'low';
  if (totalScore <= 30) return 'moderate';
  return 'high';
}

export const RESULT_TEXTS = {
  low: {
    title: 'Weinig signalen',
    description: 'Op basis van je antwoorden zijn er momenteel weinig aanwijzingen voor klachten die passen bij de perimenopauze. Blijf je lichaam volgen, zeker als klachten veranderen.',
  },
  moderate: {
    title: 'Milde tot matige signalen',
    description: 'Je antwoorden laten zien dat je klachten ervaart die kunnen passen bij hormonale veranderingen. Veel vrouwen ervaren dit in de fase vóór de overgang.',
  },
  high: {
    title: 'Duidelijke signalen',
    description: 'Je klachtenpatroon zou kunnen passen bij de perimenopauze. Dit betekent niet dat er iets \'mis\' is, maar wel dat je lichaam anders kan reageren dan je gewend was.',
  },
};

export function usePerimenopauseTests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['perimenopause-tests', user?.id],
    queryFn: async (): Promise<TestResult[]> => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('perimenopause_tests')
        .select('*')
        .eq('owner_id' as never, user.id as never)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return ((data || []) as unknown as TestResult[]);
    },
    enabled: !!user,
  });
}

export function useLatestTest() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['perimenopause-test-latest', user?.id],
    queryFn: async (): Promise<TestResult | null> => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('perimenopause_tests')
        .select('*')
        .eq('owner_id' as never, user.id as never)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return (data as unknown as TestResult) || null;
    },
    enabled: !!user,
  });
}

export function useSaveTestResult() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (answers: TestAnswers) => {
      if (!user) throw new Error('Niet ingelogd');

      const domainCycleScore = calculateDomainScore(answers, 'cycle');
      const domainEnergyScore = calculateDomainScore(answers, 'energy');
      const domainMentalScore = calculateDomainScore(answers, 'mental');
      const domainBodyScore = calculateDomainScore(answers, 'body');
      const totalScore = domainCycleScore + domainEnergyScore + domainMentalScore + domainBodyScore;
      const resultCategory = getResultCategory(totalScore);

      const { data, error } = await supabase
        .from('perimenopause_tests')
        .insert({
          owner_id: user.id,
          consent_given: true,
          consent_at: new Date().toISOString(),
          domain_cycle_score: domainCycleScore,
          domain_energy_score: domainEnergyScore,
          domain_mental_score: domainMentalScore,
          domain_body_score: domainBodyScore,
          total_score: totalScore,
          result_category: resultCategory,
          answers,
        } as never)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as TestResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perimenopause-tests'] });
      queryClient.invalidateQueries({ queryKey: ['perimenopause-test-latest'] });
    },
  });
}

export function useDeleteTestResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (testId: string) => {
      const { error } = await supabase
        .from('perimenopause_tests')
        .delete()
        .eq('id' as never, testId as never);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perimenopause-tests'] });
      queryClient.invalidateQueries({ queryKey: ['perimenopause-test-latest'] });
    },
  });
}
