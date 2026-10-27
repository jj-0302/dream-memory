import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { AnalysisContent } from './analysis-content';
import { dreamTheme as c } from '../constants/dream-theme';
import type { DreamAnalysis } from '../lib/analysis-storage';
import type { DreamRecord } from '../lib/dream-storage';
import type { SleepNote } from '../lib/sleep-storage';
import { getExploration, getOrCreateExploration, saveExplorationFeedback, type Exploration, type ExplorationFeedback, type InterpretationRating, type UnderstandingRating } from '../lib/exploration-storage';

const understandingRatings: UnderstandingRating[] = ['理解得差不多', '有些地方不对', '我想补充细节'];
const interpretationRatings: InterpretationRating[] = ['很像我的情况', '有一点像', '不太像', '完全不相关', '不确定'];
export function AnalysisExperience({ dream, analysis, sleepNote }: { dream: DreamRecord; analysis: DreamAnalysis; sleepNote: SleepNote | null }) {
  const [session, setSession] = useState<Exploration | null>(null);
  const [detail, setDetail] = useState('');
  const [error, setError] = useState('');
  const entering = useRef(false);
  useFocusEffect(useCallback(() => {
    let active = true;
    (analysis.explorationId ? getExploration(analysis.explorationId) : getOrCreateExploration(dream, analysis, sleepNote)).then(item => { if (!item) throw new Error('探索已被删除'); if (active) { setSession(item); setDetail(item.feedback.detail); } }).catch(() => { if (active) setError('读取探索反馈失败，请稍后重试'); });
    return () => { active = false; };
  }, [dream, analysis, sleepNote]));
  const save = async (change: (feedback: ExplorationFeedback) => ExplorationFeedback) => {
    if (!session) return;
    try { setError(''); setSession(await saveExplorationFeedback(session.id, change)); }
    catch { setError('反馈保存失败，请重试后再离开'); }
  };
  const enter = async () => {
    if (!session || entering.current) return;
    entering.current = true;
    try {
      // Flush the visible correction before navigation, including a previous failed autosave.
      await saveExplorationFeedback(session.id, feedback => ({ ...feedback, detail }));
      router.push({ pathname: './dream-explore', params: { explorationId: session.id } });
    } catch { setError('反馈尚未保存，暂未进入探索；请重试'); }
    finally { entering.current = false; }
  };
  return <View>
    <AnalysisContent analysis={analysis}
      understandingFeedback={session ? <View style={styles.feedback}>
        <Text style={styles.hint}>这份理解贴近你的感受吗？反馈会用于后续探索。</Text>
        <View style={styles.options}>{understandingRatings.map(value => <Choice key={value} label={value} selected={session.feedback.understanding === value} onPress={() => void save(feedback => ({ ...feedback, understanding: value }))} />)}</View>
        <TextInput accessibilityLabel="补充细节或纠正理解" multiline maxLength={2000} value={detail} onChangeText={value => { setDetail(value); void save(feedback => ({ ...feedback, detail: value })); }} placeholder="可以补充或纠正具体细节，暂时不写也可以" placeholderTextColor={c.muted} style={styles.input} />
        <Text style={styles.hint}>反馈和补充保存在本机；只有开始在线探索时才会发送。</Text>
      </View> : <Text style={styles.hint}>正在读取本机反馈…</Text>}
      interpretationFeedback={reading => session ? <View style={styles.options}>{interpretationRatings.map(rating => <Choice key={rating} label={rating} selected={session.feedback.interpretations.find(item => item.id === analysis.id + ':' + reading.id)?.rating === rating} onPress={() => void save(feedback => ({ ...feedback, interpretations: [...feedback.interpretations.filter(item => item.id !== analysis.id + ':' + reading.id), { id: analysis.id + ':' + reading.id, text: reading.interpretation, rating }] }))} />)}</View> : null}
      explorationControls={<View>
        {session && session.dreamSnapshot.updatedAt !== dream.updatedAt ? <Text style={styles.hint}>已有探索保留了开始时的梦境版本；本次继续会沿用该版本。</Text> : null}
        <Pressable accessibilityRole="button" disabled={!session} onPress={() => void enter()} style={[styles.button, !session && styles.disabled]}>
          <Text style={styles.buttonText}>{session?.finalAnalysis ? '查看探索和深度分析' : session?.round ? '继续上次探索' : '开始引导式探索'}</Text>
        </Pressable>
        <Text style={styles.hint}>每次只问一个问题，最多 4 轮；可以随时保存退出。</Text>
      </View>}
    />
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
  </View>;
}
function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.choice, selected && styles.selected]}><Text style={styles.choiceText}>{label}</Text></Pressable>;
}
const styles = StyleSheet.create({
  feedback: { marginTop: 16 }, hint: { color: c.muted, fontSize: 12, lineHeight: 20, marginTop: 9 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 }, choice: { borderWidth: 1, borderColor: c.border, borderRadius: 18, paddingHorizontal: 11, paddingVertical: 9 }, selected: { backgroundColor: c.surfaceMint, borderColor: c.primary }, choiceText: { color: c.primaryDark, fontSize: 12 },
  input: { minHeight: 86, color: c.text, backgroundColor: c.surfaceSoft, borderRadius: 12, padding: 12, marginTop: 12, textAlignVertical: 'top' },
  button: { backgroundColor: c.primaryDark, borderRadius: 14, padding: 15, marginTop: 16 }, buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' }, disabled: { opacity: 0.5 }, error: { color: c.error, marginTop: 12, lineHeight: 21 },
});
