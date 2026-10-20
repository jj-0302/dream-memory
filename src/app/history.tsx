import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DreamBottomNav } from '../components/dream-bottom-nav';
import { dreamTheme as c } from '../constants/dream-theme';
import { getDreamRecords, type DreamRecord } from '../lib/dream-storage';

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '记录时间未知';
  return date.toLocaleString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [records, setRecords] = useState<DreamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        try {
          setLoading(true);
          setFailed(false);
          const saved = await getDreamRecords();
          if (active) setRecords(saved);
        } catch {
          if (active) setFailed(true);
        } finally {
          if (active) setLoading(false);
        }
      };
      void load();
      return () => { active = false; };
    }, [])
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.page, { paddingTop: Math.max(insets.top, 18) + 14 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>DREAM ARCHIVE</Text>
        <Text style={styles.title}>我的梦境</Text>
        <Text style={styles.subtitle}>每一个片段，都有自己的位置。</Text>

        <View style={styles.summary}>
          <View>
            <Text style={styles.summaryNumber}>{records.length}</Text>
            <Text style={styles.summaryText}>已收藏的梦境</Text>
          </View>
          <Text style={styles.summarySymbol}>☾</Text>
        </View>

        <View style={styles.listHeading}>
          <Text style={styles.listTitle}>全部记录</Text>
          <Text style={styles.countText}>{records.length} 条</Text>
        </View>

        {loading ? <Text style={styles.stateText}>正在读取梦境记录…</Text> : null}
        {!loading && failed ? (
          <Text style={styles.errorText}>暂时无法读取记录，请稍后重试。</Text>
        ) : null}
        {!loading && !failed && records.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>这里还没有梦境</Text>
            <Text style={styles.emptyText}>醒来后留下一句话，开始你的梦境档案。</Text>
          </View>
        ) : null}

        {!loading && !failed && records.map((record) => (
          <Pressable
            key={record.id}
            onPress={() => router.push({ pathname: '/dream-detail', params: { id: record.id } })}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <View style={styles.cardMeta}>
              <Text style={styles.date}>{formatDate(record.createdAt)}</Text>
              <Text style={styles.type}>{record.inputType === 'voice' ? '语音' : '文字'}</Text>
            </View>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {record.title?.trim() || (record.inputType === 'voice' ? '一段语音梦境' : '未命名的梦')}
            </Text>
            <Text style={styles.content} numberOfLines={2}>{record.content}</Text>
            {record.mood || record.tags?.length ? (
              <View style={styles.tagRow}>
                {record.mood ? <Text style={styles.tag}>{record.mood}</Text> : null}
                {record.tags?.slice(0, 2).map((tag) => (
                  <Text key={tag} style={styles.tag}>{tag}</Text>
                ))}
              </View>
            ) : null}
            <Text style={styles.detailLink}>查看详情  ↗</Text>
          </Pressable>
        ))}

        <Pressable
          onPress={() => router.push('/text-entry')}
          style={({ pressed }) => [styles.newButton, pressed && styles.pressed]}
        >
          <Text style={styles.newButtonText}>＋  记录一个新梦</Text>
        </Pressable>
      </ScrollView>
      <DreamBottomNav active="history" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  scroll: { flex: 1 },
  page: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 24, paddingBottom: 32 },
  kicker: { color: c.primaryDark, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  title: { color: c.text, fontSize: 31, fontWeight: '700', marginTop: 18 },
  subtitle: { color: c.muted, fontSize: 14, marginTop: 9 },
  summary: { marginTop: 26, backgroundColor: c.surfaceMint, minHeight: 126, padding: 22, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' },
  summaryNumber: { color: c.primaryDark, fontSize: 35, fontWeight: '700' },
  summaryText: { color: '#55786C', fontSize: 13, marginTop: 5 },
  summarySymbol: { color: '#91CEB8', fontSize: 74, marginRight: 15 },
  listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 31, marginBottom: 16 },
  listTitle: { color: c.text, fontSize: 19, fontWeight: '700' },
  countText: { color: c.muted, fontSize: 12 },
  stateText: { color: c.muted, fontSize: 13, padding: 20, textAlign: 'center' },
  errorText: { color: c.error, fontSize: 13, padding: 20, textAlign: 'center' },
  emptyCard: { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 22, padding: 24 },
  emptyTitle: { color: c.text, fontSize: 16, fontWeight: '700' },
  emptyText: { color: c.muted, fontSize: 13, lineHeight: 21, marginTop: 8 },
  card: { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 22, padding: 19, marginBottom: 12 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { color: c.muted, fontSize: 12 },
  type: { color: c.primaryDark, fontSize: 11, backgroundColor: c.surfaceSoft, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10 },
  cardTitle: { color: c.text, fontSize: 17, fontWeight: '700', marginTop: 11 },
  content: { color: '#66827A', fontSize: 13, lineHeight: 21, marginTop: 7 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 13 },
  tag: { color: c.primaryDark, backgroundColor: c.surfaceSoft, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5, fontSize: 11 },
  detailLink: { color: c.primaryDark, fontSize: 12, fontWeight: '600', marginTop: 16 },
  newButton: { marginTop: 13, minHeight: 52, borderRadius: 17, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
  newButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.7 },
});
