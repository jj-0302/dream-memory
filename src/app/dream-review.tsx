import { useCallback, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dreamTheme as c } from '../constants/dream-theme';
import { ReviewReport } from '../components/review-report';
import { getDreamRecords, type DreamRecord } from '../lib/dream-storage';
import { getSleepNotes, type SleepNote } from '../lib/sleep-storage';
import { createReviewSelection, filterReviewDreams, isValidReviewDream, linkedReviewNotes, MAX_REVIEW_DREAMS, reviewDreamDate, type ReviewRange } from '../lib/review-service';
import { deleteReview, getReviews, saveReview, type DreamReview } from '../lib/review-storage';
import { generateRemoteReview } from '../lib/remote-review';

function confirm(title: string, message: string, accept: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(title + '\n\n' + message));
  return new Promise(resolve => Alert.alert(title, message, [{ text: '取消', style: 'cancel', onPress: () => resolve(false) }, { text: accept, onPress: () => resolve(true) }], { cancelable: true, onDismiss: () => resolve(false) }));
}
export default function DreamReviewScreen() {
  const insets = useSafeAreaInsets();
  const [records, setRecords] = useState<DreamRecord[]>([]);
  const [notes, setNotes] = useState<SleepNote[]>([]);
  const [reviews, setReviews] = useState<DreamReview[]>([]);
  const [range, setRange] = useState<ReviewRange>('7d');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [excludedNotes, setExcludedNotes] = useState<string[]>([]);
  const [associations, setAssociations] = useState('');
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [current, setCurrent] = useState<DreamReview | null>(null);
  const [unsaved, setUnsaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [today, setToday] = useState(() => new Date());
  const lock = useRef(false);
  useFocusEffect(useCallback(() => {
    let active = true;
    const load = async () => {
      try {
        const [dreams, sleepNotes, savedReviews] = await Promise.all([getDreamRecords(), getSleepNotes(), getReviews()]);
        if (!active) return;
        const now = new Date();
        setRecords(dreams); setNotes(sleepNotes); setReviews(savedReviews); setToday(now);
        setSelectedIds(filterReviewDreams(dreams, '7d', now).slice(0, MAX_REVIEW_DREAMS).map(dream => dream.id));
        setRange('7d');
      } catch (e) { if (active) setError(e instanceof Error ? e.message : '读取本机记录失败'); }
      finally { if (active) setLoading(false); }
    };
    void load(); return () => { active = false; };
  }, []));
  const candidates = filterReviewDreams(records, range, today);
  const chosen = candidates.filter(dream => selectedIds.includes(dream.id));
  const linkedNotes = linkedReviewNotes(chosen, notes);
  const noteCount = includeNotes ? linkedNotes.filter(note => !excludedNotes.includes(note.id)).length : 0;
  const selectRange = (next: ReviewRange) => { setRange(next); setSelectedIds(next === 'custom' ? [] : filterReviewDreams(records, next, today).slice(0, MAX_REVIEW_DREAMS).map(dream => dream.id)); setExcludedNotes([]); setError(''); };
  const toggle = (id: string) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(value => value !== id));
    else if (selectedIds.length < MAX_REVIEW_DREAMS) setSelectedIds([...selectedIds, id]);
    else setError('单次最多选择 20 条梦境，可以先取消其他记录');
  };
  const start = async () => {
    if (lock.current || unsaved) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const selection = createReviewSelection(records, notes, range, selectedIds, includeNotes, excludedNotes, associations, today);
      if (!await confirm('确认发送所选记录', '本次将分析' + selection.dreams.length + '条梦境和' + selection.sleepNotes.length + '条睡前记录。\n\n' + (selection.associations ? '你填写的自由联想也会发送。\n' : '') + '这些内容将发送到配置的服务端和 AI 服务商处理，不包含未勾选记录或探索对话。复盘结果和本次记录快照保存在本机，并包含在本地备份中。', '同意并开始复盘')) return;
      const result = await generateRemoteReview(selection, true);
      const review = { id: 'review-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8), createdAt: new Date().toISOString(), selection, result };
      setCurrent(review); setUnsaved(true);
      await saveReview(review); setUnsaved(false); setReviews(await getReviews());
    } catch (e) { setError(e instanceof Error ? e.message : '复盘暂时不可用，请重试'); }
    finally { lock.current = false; setBusy(false); }
  };
  const retrySave = async () => {
    if (!current || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await saveReview(current); setUnsaved(false); setReviews(await getReviews()); }
    catch { setError('保存仍未成功，请保留当前页面后重试'); }
    finally { lock.current = false; setBusy(false); }
  };
  const remove = async (review: DreamReview) => {
    if (lock.current) return;
    lock.current = true;
    try {
      if (!await confirm('删除这次复盘？', '会删除本机保存的复盘结果和记录快照，原始梦境、睡前记录及已导出的备份保留。', '删除')) return;
      setBusy(true); await deleteReview(review.id); setReviews(await getReviews());
      if (current?.id === review.id) { setCurrent(null); setUnsaved(false); }
    } catch { setError('删除失败，请重试'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <View style={styles.screen}>
    <StatusBar style="dark" />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.page, { paddingTop: Math.max(insets.top, 18) + 12 }]}>
      <Pressable disabled={busy || unsaved} onPress={() => router.replace('/')}><Text style={styles.link}>‹ 返回首页</Text></Pressable>
      <Text style={styles.title}>看看这一阶段的梦</Text><Text style={styles.hint}>只发送你勾选的记录，不包含探索对话或其他历史。待转写录音需要先补充有效文字。</Text>
      {loading ? <Text style={styles.hint}>正在读取本机记录…</Text> : <>
        <Text style={styles.hint}>当前有 {records.filter(isValidReviewDream).length} 条有效梦境。单次可选 2～20 条；较少记录只适合观察线索。</Text>
        <View style={styles.options}>{(['7d', '30d', 'custom'] as const).map(value => <Pressable key={value} disabled={busy} accessibilityRole="button" accessibilityState={{ selected: range === value }} onPress={() => selectRange(value)} style={[styles.choice, range === value && styles.selected]}><Text style={styles.choiceText}>{value === '7d' ? '最近7天' : value === '30d' ? '最近30天' : '自定义选择梦境'}</Text></Pressable>)}</View>
        <Text style={styles.heading}>勾选要发送的梦境</Text>
        {candidates.length > 20 ? <Text style={styles.hint}>当前范围有 {candidates.length} 条，最多选 20 条；你可以替换默认勾选的记录。</Text> : null}
        {!candidates.length ? <Text style={styles.hint}>当前范围没有有效梦境，可以换一个范围。</Text> : null}
        {candidates.map(dream => <View key={dream.id} style={styles.card}>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selectedIds.includes(dream.id) }} disabled={busy} onPress={() => toggle(dream.id)}><Text style={styles.label}>{selectedIds.includes(dream.id) ? '☑' : '☐'} {dream.title || '未命名的梦'} · {reviewDreamDate(dream)}</Text><Text style={styles.body} numberOfLines={expandedIds.includes(dream.id) ? undefined : 2}>{dream.content}</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => setExpandedIds(expandedIds.includes(dream.id) ? expandedIds.filter(id => id !== dream.id) : [...expandedIds, dream.id])}><Text style={styles.link}>{expandedIds.includes(dream.id) ? '收起全文' : '查看全文'}</Text></Pressable>
        </View>)}
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: includeNotes }} disabled={busy} onPress={() => setIncludeNotes(!includeNotes)} style={styles.card}><Text style={styles.label}>{includeNotes ? '☑' : '☐'} 包含关联的睡前记录</Text><Text style={styles.hint}>默认不包含。开启后仍可以逐条排除。</Text></Pressable>
        {includeNotes ? linkedNotes.length ? linkedNotes.map(note => <Pressable key={note.id} accessibilityRole="checkbox" accessibilityState={{ checked: !excludedNotes.includes(note.id) }} disabled={busy} onPress={() => setExcludedNotes(excludedNotes.includes(note.id) ? excludedNotes.filter(id => id !== note.id) : [...excludedNotes, note.id])} style={styles.card}><Text style={styles.label}>{excludedNotes.includes(note.id) ? '☐' : '☑'} 睡前记录</Text><Text style={styles.body}>{note.content}</Text></Pressable>) : <Text style={styles.hint}>所选梦境暂时没有可关联的睡前记录。</Text> : null}
        <Text style={styles.heading}>对重复元素，你有什么个人联想？</Text><Text style={styles.hint}>可选。可以写某个人物、场景或行为让你想起什么。这段文字也会随所选记录发送。</Text>
        <TextInput accessibilityLabel="对重复元素的自由联想" editable={!busy} multiline maxLength={2000} value={associations} onChangeText={setAssociations} placeholder="例如：这几次梦里的学校，让我想起最近重新开始学习时的感受…" placeholderTextColor={c.muted} style={styles.input} />
        <Text style={styles.notice}>本次将分析{chosen.length}条梦境和{noteCount}条睡前记录。</Text>
        <Pressable accessibilityRole="button" disabled={busy || unsaved || chosen.length < 2} onPress={() => void start()} style={[styles.button, (busy || unsaved || chosen.length < 2) && styles.disabled]}><Text style={styles.buttonText}>{busy ? '正在整理…' : '确认所选内容并开始复盘'}</Text></Pressable>
      </>}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {unsaved ? <View style={styles.card}><Text style={styles.error}>结果已生成，但尚未成功保存。请先重试保存；不会再次请求 AI。</Text><Pressable disabled={busy} onPress={() => void retrySave()}><Text style={styles.link}>重试保存结果</Text></Pressable></View> : null}
      {current ? <View style={styles.result}><ReviewReport key={current.id} review={current} />{unsaved ? null : <Pressable disabled={busy} onPress={() => void remove(current)}><Text style={styles.error}>删除这次复盘</Text></Pressable>}</View> : null}
      <Text style={styles.heading}>已保存的复盘</Text>
      {!reviews.length ? <Text style={styles.hint}>复盘结果会保存在这里，退出后也能回来查看。</Text> : reviews.map(review => <View key={review.id} style={styles.card}><Pressable disabled={busy || unsaved} onPress={() => { setCurrent(review); setError(''); }}><Text style={styles.label}>{new Date(review.createdAt).toLocaleString('zh-CN')} · {review.selection.dreams.length} 条梦境</Text><Text style={styles.body} numberOfLines={2}>{review.result.overview}</Text><Text style={styles.link}>查看复盘</Text></Pressable><Pressable disabled={busy || unsaved} onPress={() => void remove(review)}><Text style={styles.error}>删除</Text></Pressable></View>)}
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background }, page: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 22, paddingBottom: 48 },
  title: { color: c.text, fontSize: 26, fontWeight: '700', marginTop: 24 }, heading: { color: c.text, fontSize: 18, fontWeight: '700', marginTop: 26, marginBottom: 9 },
  hint: { color: c.muted, fontSize: 12, lineHeight: 21, marginTop: 9 }, label: { color: c.primaryDark, fontSize: 14, fontWeight: '700', marginBottom: 10 }, body: { color: c.text, fontSize: 14, lineHeight: 24 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20 }, choice: { paddingHorizontal: 13, paddingVertical: 11, borderRadius: 18, borderColor: c.border, borderWidth: 1 }, selected: { backgroundColor: c.surfaceMint, borderColor: c.primary }, choiceText: { color: c.primaryDark, fontSize: 13 },
  card: { padding: 17, borderRadius: 18, backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, marginTop: 12 }, input: { minHeight: 110, textAlignVertical: 'top', color: c.text, backgroundColor: c.surfaceSoft, borderRadius: 14, padding: 14, marginTop: 14, fontSize: 14, lineHeight: 23 },
  notice: { color: c.primaryDark, padding: 16, backgroundColor: c.surfaceSoft, borderRadius: 14, fontSize: 14, marginTop: 20 }, button: { backgroundColor: c.primaryDark, padding: 17, borderRadius: 14, marginTop: 14 }, buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' }, disabled: { opacity: 0.45 },
  link: { color: c.primaryDark, fontSize: 13, marginTop: 10 }, error: { color: c.error, fontSize: 13, lineHeight: 22, marginTop: 14 }, result: { marginTop: 28, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.border },
});
