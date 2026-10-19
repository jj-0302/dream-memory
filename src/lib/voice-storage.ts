import AsyncStorage from '@react-native-async-storage/async-storage';

const VOICE_DRAFT_KEY = 'dream-memory:voice-draft:v1';

export type VoiceDraft = {
  uri: string;
  durationMillis: number;
  createdAt: string;
};

export async function getVoiceDraft(): Promise<VoiceDraft | null> {
  const saved = await AsyncStorage.getItem(VOICE_DRAFT_KEY);

  if (!saved) {
    return null;
  }

  try {
    const draft = JSON.parse(saved);

    if (
      typeof draft.uri !== 'string' ||
      typeof draft.durationMillis !== 'number'
    ) {
      return null;
    }

    return draft;
  } catch {
    return null;
  }
}

export async function saveVoiceDraft(
  draft: VoiceDraft
): Promise<void> {
  await AsyncStorage.setItem(
    VOICE_DRAFT_KEY,
    JSON.stringify(draft)
  );
}

export async function clearVoiceDraft(): Promise<void> {
  await AsyncStorage.removeItem(VOICE_DRAFT_KEY);
}