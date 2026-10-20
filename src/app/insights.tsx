import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';

import {
  getDreamInsights,
  type DistributionItem,
  type DreamInsights,
  type InsightRange,
} from '../lib/insight-service';

const RANGE_OPTIONS: Array<{
  value: InsightRange;
  label: string;
}> = [
  {
    value: '7d',
    label: '最近 7 天',
  },
  {
    value: '30d',
    label: '最近 30 天',
  },
  {
    value: 'all',
    label: '全部',
  },
];

type StatCardProps = {
  value: string;
  label: string;
};

function StatCard({ value, label }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

type DistributionSectionProps = {
  title: string;
  emptyText: string;
  items: DistributionItem[];
};

function DistributionSection({
  title,
  emptyText,
  items,
}: DistributionSectionProps) {
  const maximumCount = Math.max(
    ...items.map((item) => item.count),
    1
  );

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {items.length === 0 ? (
        <Text style={styles.emptySectionText}>{emptyText}</Text>
      ) : (
        <View style={styles.distributionList}>
          {items.map((item) => {
            const width = Math.max(
              10,
              (item.count / maximumCount) * 100
            );

            return (
              <View
                key={item.label}
                style={styles.distributionItem}
              >
                <View style={styles.distributionHeader}>
                  <Text style={styles.distributionLabel}>
                    {item.label}
                  </Text>

                  <Text style={styles.distributionCount}>
                    {item.count} 次
                  </Text>
                </View>

                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${width}%` as `${number}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function InsightsScreen() {
  const [range, setRange] =
    useState<InsightRange>('7d');
  const [insights, setInsights] =
    useState<DreamInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadInsights = async () => {
        try {
          setIsLoading(true);
          setErrorMessage('');

          const result = await getDreamInsights(range);

          if (isActive) {
            setInsights(result);
          }
        } catch (error) {
          console.error('读取阶段洞察失败：', error);

          if (isActive) {
            setErrorMessage(
              error instanceof Error
                ? error.message
                : '暂时无法读取阶段洞察'
            );
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      };

      void loadInsights();

      return () => {
        isActive = false;
      };
    }, [range])
  );

  const maximumDailyCount = Math.max(
    ...(insights?.dailyCounts.map(
      (item) => item.count
    ) ?? [1]),
    1
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.page}>
          <View style={styles.header}>
            <Pressable
              onPress={() => router.replace('/')}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.backButtonText}>‹</Text>
            </Pressable>

            <Text style={styles.headerLabel}>DREAM INSIGHTS</Text>

            <View style={styles.headerPlaceholder} />
          </View>

          <Text style={styles.title}>阶段性洞察</Text>

          <Text style={styles.subtitle}>
            从持续记录中观察梦境主题、情绪和睡前关注事项的变化。
          </Text>

          <View style={styles.rangeTabs}>
            {RANGE_OPTIONS.map((option) => {
              const isSelected = option.value === range;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => setRange(option.value)}
                  style={({ pressed }) => [
                    styles.rangeTab,
                    isSelected && styles.rangeTabSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.rangeTabText,
                      isSelected &&
                        styles.rangeTabTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator
                size="small"
                color="#7895F5"
              />
              <Text style={styles.stateText}>
                正在整理这段时间的梦境……
              </Text>
            </View>
          ) : null}

          {!isLoading && errorMessage ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>
                {errorMessage}
              </Text>
            </View>
          ) : null}

          {!isLoading && !errorMessage && insights ? (
            <>
              <View style={styles.statsGrid}>
                <StatCard
                  value={String(insights.dreamCount)}
                  label="梦境记录"
                />

                <StatCard
                  value={String(insights.activeDays)}
                  label="活跃天数"
                />

                <StatCard
                  value={insights.averagePerActiveNight.toFixed(
                    1
                  )}
                  label="每个记录夜晚"
                />

                <StatCard
                  value={`${insights.voiceCount}/${insights.textCount}`}
                  label="语音 / 文字"
                />
              </View>

              <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>
                    最近 7 天
                  </Text>

                  <Text style={styles.sectionHint}>
                    每日记录数量
                  </Text>
                </View>

                <View style={styles.chart}>
                  {insights.dailyCounts.map((item) => {
                    const barHeight =
                      item.count === 0
                        ? 6
                        : Math.max(
                            18,
                            (item.count /
                              maximumDailyCount) *
                              92
                          );

                    return (
                      <View
                        key={item.date}
                        style={styles.chartColumn}
                      >
                        <Text style={styles.chartCount}>
                          {item.count || ''}
                        </Text>

                        <View style={styles.chartBarArea}>
                          <View
                            style={[
                              styles.chartBar,
                              {
                                height: barHeight,
                              },
                              item.count === 0 &&
                                styles.chartBarEmpty,
                            ]}
                          />
                        </View>

                        <Text style={styles.chartLabel}>
                          {item.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.comparisonBox}>
                  <Text style={styles.comparisonText}>
                    {insights.comparisonText}
                  </Text>
                </View>
              </View>

              <DistributionSection
                title="梦中情绪"
                emptyText="还没有填写梦境情绪"
                items={insights.topMoods}
              />

              <DistributionSection
                title="清晰度"
                emptyText="还没有填写梦境清晰度"
                items={insights.topClarities}
              />

              <DistributionSection
                title="高频主题"
                emptyText="为梦境添加标签后，这里会显示高频主题"
                items={insights.topTags}
              />

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>
                  睡前记录关联
                </Text>

                <View style={styles.connectionStats}>
                  <View style={styles.connectionItem}>
                    <Text style={styles.connectionValue}>
                      {insights.linkedDreamCount}
                    </Text>
                    <Text style={styles.connectionLabel}>
                      关联梦境
                    </Text>
                  </View>

                  <View style={styles.connectionDivider} />

                  <View style={styles.connectionItem}>
                    <Text style={styles.connectionValue}>
                      {insights.linkedSleepNoteCount}
                    </Text>
                    <Text style={styles.connectionLabel}>
                      睡前记录
                    </Text>
                  </View>

                  <View style={styles.connectionDivider} />

                  <View style={styles.connectionItem}>
                    <Text style={styles.connectionValue}>
                      {insights.averageConcernIntensity ===
                      null
                        ? '—'
                        : insights.averageConcernIntensity.toFixed(
                            1
                          )}
                    </Text>
                    <Text style={styles.connectionLabel}>
                      平均关注强度
                    </Text>
                  </View>
                </View>

                {insights.topSleepCategories.length > 0 ? (
                  <View style={styles.categoryWrap}>
                    {insights.topSleepCategories.map(
                      (item) => (
                        <View
                          key={item.label}
                          style={styles.categoryChip}
                        >
                          <Text style={styles.categoryText}>
                            {item.label} · {item.count}
                          </Text>
                        </View>
                      )
                    )}
                  </View>
                ) : (
                  <Text style={styles.emptySectionText}>
                    当前范围内还没有关联的睡前记录
                  </Text>
                )}
              </View>

              <View style={styles.reflectionCard}>
                <Text style={styles.reflectionEyebrow}>
                  PERIOD REFLECTION
                </Text>

                <Text style={styles.reflectionTitle}>
                  这一阶段可以关注
                </Text>

                <View style={styles.reflectionList}>
                  {insights.reflections.map(
                    (reflection, index) => (
                      <View
                        key={`${reflection}-${index}`}
                        style={styles.reflectionItem}
                      >
                        <View style={styles.reflectionNumber}>
                          <Text
                            style={
                              styles.reflectionNumberText
                            }
                          >
                            {index + 1}
                          </Text>
                        </View>

                        <Text style={styles.reflectionText}>
                          {reflection}
                        </Text>
                      </View>
                    )
                  )}
                </View>
              </View>

              <Text style={styles.disclaimer}>
                阶段洞察用于帮助回顾记录，不构成医学或心理诊断，也不能证明睡前想法与梦境之间存在因果关系。
              </Text>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5FBF6',
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
    paddingTop: 22,
    paddingHorizontal: 22,
    paddingBottom: 56,
  },

  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1EDE7',
  },

  backButtonText: {
    color: '#173B37',
    fontSize: 30,
    lineHeight: 32,
    marginTop: -2,
  },

  headerLabel: {
    color: '#728F89',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },

  headerPlaceholder: {
    width: 42,
  },

  title: {
    marginTop: 22,
    color: '#173B37',
    fontSize: 32,
    lineHeight: 42,
    fontWeight: '800',
  },

  subtitle: {
    marginTop: 10,
    color: '#728F89',
    fontSize: 14,
    lineHeight: 23,
  },

  rangeTabs: {
    marginTop: 24,
    padding: 5,
    flexDirection: 'row',
    gap: 6,
    borderRadius: 18,
    backgroundColor: '#EAF6F0',
    borderWidth: 1,
    borderColor: '#E1EDE7',
  },

  rangeTab: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rangeTabSelected: {
    backgroundColor: '#5FAF9C',
  },

  rangeTabText: {
    color: '#7382A4',
    fontSize: 13,
    fontWeight: '700',
  },

  rangeTabTextSelected: {
    color: '#FFFFFF',
  },

  stateCard: {
    marginTop: 22,
    minHeight: 150,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1EDE7',
  },

  stateText: {
    color: '#728F89',
    fontSize: 14,
  },

  errorCard: {
    marginTop: 22,
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#261722',
    borderWidth: 1,
    borderColor: '#F1C7D0',
  },

  errorText: {
    color: '#AE5B68',
    fontSize: 14,
    lineHeight: 22,
  },

  statsGrid: {
    marginTop: 22,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  statCard: {
    width: '48%',
    minHeight: 112,
    padding: 18,
    borderRadius: 22,
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#223458',
  },

  statValue: {
    color: '#173B37',
    fontSize: 28,
    fontWeight: '800',
  },

  statLabel: {
    color: '#728F89',
    fontSize: 12,
    fontWeight: '700',
  },

  sectionCard: {
    marginTop: 16,
    padding: 22,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1EDE7',
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  sectionTitle: {
    color: '#173B37',
    fontSize: 18,
    fontWeight: '800',
  },

  sectionHint: {
    color: '#728F89',
    fontSize: 11,
  },

  chart: {
    height: 150,
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },

  chartColumn: {
    flex: 1,
    height: 150,
    alignItems: 'center',
  },

  chartCount: {
    height: 20,
    color: '#5FAF9C',
    fontSize: 11,
    fontWeight: '700',
  },

  chartBarArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },

  chartBar: {
    width: '62%',
    maxWidth: 34,
    borderRadius: 10,
    backgroundColor: '#5FAF9C',
  },

  chartBarEmpty: {
    backgroundColor: '#DDEBE5',
  },

  chartLabel: {
    marginTop: 8,
    color: '#728F89',
    fontSize: 10,
  },

  comparisonBox: {
    marginTop: 18,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#EAF6F0',
  },

  comparisonText: {
    color: '#466A63',
    fontSize: 13,
    lineHeight: 21,
  },

  emptySectionText: {
    marginTop: 16,
    color: '#728F89',
    fontSize: 13,
    lineHeight: 21,
  },

  distributionList: {
    marginTop: 20,
    gap: 18,
  },

  distributionItem: {
    gap: 9,
  },

  distributionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  distributionLabel: {
    flex: 1,
    color: '#466A63',
    fontSize: 14,
    fontWeight: '700',
  },

  distributionCount: {
    color: '#728F89',
    fontSize: 12,
  },

  progressTrack: {
    height: 7,
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: '#DDEBE5',
  },

  progressFill: {
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#5FAF9C',
  },

  connectionStats: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
  },

  connectionItem: {
    flex: 1,
    alignItems: 'center',
  },

  connectionValue: {
    color: '#EFF3FF',
    fontSize: 22,
    fontWeight: '800',
  },

  connectionLabel: {
    marginTop: 6,
    color: '#728F89',
    fontSize: 10,
    textAlign: 'center',
  },

  connectionDivider: {
    width: 1,
    height: 38,
    backgroundColor: '#DDEBE5',
  },

  categoryWrap: {
    marginTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#EAF6F0',
  },

  categoryText: {
    color: '#466A63',
    fontSize: 12,
    fontWeight: '700',
  },

  reflectionCard: {
    marginTop: 16,
    padding: 24,
    borderRadius: 26,
    backgroundColor: '#EAF6F0',
    borderWidth: 1,
    borderColor: '#BFDCD1',
  },

  reflectionEyebrow: {
    color: '#5FAF9C',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
  },

  reflectionTitle: {
    marginTop: 9,
    color: '#173B37',
    fontSize: 21,
    fontWeight: '800',
  },

  reflectionList: {
    marginTop: 22,
    gap: 18,
  },

  reflectionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
  },

  reflectionNumber: {
    width: 27,
    height: 27,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5FAF9C',
  },

  reflectionNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  reflectionText: {
    flex: 1,
    color: '#466A63',
    fontSize: 13,
    lineHeight: 22,
  },

  disclaimer: {
    marginTop: 20,
    paddingHorizontal: 8,
    color: '#5E6B87',
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.72,
  },
});