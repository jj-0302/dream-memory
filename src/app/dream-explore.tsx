import { useCallback, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnalysisContent } from '../components/analysis-content';
import { dreamTheme as c } from '../constants/dream-theme';
import { saveDreamAnalysis } from '../lib/analysis-storage';
import { answerExploration, deleteExploration, EXPLORATION_CONSENT_KEY, getExploration, supplementExploration, updateExploration, type Exploration } from '../lib/exploration-storage';
import { requestExploration, type ExplorationAction } from '../lib/remote-exploration';

function confirmAction(title: string, message: string, accept: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(title + '\n\n' + message));
  return new Promise(resolve => Alert.alert(title, message, [{ text: '取消', style: 'cancel', onPress: () => resolve(false) }, { text: accept, onPress: () => resolve(true) }], { cancelable: true, onDismiss: () => resolve(false) }));
}
export default function DreamExploreScreen() {
  const params = useLocalSearchParams<{ explorationId?: string | string[] }>();
  const id = Array.isArray(params.explorationId) ? params.explorationId[0] : params.explorationId;
  const insets = useSafeAreaInsets();
  const [session, setSession] = useState<Exploration | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const lock = useRef(false);
  const lastSave = useRef<Promise<unknown>>(Promise.resolve());
  useFocusEffect(useCallback(() => {
    let active = true;
    const load = async () => {
      try {
        if (!id) throw new Error('缺少探索编号');
        const saved = await getExploration(id);
        if (!saved) throw new Error('这次探索已被删除或不存在');
        if (saved.finalAnalysis) await saveDreamAnalysis(saved.dreamId, saved.finalAnalysis, saved.finalAnalysis.id);
        if (active) { setSession(saved); setDraft(saved.draft); }
      } catch (e) { if (active) setError(e instanceof Error ? e.message : '读取探索失败'); }
      finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [id]));
  const saveDraft = (value: string) => {
    setDraft(value);
    if (!id || lock.current) return;
    lastSave.current = updateExploration(id, item => ({ ...item, draft: value }));
    void lastSave.current.catch(() => setError('草稿保存失败，请重试后再离开'));
  };
  const allowSend = async () => {
    if (await AsyncStorage.getItem(EXPLORATION_CONSENT_KEY) === 'accepted') return true;
    const accepted = await confirmAction('探索对话将发送给 AI 服务', '本次仅发送这条梦境、关联的睡前记录（如有）、初步分析、你的反馈和本次对话，由配置的服务端和 AI 服务商处理。对话也保存在本机，并包含在本地备份中。是否继续？', '同意并继续');
    if (accepted) await AsyncStorage.setItem(EXPLORATION_CONSENT_KEY, 'accepted');
    return accepted;
  };
  const run = async (action: ExplorationAction) => {
    if (!id || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      await lastSave.current;
      if (!await allowSend()) return;
      let current = await getExploration(id);
      if (!current) throw new Error('这次探索已被删除');
      if (action === 'swap' && current.draft.trim()) throw new Error('换问前请先提交或清空当前草稿，避免丢失你的补充');
      if (action !== 'swap' && current.draft.trim()) {
        current = current.currentQuestion
          ? await answerExploration(id, current.currentQuestion.id, current.draft)
          : await supplementExploration(id, current.draft);
        setSession(current); setDraft(''); setAdding(false);
      } else if (action === 'question' && current.currentQuestion) {
        throw new Error('请先回答，也可以选择“不确定”或“不想回答”');
      }
      if (action === 'question' && current.round >= 4) { setSession(current); return; }
      const result = await requestExploration(id, action);
      setSession(result); setDraft(result.draft);
      if (action === 'finalize') setShowTranscript(false);
    } catch (e) {
      const saved = await getExploration(id).catch(() => null);
      if (saved) { setSession(saved); setDraft(saved.draft); }
      setError(e instanceof Error ? e.message : '暂时无法继续，已保存的内容仍在本机');
    }
    finally { lock.current = false; setBusy(false); }
  };
  const saveSupplement = async () => {
    if (!id || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await lastSave.current; const result = await supplementExploration(id, draft); setSession(result); setDraft(''); setAdding(false); }
    catch (e) { setError(e instanceof Error ? e.message : '补充保存失败'); }
    finally { lock.current = false; setBusy(false); }
  };
  const exit = async () => {
    if (!id || !session || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await lastSave.current; await updateExploration(id, item => ({ ...item, status: item.status === 'completed' ? 'completed' : 'paused' })); router.replace({ pathname: '/dream-analysis', params: { id: session.dreamId } }); }
    catch { setError('保存失败，请重试；当前页面仍保留你的内容'); lock.current = false; setBusy(false); }
  };
  const remove = async () => {
    if (!id || !session || lock.current) return;
    if (!await confirmAction('删除本次探索？', '本次对话、反馈及由此生成的深度分析将从本机删除，原始梦境和初步分析保留。已导出的备份不受影响。', '删除')) return;
    lock.current = true; setBusy(true);
    try { await lastSave.current; await deleteExploration(id); router.replace({ pathname: '/dream-analysis', params: { id: session.dreamId } }); }
    catch { setError('删除失败，请重试'); lock.current = false; setBusy(false); }
  };
  if (loading) return <View style={styles.center}><Text style={styles.hint}>正在恢复本机探索…</Text></View>;
  if (!session) return <View style={styles.center}><Text style={styles.error}>{error || '没有找到探索'}</Text><Pressable onPress={() => router.replace('/history')}><Text style={styles.link}>返回梦境历史</Text></Pressable></View>;
  const question = session.currentQuestion;
  const exhausted = session.round >= 4 && !question;
  return <View style={styles.screen}>
    <StatusBar style="dark" />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.page, { paddingTop: Math.max(insets.top, 18) + 10 }]}>
      <View style={styles.header}><Pressable disabled={busy} onPress={() => void exit()}><Text style={styles.link}>‹ 保存返回</Text></Pressable><Text style={styles.hint}>引导式探索</Text></View>
      <Text style={styles.title}>{session.dreamSnapshot.title || '一起多理解一点这个梦'}</Text>
      <Text style={styles.hint}>已提问 {session.round}/4 轮。换一个问题也使用一轮额度；达到上限后不再主动追问。</Text>
      <Text style={styles.hint}>沿用开始探索时的记录。你的回答、草稿和反馈会保存在本机。</Text>
      {session.finalAnalysis ? <View><Text style={styles.notice}>已保存的深度分析{session.status !== 'completed' ? '（新增反馈或补充后可重新生成）' : ''}</Text><AnalysisContent key={session.finalAnalysis.id} analysis={session.finalAnalysis} /></View> : null}
      {session.finalAnalysis ? <Pressable accessibilityRole="button" accessibilityState={{ expanded: showTranscript }} onPress={() => setShowTranscript(value => !value)} style={styles.card}><Text style={styles.link}>{showTranscript ? '收起探索对话' : '查看探索对话'}</Text></Pressable> : null}
      {(!session.finalAnalysis || showTranscript) ? <View>
      {session.messages.filter(message => message.kind !== 'question' || message.questionId !== question?.id).map(message => <View key={message.id} style={[styles.message, message.role === 'user' && styles.userMessage]}>
        <Text style={styles.label}>{message.kind === 'question' ? 'AI 提问' : message.kind === 'skipped' ? '已换问' : message.kind === 'supplement' ? '你的补充' : '你的回答'}</Text><Text style={styles.body}>{message.text}</Text>
      </View>)}
      </View> : null}
      {question ? <View style={styles.card}>
        <Text style={styles.heading}>第 {session.round} 轮</Text><Text style={styles.body}>{question.text}</Text>
        <View style={styles.options}>{[...question.options, '不确定', '不想回答'].map(option => <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: draft === option }} disabled={busy} onPress={() => saveDraft(option)} style={[styles.choice, draft === option && styles.selected]}><Text style={styles.choiceText}>{option}</Text></Pressable>)}</View>
        <TextInput accessibilityLabel="本轮回答" multiline editable={!busy} maxLength={2000} value={draft} onChangeText={saveDraft} placeholder="也可以用自己的话回答，或补充参考选项…" placeholderTextColor={c.muted} style={styles.input} />
      </View> : !session.finalAnalysis && !exhausted ? <View style={styles.card}><Text style={styles.body}>准备好后点“继续深入”，AI 会根据记录和反馈问一个问题。也可以直接生成深度分析。</Text></View> : null}
      {exhausted && !session.finalAnalysis ? <Text style={styles.notice}>4 轮已结束，AI 不会再主动提问。你可以生成深度分析、自行补充或保存退出。</Text> : null}
      {(adding || (!question && !!draft)) ? <View style={styles.card}><Text style={styles.heading}>再补充一件事</Text><TextInput accessibilityLabel="自行补充的信息" multiline editable={!busy} maxLength={2000} value={draft} onChangeText={saveDraft} placeholder="可以写现实背景、个人联想或对解释的纠正…" placeholderTextColor={c.muted} style={styles.input} /><Pressable disabled={busy || !draft.trim()} onPress={() => void saveSupplement()}><Text style={styles.link}>保存这条补充</Text></Pressable></View> : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {busy ? <Text accessibilityLiveRegion="polite" style={styles.hint}>正在整理，请稍候；已有回答已保存在本机…</Text> : null}

      <Pressable disabled={busy} onPress={() => void remove()} style={styles.delete}><Text style={styles.error}>删除本次探索</Text></Pressable>
    </ScrollView>
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.actions}>
        {!exhausted && !session.finalAnalysis ? <Action label="继续深入" disabled={busy} onPress={() => void run('question')} /> : null}
        {!exhausted && !session.finalAnalysis ? <Action label="换一个问题" disabled={busy || !question || session.round >= 4} onPress={() => void run('swap')} secondary /> : null}
        <Action label={session.finalAnalysis ? '重新生成深度分析' : '生成深度分析'} disabled={busy} onPress={() => void run('finalize')} />
        {(exhausted || !!session.finalAnalysis) && !question ? <Action label="再补充一件事" disabled={busy} onPress={() => setAdding(true)} secondary /> : null}
        <Action label="保存并退出" disabled={busy} onPress={() => void exit()} secondary />
      </View>
    </View>
  </View>;
}
function Action({ label, disabled, onPress, secondary = false }: { label: string; disabled: boolean; onPress: () => void; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.action, secondary && styles.secondary, disabled && styles.disabled]}><Text style={[styles.actionText, secondary && styles.secondaryText]}>{label}</Text></Pressable>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background }, center: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },
  page: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 22, paddingBottom: 48 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: c.text, fontSize: 25, lineHeight: 34, fontWeight: '700', marginTop: 24 }, heading: { color: c.text, fontSize: 17, fontWeight: '700', marginBottom: 12 },
  hint: { color: c.muted, fontSize: 12, lineHeight: 20, marginTop: 10 }, body: { color: c.text, fontSize: 15, lineHeight: 25 }, label: { color: c.primaryDark, fontSize: 11, marginBottom: 8 },
  message: { padding: 16, borderRadius: 18, backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, marginTop: 14, marginRight: 18 }, userMessage: { backgroundColor: c.surfaceSoft, marginRight: 0, marginLeft: 18 },
  card: { padding: 18, borderRadius: 20, backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, marginTop: 22 }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 15 },
  choice: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 18, borderColor: c.border, borderWidth: 1 }, selected: { backgroundColor: c.surfaceMint, borderColor: c.primary }, choiceText: { color: c.primaryDark, fontSize: 13 },
  input: { minHeight: 120, textAlignVertical: 'top', color: c.text, fontSize: 15, lineHeight: 24, backgroundColor: c.surfaceSoft, borderRadius: 14, padding: 14, marginTop: 16 },
  notice: { color: c.primaryDark, backgroundColor: c.surfaceSoft, padding: 16, borderRadius: 16, fontSize: 13, lineHeight: 22, marginTop: 22 }, link: { color: c.primaryDark, fontSize: 14, marginTop: 10 },
  footer: { paddingHorizontal: 22, paddingTop: 10, backgroundColor: c.background, borderTopWidth: 1, borderTopColor: c.border },
  actions: { width: '100%', maxWidth: 676, alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 0 }, action: { flexGrow: 1, flexBasis: '45%', borderRadius: 14, paddingVertical: 15, paddingHorizontal: 12, backgroundColor: c.primaryDark, alignItems: 'center' },
  secondary: { backgroundColor: c.surfaceSoft, borderColor: c.border, borderWidth: 1 }, actionText: { color: '#fff', fontSize: 13, fontWeight: '700' }, secondaryText: { color: c.primaryDark }, disabled: { opacity: 0.45 },
  error: { color: c.error, fontSize: 13, lineHeight: 22, marginTop: 15 }, delete: { alignItems: 'center', padding: 18, marginTop: 16 },
});
