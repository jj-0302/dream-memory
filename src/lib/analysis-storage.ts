import AsyncStorage from '@react-native-async-storage/async-storage';

const ANALYSIS_KEY = 'dream-memory:analyses:v1';

export type EvidenceSource = {
  title: string;
  authors: string;
  year: number;
  url: string;
  note: string;
};

export type DreamAnalysisDraft = {
  observations: string[];
  possibleConnections: string[];
  reflectionQuestions: string[];
  gentleSuggestions: string[];
  evidenceSources: EvidenceSource[];
  disclaimer: string;
  generator: 'local-reflection';
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

export async function getDreamAnalyses(
  dreamId: string
): Promise<DreamAnalysis[]> {
  const analyses = await getAllAnalyses();

  return analyses.filter(
    (analysis) => analysis.dreamId === dreamId
  );
}

export async function saveDreamAnalysis(
  dreamId: string,
  draft: DreamAnalysisDraft
): Promise<DreamAnalysis> {
  const analyses = await getAllAnalyses();

  const newAnalysis: DreamAnalysis = {
    ...draft,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    dreamId,
    createdAt: new Date().toISOString(),
  };

  await saveAllAnalyses([newAnalysis, ...analyses]);

  return newAnalysis;
}

export async function deleteDreamAnalyses(
  dreamId: string
): Promise<void> {
  const analyses = await getAllAnalyses();

  await saveAllAnalyses(
    analyses.filter(
      (analysis) => analysis.dreamId !== dreamId
    )
  );
}