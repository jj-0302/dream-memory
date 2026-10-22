import AsyncStorage from '@react-native-async-storage/async-storage';

const SLEEP_DRAFT_KEY = 'dream-memory:sleep-draft:v1';
const SLEEP_NOTES_KEY = 'dream-memory:sleep-notes:v1';

export type SleepCategory =
  | '工作学习'
  | '人际关系'
  | '情绪压力'
  | '重要选择'
  | '期待愿望'
  | '其他';

export type SleepDraft = {
  content: string;
  category?: SleepCategory;
  intensity: number;
};

export type SleepNote = {
  id: string;
  content: string;
  category?: SleepCategory;
  intensity: number;
  createdAt: string;
  updatedAt: string;
};

async function saveSleepNotes(
  notes: SleepNote[]
): Promise<void> {
  await AsyncStorage.setItem(
    SLEEP_NOTES_KEY,
    JSON.stringify(notes)
  );
}

export async function getSleepDraft(): Promise<SleepDraft> {
  const savedDraft = await AsyncStorage.getItem(
    SLEEP_DRAFT_KEY
  );

  if (!savedDraft) {
    return {
      content: '',
      intensity: 3,
    };
  }

  try {
    const draft = JSON.parse(savedDraft);

    return {
      content:
        typeof draft.content === 'string'
          ? draft.content
          : '',
      category: draft.category,
      intensity:
        typeof draft.intensity === 'number'
          ? draft.intensity
          : 3,
    };
  } catch {
    return {
      content: '',
      intensity: 3,
    };
  }
}

export async function saveSleepDraft(
  draft: SleepDraft
): Promise<void> {
  await AsyncStorage.setItem(
    SLEEP_DRAFT_KEY,
    JSON.stringify(draft)
  );
}

export async function clearSleepDraft(): Promise<void> {
  await AsyncStorage.removeItem(SLEEP_DRAFT_KEY);
}

export async function getSleepNotes(): Promise<SleepNote[]> {
  const savedNotes = await AsyncStorage.getItem(
    SLEEP_NOTES_KEY
  );

  if (!savedNotes) {
    return [];
  }

  try {
    const notes = JSON.parse(savedNotes);

    return Array.isArray(notes) ? notes : [];
  } catch {
    return [];
  }
}

export async function createSleepNote(
  draft: SleepDraft
): Promise<SleepNote> {
  const cleanContent = draft.content.trim();

  if (!cleanContent) {
    throw new Error('睡前记录不能为空');
  }

  const now = new Date().toISOString();

  const newNote: SleepNote = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    content: cleanContent,
    category: draft.category,
    intensity: draft.intensity,
    createdAt: now,
    updatedAt: now,
  };

  const currentNotes = await getSleepNotes();

  await saveSleepNotes([newNote, ...currentNotes]);
  await clearSleepDraft();

  return newNote;
}

export async function deleteSleepNote(
  id: string
): Promise<void> {
  const notes = await getSleepNotes();

  await saveSleepNotes(
    notes.filter((note) => note.id !== id)
  );
}

export async function updateSleepNote(
  id: string,
  draft: SleepDraft
): Promise<SleepNote> {
  const cleanContent = draft.content.trim();
  if (!cleanContent) throw new Error('睡前记录不能为空');
  const notes = await getSleepNotes();
  const index = notes.findIndex((note) => note.id === id);
  if (index < 0) throw new Error('没有找到这条睡前记录');
  const updated: SleepNote = {
    ...notes[index],
    content: cleanContent,
    category: draft.category,
    intensity: draft.intensity,
    updatedAt: new Date().toISOString(),
  };
  const next = [...notes];
  next[index] = updated;
  await saveSleepNotes(next);
  return updated;
}

export async function getSleepNoteById(
  id: string
): Promise<SleepNote | null> {
  const notes = await getSleepNotes();

  return notes.find((note) => note.id === id) ?? null;
}

export async function findRelevantSleepNoteId(
  dreamTime: Date
): Promise<string | undefined> {
  const notes = await getSleepNotes();
  const dreamTimestamp = dreamTime.getTime();
  const maximumDifference = 36 * 60 * 60 * 1000;

  const relevantNote = notes.find((note) => {
    const noteTimestamp = new Date(note.createdAt).getTime();
    const difference = dreamTimestamp - noteTimestamp;

    return difference >= 0 && difference <= maximumDifference;
  });

  return relevantNote?.id;
}
