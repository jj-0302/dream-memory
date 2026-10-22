import AsyncStorage from '@react-native-async-storage/async-storage';
import { findRelevantSleepNoteId } from './sleep-storage';
export const DREAM_DRAFT_KEY = 'dream-memory:text-draft:v1';

const DREAM_RECORDS_KEY = 'dream-memory:records:v1';

export type DreamMood =
  | '平静'
  | '愉快'
  | '紧张'
  | '悲伤'
  | '混乱'
  | '害怕';

export type DreamClarity =
  | '模糊'
  | '零散片段'
  | '比较清晰'
  | '非常清晰';

export type DreamRecord = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  inputType: 'text' | 'voice';

  title?: string;
  mood?: DreamMood;
  clarity?: DreamClarity;
  tags?: string[];
  sleepDate?: string;
  dreamOrder?: number;

  sleepNoteId?: string;

  audioUri?: string;
  audioDurationMillis?: number;
  transcriptStatus?: 'pending' | 'completed' | 'failed';
};

export type DreamMetadata = {
  title: string;
  mood?: DreamMood;
  clarity?: DreamClarity;
  tags: string[];
  dreamOrder: number;
};

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getRecordSleepDate(record: DreamRecord): string {
  if (record.sleepDate) {
    return record.sleepDate;
  }

  return getLocalDateKey(new Date(record.createdAt));
}

async function saveDreamRecords(
  records: DreamRecord[]
): Promise<void> {
  await AsyncStorage.setItem(
    DREAM_RECORDS_KEY,
    JSON.stringify(records)
  );
}

export async function getDreamDraft(): Promise<string> {
  const draft = await AsyncStorage.getItem(DREAM_DRAFT_KEY);
  return draft ?? '';
}

export async function saveDreamDraft(
  content: string
): Promise<void> {
  await AsyncStorage.setItem(DREAM_DRAFT_KEY, content);
}

export async function clearDreamDraft(): Promise<void> {
  await AsyncStorage.removeItem(DREAM_DRAFT_KEY);
}

export async function getDreamRecords(): Promise<DreamRecord[]> {
  const savedRecords = await AsyncStorage.getItem(
    DREAM_RECORDS_KEY
  );

  if (!savedRecords) {
    return [];
  }

  try {
    const records = JSON.parse(savedRecords);

    if (!Array.isArray(records)) {
      return [];
    }

    return records;
  } catch {
    return [];
  }
}

export async function getDreamRecordById(
  id: string
): Promise<DreamRecord | null> {
  const records = await getDreamRecords();

  return records.find((record) => record.id === id) ?? null;
}

export async function completeTextDream(
  content: string
): Promise<DreamRecord> {
  const cleanContent = content.trim();

  if (!cleanContent) {
    throw new Error('梦境内容不能为空');
  }

  const now = new Date();
  const nowText = now.toISOString();
  const sleepDate = getLocalDateKey(now);
  const currentRecords = await getDreamRecords();
  const sleepNoteId = await findRelevantSleepNoteId(now);

  const sameNightDreams = currentRecords.filter(
    (record) => getRecordSleepDate(record) === sleepDate
  );

  const newRecord: DreamRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    content: cleanContent,
    createdAt: nowText,
    updatedAt: nowText,
    inputType: 'text',
    sleepDate,
    sleepNoteId,
    dreamOrder: sameNightDreams.length + 1,
    tags: [],
  };

  await saveDreamRecords([newRecord, ...currentRecords]);
  await clearDreamDraft();

  return newRecord;
}
export async function completeVoiceDream(
  audioUri: string,
  durationMillis: number
): Promise<DreamRecord> {
  if (!audioUri) {
    throw new Error('没有找到录音文件');
  }

  const now = new Date();
  const nowText = now.toISOString();
  const sleepDate = getLocalDateKey(now);
  const currentRecords = await getDreamRecords();
  const sleepNoteId = await findRelevantSleepNoteId(now);

  const sameNightDreams = currentRecords.filter(
    (record) => getRecordSleepDate(record) === sleepDate
  );

  const newRecord: DreamRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    content: '语音梦境记录（等待转写）',
    createdAt: nowText,
    updatedAt: nowText,
    inputType: 'voice',
    sleepDate,
    dreamOrder: sameNightDreams.length + 1,
    tags: [],
    sleepNoteId,
    audioUri,
    audioDurationMillis: durationMillis,
    transcriptStatus: 'pending',
  };

  await saveDreamRecords([newRecord, ...currentRecords]);
  await clearDreamDraft();

  return newRecord;
}
export async function updateDreamMetadata(
  id: string,
  metadata: DreamMetadata
): Promise<DreamRecord> {
  const records = await getDreamRecords();
  const recordIndex = records.findIndex(
    (record) => record.id === id
  );

  if (recordIndex === -1) {
    throw new Error('没有找到这条梦境');
  }

  const updatedRecord: DreamRecord = {
    ...records[recordIndex],
    title: metadata.title.trim(),
    mood: metadata.mood,
    clarity: metadata.clarity,
    tags: metadata.tags,
    dreamOrder: metadata.dreamOrder,
    updatedAt: new Date().toISOString(),
  };

  const nextRecords = [...records];
  nextRecords[recordIndex] = updatedRecord;

  await saveDreamRecords(nextRecords);

  return updatedRecord;
}

export async function updateDreamRecord(
  id: string,
  content: string
): Promise<DreamRecord> {
  const cleanContent = content.trim();

  if (!cleanContent) {
    throw new Error('梦境内容不能为空');
  }

  const records = await getDreamRecords();
  const recordIndex = records.findIndex(
    (record) => record.id === id
  );

  if (recordIndex === -1) {
    throw new Error('没有找到这条梦境');
  }

  const updatedRecord: DreamRecord = {
    ...records[recordIndex],
    content: cleanContent,
    updatedAt: new Date().toISOString(),
  };

  const nextRecords = [...records];
  nextRecords[recordIndex] = updatedRecord;

  await saveDreamRecords(nextRecords);

  return updatedRecord;
}

export async function deleteDreamRecord(
  id: string
): Promise<void> {
  const records = await getDreamRecords();
  const nextRecords = records.filter(
    (record) => record.id !== id
  );

  await saveDreamRecords(nextRecords);
}
