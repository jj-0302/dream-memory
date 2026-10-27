import AsyncStorage from '@react-native-async-storage/async-storage';

const ANALYSIS_KEY = 'dream-memory:analyses:v1';

export type EvidenceSource = {
  title: string;
  authors: string;
  year: number;
  url: string;
  note: string;
};

export type AnalysisInterpretation = {
  id: string;
  interpretation: string;
  evidence: string;
};

export type AnalysisPublicSections = {
  understanding: string;
  keyClues: string[];
  wakingConnections: string[];
  possibleReadings: AnalysisInterpretation[];
  furtherExploration: string[];
};

export type DreamAnalysisDraft = {
  explorationId?: string;
  kind?: 'initial' | 'deep';
  deepNarrative?: string;
  schemaVersion?: 3;
  publicSections?: AnalysisPublicSections;
  dreamSummary?: string;
  emotionalThemes?: string[];
  keyElements?: string[];
  sleepNoteConnections?: string[];
  alternativeInterpretations?: string[];
  evidenceBoundaries?: string[];
  observations: string[];
  possibleConnections: string[];
  reflectionQuestions: string[];
  gentleSuggestions: string[];
  evidenceSources: EvidenceSource[];
  disclaimer: string;
  generator: 'local-reflection' | 'ai';
};

export type DreamAnalysis = DreamAnalysisDraft & {
  id: string;
  dreamId: string;
  createdAt: string;
};

async function getAllAnalyses(): Promise<DreamAnalysis[]> {
  const saved = await AsyncStorage.getItem(ANALYSIS_KEY);

  if (!saved) {
    return [];
  }

  try {
    const analyses = JSON.parse(saved);
    return Array.isArray(analyses) ? analyses : [];
  } catch {
    return [];
  }
}

async function saveAllAnalyses(
  analyses: DreamAnalysis[]
): Promise<void> {
  await AsyncStorage.setItem(
    ANALYSIS_KEY,
    JSON.stringify(analyses)
  );
}

let analysisWrites: Promise<unknown> = Promise.resolve();
function serializeAnalysisWrite<T>(task: () => Promise<T>): Promise<T> {
  const result = analysisWrites.then(task);
  analysisWrites = result.catch(() => undefined);
  return result;
}

export async function getDreamAnalyses(
  dreamId: string
): Promise<DreamAnalysis[]> {
  await analysisWrites;
  const analyses = await getAllAnalyses();

  return analyses.filter(
    (analysis) => analysis.dreamId === dreamId
  );
}

export function saveDreamAnalysis(dreamId: string, draft: DreamAnalysisDraft, stableId?: string): Promise<DreamAnalysis> {
  return serializeAnalysisWrite(async () => {
    const analyses = await getAllAnalyses();
    const existing = stableId ? analyses.find(item => item.id === stableId && item.dreamId === dreamId) : undefined;
    if (existing) return existing;
    const newAnalysis: DreamAnalysis = {
      ...draft, id: stableId ?? Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      dreamId, createdAt: new Date().toISOString(),
    };
    await saveAllAnalyses([newAnalysis, ...analyses]);
    return newAnalysis;
  });
}

export function deleteDreamAnalyses(dreamId: string): Promise<void> {
  return serializeAnalysisWrite(async () => {
    await saveAllAnalyses((await getAllAnalyses()).filter(item => item.dreamId !== dreamId));
  });
}

export function deleteExplorationAnalyses(explorationId: string): Promise<void> {
  return serializeAnalysisWrite(async () => {
    await saveAllAnalyses((await getAllAnalyses()).filter(item => item.explorationId !== explorationId));
  });
}
