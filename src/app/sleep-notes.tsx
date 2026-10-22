import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DreamBottomNav } from '../components/dream-bottom-nav';
import { dreamTheme as c } from '../constants/dream-theme';
import { createSleepNote, deleteSleepNote, getSleepNotes, updateSleepNote, type SleepNote } from '../lib/sleep-storage';

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '时间未知' : date.toLocaleString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function SleepNotesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ edit?: string | string[] }>();
  const [notes, setNotes] = useState<SleepNote[]>([]);
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<string | undefined>();
  const [intensity, setIntensity] = useState(3);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const categories = ['工作学习', '人际关系', '情绪压力', '重要选择', '期待愿望', '其他'] as const;
  const editId = Array.isArray(params.edit) ? params.edit[0] : params.edit;

  const load = useCallback(async () => {
    const saved = await getSleepNotes();
    setNotes(saved);
    if (editId && editId !== editingId) {
      const note = saved.find((item) => item.id === editId);
      if (note) {
        setEditingId(note.id);
        setContent(note.content);
        setCategory(note.category);
        setIntensity(note.intensity);
      }
    }
  }, [editId, editingId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const resetForm = () => {
    setEditingId(null); setContent(''); setCategory(undefined); setIntensity(3); setError('');
    router.setParams({ edit: undefined });
  };

  const save = async () => {
    if (!content.trim()) { setError('先写下一件此刻正在牵挂的事。'); return; }
    try {
      setBusy(true); setError('');
      const draft = { content, category: category as SleepNote['category'], intensity };
      if (editingId) {
        await updateSleepNote(editingId, draft);
      } else await createSleepNote(draft);
      resetForm(); await load();
    } catch (e) { setError(e instanceof Error ? e.message : '保存失败，请重试'); }
    finally { setBusy(false); }
  };

  const remove = (note: SleepNote) => Alert.alert('删除这条睡前记录？', '删除后无法恢复。', [
    { text: '取消', style: 'cancel' },
    { text: '删除', style: 'destructive', onPress: async () => { await deleteSleepNote(note.id); await load(); if (editingId === note.id) resetForm(); } },
  ]);

  return <View style={styles.screen}>
    <StatusBar style="dark" />
    <ScrollView contentContainerStyle={[styles.page, { paddingTop: Math.max(insets.top, 18) + 12 }]} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Pressable onPress={() => router.replace('/')}><Text style={styles.back}>‹</Text></Pressable>
        <Text style={styles.brand}>BEFORE SLEEP</Text><View style={{ width: 28 }} />
      </View>
      <Text style={styles.title}>睡前，放下一点心事</Text>
      <Text style={styles.subtitle}>记下此刻的牵挂、期待或心情。它只是你的记录，不需要写得完整。</Text>

      <View style={styles.form}>
        <Text style={styles.label}>{editingId ? '编辑记录' : '此刻你在想什么？'}</Text>
        <TextInput multiline value={content} onChangeText={setContent} placeholder="例如：明天要做的汇报让我有些紧张……" placeholderTextColor={c.muted} style={styles.input} />
        <Text style={styles.label}>大致属于哪一类？</Text>
        <View style={styles.chips}>{categories.map((item) => <Pressable key={item} onPress={() => setCategory(category === item ? undefined : item)} style={[styles.chip, category === item && styles.chipSelected]}><Text style={[styles.chipText, category === item && styles.chipTextSelected]}>{item}</Text></Pressable>)}</View>
        <Text style={styles.label}>它现在占据你多少注意力？　{intensity}/5</Text>
        <View style={styles.scale}>{[1, 2, 3, 4, 5].map((n) => <Pressable key={n} onPress={() => setIntensity(n)} style={[styles.scaleButton, intensity === n && styles.scaleSelected]}><Text style={[styles.scaleText, intensity === n && styles.scaleTextSelected]}>{n}</Text></Pressable>)}</View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.actions}>
          {editingId ? <Pressable onPress={resetForm} style={styles.cancel}><Text style={styles.cancelText}>取消编辑</Text></Pressable> : null}
          <Pressable disabled={busy} onPress={() => void save()} style={[styles.save, busy && { opacity: 0.6 }]}><Text style={styles.saveText}>{busy ? '保存中…' : editingId ? '保存修改' : '保存睡前记录'}</Text></Pressable>
        </View>
      </View>

      <View style={styles.listHeader}><Text style={styles.sectionTitle}>过往的睡前记录</Text><Text style={styles.count}>{notes.length} 条</Text></View>
      {notes.length ? notes.map((note) => <View key={note.id} style={styles.note}>
        <View style={styles.noteMeta}><Text style={styles.date}>{formatDate(note.createdAt)}</Text><Text style={styles.category}>{note.category || '未分类'}</Text></View>
        <Text style={styles.noteText}>{note.content}</Text>
        <Text style={styles.intensity}>当时的关注程度：{note.intensity}/5</Text>
        <View style={styles.noteActions}><Pressable onPress={() => { setEditingId(note.id); setContent(note.content); setCategory(note.category); setIntensity(note.intensity); }}><Text style={styles.link}>编辑</Text></Pressable><Pressable onPress={() => remove(note)}><Text style={styles.delete}>删除</Text></Pressable></View>
      </View>) : <View style={styles.empty}><Text style={styles.emptyTitle}>还没有睡前记录</Text><Text style={styles.emptyText}>可以先写下一件最近常放在心上的事。</Text></View>}
      <Text style={styles.privacy}>记录只保存在这台设备中。之后可和醒来后的梦境并排回顾。</Text>
    </ScrollView>
    <DreamBottomNav active="home" />
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background }, page: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 22, paddingBottom: 30 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { color: c.primaryDark, fontSize: 34 }, brand: { color: c.primaryDark, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  title: { color: c.text, fontSize: 26, fontWeight: '700', marginTop: 27 }, subtitle: { color: c.muted, fontSize: 14, lineHeight: 22, marginTop: 9 },
  form: { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 22, padding: 18, marginTop: 22 }, label: { color: c.text, fontSize: 14, fontWeight: '700', marginTop: 11, marginBottom: 10 },
  input: { minHeight: 118, maxHeight: 220, textAlignVertical: 'top', backgroundColor: c.background, borderColor: c.border, borderWidth: 1, borderRadius: 14, padding: 13, color: c.text, fontSize: 14, lineHeight: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { borderColor: c.border, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 18 }, chipSelected: { backgroundColor: c.surfaceSoft, borderColor: c.primary }, chipText: { color: c.muted, fontSize: 12 }, chipTextSelected: { color: c.primaryDark, fontWeight: '700' },
  scale: { flexDirection: 'row', gap: 10 }, scaleButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background }, scaleSelected: { backgroundColor: c.primary }, scaleText: { color: c.muted, fontWeight: '600' }, scaleTextSelected: { color: '#fff' },
  error: { color: c.error, marginTop: 10, fontSize: 13 }, actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 }, save: { backgroundColor: c.primaryDark, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 13 }, saveText: { color: '#fff', fontWeight: '700' }, cancel: { paddingHorizontal: 12, justifyContent: 'center' }, cancelText: { color: c.muted },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 12 }, sectionTitle: { color: c.text, fontSize: 18, fontWeight: '700' }, count: { color: c.muted, fontSize: 12 },
  note: { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 10 }, noteMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, date: { color: c.muted, fontSize: 12 }, category: { color: c.primaryDark, backgroundColor: c.surfaceSoft, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, fontSize: 11 }, noteText: { color: c.text, fontSize: 14, lineHeight: 22, marginTop: 12 }, intensity: { color: c.muted, fontSize: 12, marginTop: 10 }, noteActions: { flexDirection: 'row', gap: 20, justifyContent: 'flex-end', marginTop: 12 }, link: { color: c.primaryDark, fontSize: 13, fontWeight: '600' }, delete: { color: c.error, fontSize: 13 },
  empty: { borderColor: c.border, borderWidth: 1, borderRadius: 18, backgroundColor: c.surface, padding: 20 }, emptyTitle: { color: c.text, fontWeight: '700' }, emptyText: { color: c.muted, fontSize: 13, marginTop: 7 }, privacy: { color: c.muted, fontSize: 11, lineHeight: 18, textAlign: 'center', marginTop: 18 },
});
