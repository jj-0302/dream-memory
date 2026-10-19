import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getDreamRecords,
  type DreamRecord,
} from './dream-storage';
import {
  getSleepNotes,
  type SleepNote,
} from './sleep-storage';

const APP_KEY_PREFIX = 'dream-memory:';
const DREAM_RECORDS_KEY = 'dream-memory:records:v1';
const SLEEP_NOTES_KEY = 'dream-memory:sleep-notes:v1';

export type LocalDataSummary = {
  dreamCount: number;
  textDreamCount: number;
  voiceDreamCount: number;
  sleepNoteCount: number;
  storageKeyCount: number;
};

export type DreamMemoryBackup = {
  app: 'dream-memory';
  version: 1;
  exportedAt: string;
  data: Record<string, string>;
};

export type BackupPreview = LocalDataSummary & {
  exportedAt: string;
};

function countArrayFromValue(value?: string): number {
  if (!value) {
    return 0;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

function getDreamsFromValue(value?: string): DreamRecord[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function getLocalDataSummary(): Promise<LocalDataSummary> {
  const [dreams, sleepNotes, allKeys] = await Promise.all([
    getDreamRecords(),
    getSleepNotes(),
    AsyncStorage.getAllKeys(),
  ]);

  return {
    dreamCount: dreams.length,
    textDreamCount: dreams.filter(
      (dream) => dream.inputType === 'text'
    ).length,
    voiceDreamCount: dreams.filter(
      (dream) => dream.inputType === 'voice'
    ).length,
    sleepNoteCount: sleepNotes.length,
    storageKeyCount: allKeys.filter((key) =>
      key.startsWith(APP_KEY_PREFIX)
    ).length,
  };
}

export async function createBackup(): Promise<DreamMemoryBackup> {
  const allKeys = await AsyncStorage.getAllKeys();
  const appKeys = allKeys.filter((key) =>
    key.startsWith(APP_KEY_PREFIX)
  );

  const storedPairs = await AsyncStorage.multiGet(appKeys);
  const data: Record<string, string> = {};

  storedPairs.forEach(([key, value]) => {
    if (value !== null) {
      data[key] = value;
    }
  });

  return {
    app: 'dream-memory',
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function serializeBackup(
  backup: DreamMemoryBackup
): string {
  return JSON.stringify(backup, null, 2);
}

export function parseBackup(text: string): DreamMemoryBackup {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('无法读取备份文件，请确认它是 JSON 文件');
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('app' in parsed) ||
    !('version' in parsed) ||
    !('exportedAt' in parsed) ||
    !('data' in parsed)
  ) {
    throw new Error('这不是有效的 Dream Memory 备份文件');
  }

  const backup = parsed as Partial<DreamMemoryBackup>;

  if (
    backup.app !== 'dream-memory' ||
    backup.version !== 1 ||
    typeof backup.exportedAt !== 'string' ||
    typeof backup.data !== 'object' ||
    backup.data === null
  ) {
    throw new Error('备份文件格式或版本不受支持');
  }

  const cleanData: Record<string, string> = {};

  Object.entries(backup.data).forEach(([key, value]) => {
    if (
      key.startsWith(APP_KEY_PREFIX) &&
      typeof value === 'string'
    ) {
      cleanData[key] = value;
    }
  });

  if (Object.keys(cleanData).length === 0) {
    throw new Error('备份文件中没有可恢复的数据');
  }

  return {
    app: 'dream-memory',
    version: 1,
    exportedAt: backup.exportedAt,
    data: cleanData,
  };
}

export function getBackupPreview(
  backup: DreamMemoryBackup
): BackupPreview {
  const dreams = getDreamsFromValue(
    backup.data[DREAM_RECORDS_KEY]
  );

  return {
    exportedAt: backup.exportedAt,
    dreamCount: dreams.length,
    textDreamCount: dreams.filter(
      (dream) => dream.inputType === 'text'
    ).length,
    voiceDreamCount: dreams.filter(
      (dream) => dream.inputType === 'voice'
    ).length,
    sleepNoteCount: countArrayFromValue(
      backup.data[SLEEP_NOTES_KEY]
    ),
    storageKeyCount: Object.keys(backup.data).length,
  };
}

export async function restoreBackup(
  backup: DreamMemoryBackup
): Promise<void> {
  const allKeys = await AsyncStorage.getAllKeys();
  const currentAppKeys = allKeys.filter((key) =>
    key.startsWith(APP_KEY_PREFIX)
  );

  if (currentAppKeys.length > 0) {
    await AsyncStorage.multiRemove(currentAppKeys);
  }

  const entries = Object.entries(backup.data);

  if (entries.length > 0) {
    await AsyncStorage.multiSet(entries);
  }
}

export async function clearAllLocalData(): Promise<void> {
  const allKeys = await AsyncStorage.getAllKeys();
  const appKeys = allKeys.filter((key) =>
    key.startsWith(APP_KEY_PREFIX)
  );

  if (appKeys.length > 0) {
    await AsyncStorage.multiRemove(appKeys);
  }
}