import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  getDreamRecords,
  type DreamRecord,
} from '../lib/dream-storage';

export default function HistoryScreen() {
  const router = useRouter();

  const [records, setRecords] = useState<DreamRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadRecords() {
        try {
          setIsLoading(true);
          setLoadFailed(false);

          const savedRecords = await getDreamRecords();

          if (isActive) {
            setRecords(savedRecords);
          }
        } catch {
          if (isActive) {
            setLoadFailed(true);
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      }

      loadRecords();

      return () => {
        isActive = false;
      };
    }, [])
  );

  const formatDreamTime = (dateText: string) => {
    const date = new Date(dateText);

    if (Number.isNaN(date.getTime())) {
      return '记录时间未知';
    }

    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openDream = (record: DreamRecord) => {
    router.push({
      pathname: '/dream-detail',
      params: {
        id: record.id,
      },
    });
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.page}>
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.backButtonText}>‹</Text>
            </Pressable>

            <Text style={styles.headerTitle}>全部梦境</Text>

            <View style={styles.headerSpace} />
          </View>

          <View style={styles.titleArea}>
            <Text style={styles.eyebrow}>DREAM ARCHIVE</Text>
            <Text style={styles.title}>你的梦境记录</Text>

            <Text style={styles.subtitle}>
              每一个仍被记得的片段，都值得被好好保存。
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <View>
              <Text style={styles.summaryNumber}>
                {records.length}
              </Text>
              <Text style={styles.summaryLabel}>已保存梦境</Text>
            </View>

            <View style={styles.summaryMoon}>
              <Text style={styles.summaryMoonText}>☾</Text>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateText}>
                正在读取梦境记录……
              </Text>
            </View>
          ) : null}

          {!isLoading && loadFailed ? (
            <View style={styles.stateCard}>
              <Text style={styles.errorText}>
                暂时无法读取记录，请返回后重试。
              </Text>
            </View>
          ) : null}

          {!isLoading &&
          !loadFailed &&
          records.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>☾</Text>
              <Text style={styles.emptyTitle}>
                这里还没有梦境
              </Text>
              <Text style={styles.emptyDescription}>
                醒来后记下一句话，就能开始建立自己的梦境档案。
              </Text>
            </View>
          ) : null}

          {!isLoading && !loadFailed && records.length > 0 ? (
            <View style={styles.listArea}>
              {records.map((record, index) => (
                <Pressable
                  key={record.id}
                  onPress={() => openDream(record)}
                  style={({ pressed }) => [
                    styles.dreamCard,
                    index > 0 && styles.cardSpacing,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardDateArea}>
                      <Text style={styles.cardDot}>●</Text>
                      <Text style={styles.cardDate}>
                        {formatDreamTime(record.createdAt)}
                      </Text>
                    </View>

                    <Text style={styles.cardArrow}>›</Text>
                  </View>

                  <Text
                    style={styles.cardContent}
                    numberOfLines={4}
                  >
                    {record.content}
                  </Text>

                  <View style={styles.cardFooter}>
                    <Text style={styles.cardType}>
                      {record.inputType === 'voice'
                        ? '语音记录'
                        : '文字记录'}
                    </Text>

                    <Text style={styles.cardHint}>
                      查看详情
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}

          <Pressable
            onPress={() => router.push('/text-entry')}
            style={({ pressed }) => [
              styles.newDreamButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.newDreamIcon}>＋</Text>
            <Text style={styles.newDreamText}>
              记录一个新梦
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#080D1B',
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },

  page: {
    width: '100%',
    maxWidth: 720,
    minHeight: '100%',
    paddingTop: 30,
    paddingHorizontal: 28,
    paddingBottom: 42,
  },

  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111B32',
  },

  backButtonText: {
    color: '#D9E3FA',
    fontSize: 34,
    lineHeight: 36,
    marginTop: -3,
  },

  headerTitle: {
    color: '#E9EDF7',
    fontSize: 16,
    fontWeight: '700',
  },

  headerSpace: {
    width: 44,
    height: 44,
  },

  titleArea: {
    marginTop: 28,
  },

  eyebrow: {
    color: '#7185AD',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },

  title: {
    color: '#F4F6FD',
    fontSize: 29,
    lineHeight: 39,
    fontWeight: '700',
    marginTop: 12,
  },

  subtitle: {
    color: '#8290AA',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 9,
  },

  summaryCard: {
    minHeight: 105,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 26,
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#293B60',
    backgroundColor: '#10192C',
  },

  summaryNumber: {
    color: '#F1F4FC',
    fontSize: 32,
    fontWeight: '700',
  },

  summaryLabel: {
    color: '#71809E',
    fontSize: 12,
    marginTop: 4,
  },

  summaryMoon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#192746',
  },

  summaryMoonText: {
    color: '#B7C8F8',
    fontSize: 31,
  },

  stateCard: {
    marginTop: 20,
    padding: 22,
    borderRadius: 18,
    backgroundColor: '#10192C',
  },

  stateText: {
    color: '#8290AA',
    fontSize: 13,
    textAlign: 'center',
  },

  errorText: {
    color: '#E59090',
    fontSize: 13,
    textAlign: 'center',
  },

  emptyCard: {
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 25,
    paddingVertical: 35,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#253653',
    backgroundColor: '#0E1628',
  },

  emptyIcon: {
    color: '#8196CF',
    fontSize: 34,
  },

  emptyTitle: {
    color: '#E4E9F5',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 15,
  },

  emptyDescription: {
    color: '#71809E',
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 9,
  },

  listArea: {
    marginTop: 20,
  },

  dreamCard: {
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#293B60',
    backgroundColor: '#10192C',
  },

  cardSpacing: {
    marginTop: 14,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  cardDateArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  cardDot: {
    color: '#7898F2',
    fontSize: 8,
    marginRight: 9,
  },

  cardDate: {
    color: '#8192B3',
    fontSize: 12,
  },

  cardArrow: {
    color: '#7285AC',
    fontSize: 27,
    marginLeft: 12,
  },

  cardContent: {
    color: '#E3E8F4',
    fontSize: 15,
    lineHeight: 24,
    marginTop: 15,
  },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 17,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: '#253451',
  },

  cardType: {
    color: '#627493',
    fontSize: 11,
  },

  cardHint: {
    color: '#7898F2',
    fontSize: 11,
  },

  newDreamButton: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    borderRadius: 29,
    backgroundColor: '#526FCA',
  },

  newDreamIcon: {
    color: '#FFFFFF',
    fontSize: 22,
    marginRight: 8,
  },

  newDreamText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.99 }],
  },
});