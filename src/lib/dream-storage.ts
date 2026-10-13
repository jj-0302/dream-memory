import AsyncStorage from '@react-native-async-storage/async-storage';

export const DREAM_DRAFT_KEY = 'dream-memory:text-draft:v1';

const DREAM_RECORDS_KEY = 'dream-memory:records:v1';

export type DreamRecord = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  inputType: 'text' | 'voice';
};

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

  const now = new Date().toISOString();

  const newRecord: DreamRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    content: cleanContent,
    createdAt: now,
    updatedAt: now,
    inputType: 'text',
  };

  const currentRecords = await getDreamRecords();
  const nextRecords = [newRecord, ...currentRecords];

  await saveDreamRecords(nextRecords);
  await clearDreamDraft();

  return newRecord;
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