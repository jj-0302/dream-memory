import AsyncStorage from '@react-native-async-storage/async-storage';
import { isReviewResult, type ReviewResult, type ReviewSelection } from './review-service';

export const REVIEWS_KEY = 'dream-memory:reviews:v1';
export type DreamReview = { id: string; createdAt: string; selection: ReviewSelection; result: ReviewResult };
let writes: Promise<unknown> = Promise.resolve();
function exclusive<T>(task: () => Promise<T>): Promise<T> { const next = writes.then(task); writes = next.catch(() => undefined); return next; }
async function readAll(): Promise<DreamReview[]> {
  const raw = await AsyncStorage.getItem(REVIEWS_KEY);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every(item => item && typeof item.id === 'string' && item.selection && Array.isArray(item.selection.dreams) && Array.isArray(item.selection.sleepNotes) && typeof item.selection.associations === 'string' && isReviewResult(item.result, item.selection))) throw new Error('复盘记录格式异常，请先保留备份后再处理');
  return parsed as DreamReview[];
}
export async function getReviews() { await writes; return readAll(); }
export function saveReview(review: DreamReview): Promise<DreamReview> {
  return exclusive(async () => {
    if (!isReviewResult(review.result, review.selection)) throw new Error('复盘结果不完整，无法保存');
    const previous = await readAll();
    const existing = previous.find(item => item.id === review.id);
    if (existing) return existing;
    await AsyncStorage.setItem(REVIEWS_KEY, JSON.stringify([review, ...previous]));
    return review;
  });
}
export function deleteReview(id: string) {
  return exclusive(async () => AsyncStorage.setItem(REVIEWS_KEY, JSON.stringify((await readAll()).filter(item => item.id !== id))));
}
export function deleteDreamReviews(dreamId: string) {
  return exclusive(async () => AsyncStorage.setItem(REVIEWS_KEY, JSON.stringify((await readAll()).filter(item => !item.selection.dreams.some(dream => dream.sourceId === dreamId)))));
}
