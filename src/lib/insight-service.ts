import {
  getDreamRecords,
  type DreamRecord,
} from './dream-storage';
import {
  getSleepNotes,
  type SleepNote,
} from './sleep-storage';

export type InsightRange = '7d' | '30d' | 'all';

export type DistributionItem = {
  label: string;
  count: number;
};

export type DailyDreamCount = {
  date: string;
  label: string;
  count: number;
};

export type DreamInsights = {
  range: InsightRange;
  dreamCount: number;
  activeDays: number;
  averagePerActiveNight: number;
  textCount: number;
  voiceCount: number;
  linkedDreamCount: number;
  linkedSleepNoteCount: number;
  averageConcernIntensity: number | null;
  topMoods: DistributionItem[];
  topClarities: DistributionItem[];
  topTags: DistributionItem[];
  topSleepCategories: DistributionItem[];
  dailyCounts: DailyDreamCount[];
  comparisonText: string;
  reflections: string[];
};

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getDreamDateKey(record: DreamRecord): string {
  if (record.sleepDate) {
    return record.sleepDate;
  }

  return getLocalDateKey(new Date(record.createdAt));
}

function getDreamTimestamp(record: DreamRecord): number {
  if (record.sleepDate) {
    return new Date(`${record.sleepDate}T12:00:00`).getTime();
  }

  return new Date(record.createdAt).getTime();
}

function getRangeStart(
  range: InsightRange,
  now: Date
): number | null {
  if (range === 'all') {
    return null;
  }

  const days = range === '7d' ? 7 : 30;
  const start = new Date(now);

  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  return start.getTime();
}

function filterDreamsByRange(
  records: DreamRecord[],
  range: InsightRange,
  now: Date
): DreamRecord[] {
  const rangeStart = getRangeStart(range, now);

  if (rangeStart === null) {
    return records;
  }

  return records.filter((record) => {
    const timestamp = getDreamTimestamp(record);

    return Number.isFinite(timestamp) && timestamp >= rangeStart;
  });
}

function buildDistribution(
  values: Array<string | undefined>,
  limit = 5
): DistributionItem[] {
  const counts = new Map<string, number>();

  values.forEach((value) => {
    const cleanValue = value?.trim();

    if (!cleanValue) {
      return;
    }

    counts.set(cleanValue, (counts.get(cleanValue) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([label, count]) => ({
      label,
      count,
    }))
    .sort((first, second) => {
      if (second.count !== first.count) {
        return second.count - first.count;
      }

      return first.label.localeCompare(second.label, 'zh-CN');
    })
    .slice(0, limit);
}

function buildDailyCounts(
  records: DreamRecord[],
  now: Date
): DailyDreamCount[] {
  const result: DailyDreamCount[] = [];

  for (let dayOffset = 6; dayOffset >= 0; dayOffset -= 1) {
    const date = new Date(now);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - dayOffset);

    const dateKey = getLocalDateKey(date);
    const count = records.filter(
      (record) => getDreamDateKey(record) === dateKey
    ).length;

    result.push({
      date: dateKey,
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      count,
    });
  }

  return result;
}

function countDreamsBetween(
  records: DreamRecord[],
  start: Date,
  end: Date
): number {
  const startTimestamp = start.getTime();
  const endTimestamp = end.getTime();

  return records.filter((record) => {
    const timestamp = getDreamTimestamp(record);

    return (
      Number.isFinite(timestamp) &&
      timestamp >= startTimestamp &&
      timestamp <= endTimestamp
    );
  }).length;
}

function buildComparisonText(
  records: DreamRecord[],
  now: Date
): string {
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const recentStart = new Date(now);
  recentStart.setHours(0, 0, 0, 0);
  recentStart.setDate(recentStart.getDate() - 6);

  const previousEnd = new Date(recentStart);
  previousEnd.setMilliseconds(-1);

  const previousStart = new Date(recentStart);
  previousStart.setDate(previousStart.getDate() - 7);

  const recentCount = countDreamsBetween(
    records,
    recentStart,
    todayEnd
  );

  const previousCount = countDreamsBetween(
    records,
    previousStart,
    previousEnd
  );

  if (recentCount === 0 && previousCount === 0) {
    return '最近两周还没有形成连续记录。';
  }

  if (previousCount === 0) {
    return `最近 7 天记录了 ${recentCount} 条梦境，记录习惯正在形成。`;
  }

  const difference = recentCount - previousCount;

  if (difference > 0) {
    return `最近 7 天比前 7 天多记录 ${difference} 条梦境。`;
  }

  if (difference < 0) {
    return `最近 7 天比前 7 天少记录 ${Math.abs(
      difference
    )} 条梦境。`;
  }

  return `最近 7 天与前 7 天的记录数量相同，都是 ${recentCount} 条。`;
}

function buildReflections(
  records: DreamRecord[],
  topMoods: DistributionItem[],
  topTags: DistributionItem[],
  linkedNotes: SleepNote[],
  activeDays: number
): string[] {
  if (records.length === 0) {
    return [
      '当前时间范围内还没有梦境记录。',
      '醒来后先记录最清晰的一个画面、人物或情绪即可。',
      '连续记录几天后，阶段性模式会更加清楚。',
    ];
  }

  const reflections: string[] = [];

  if (topMoods.length > 0) {
    reflections.push(
      `“${topMoods[0].label}”是这一阶段记录最多的梦中情绪，共出现 ${topMoods[0].count} 次。它代表记录频率，不等同于心理诊断。`
    );
  } else {
    reflections.push(
      '这一阶段还没有填写足够的情绪信息，可以在整理梦境时补充感受。'
    );
  }

  if (topTags.length > 0) {
    reflections.push(
      `“${topTags[0].label}”是当前最常出现的主题标签，可以回看相关梦境，观察场景和现实经历是否有重复线索。`
    );
  } else {
    reflections.push(
      '暂时没有形成高频主题。为梦境添加人物、地点或事件标签后，更容易观察长期变化。'
    );
  }

  if (linkedNotes.length > 0) {
    const averageIntensity =
      linkedNotes.reduce(
        (total, note) => total + note.intensity,
        0
      ) / linkedNotes.length;

    if (averageIntensity >= 4) {
      reflections.push(
        '部分梦境关联了强度较高的睡前关注事项。可以比较梦中的情绪与睡前想法，但不要把关联直接理解为因果关系。'
      );
    } else {
      reflections.push(
        '已有梦境与睡前记录建立关联，可以继续观察睡前关注事项是否以人物、场景或情绪的形式进入梦境。'
      );
    }
  } else {
    reflections.push(
      '这一阶段还没有关联到睡前记录。睡前留下一个关注事项，有助于后续进行对照观察。'
    );
  }

  if (activeDays >= 5) {
    reflections.push(
      `这一阶段已经在 ${activeDays} 天留下记录，数据开始具备观察阶段性变化的价值。`
    );
  }

  return reflections.slice(0, 4);
}

export async function getDreamInsights(
  range: InsightRange
): Promise<DreamInsights> {
  const [allDreams, sleepNotes] = await Promise.all([
    getDreamRecords(),
    getSleepNotes(),
  ]);

  const now = new Date();
  const records = filterDreamsByRange(allDreams, range, now);

  const activeDays = new Set(
    records.map((record) => getDreamDateKey(record))
  ).size;

  const linkedNoteIds = new Set(
    records
      .map((record) => record.sleepNoteId)
      .filter((id): id is string => Boolean(id))
  );

  const linkedNotes = sleepNotes.filter((note) =>
    linkedNoteIds.has(note.id)
  );

  const averageConcernIntensity =
    linkedNotes.length > 0
      ? linkedNotes.reduce(
          (total, note) => total + note.intensity,
          0
        ) / linkedNotes.length
      : null;

  const topMoods = buildDistribution(
    records.map((record) => record.mood)
  );

  const topClarities = buildDistribution(
    records.map((record) => record.clarity)
  );

  const topTags = buildDistribution(
    records.flatMap((record) => record.tags ?? []),
    6
  );

  const topSleepCategories = buildDistribution(
    linkedNotes.map((note) => note.category)
  );

  return {
    range,
    dreamCount: records.length,
    activeDays,
    averagePerActiveNight:
      activeDays > 0 ? records.length / activeDays : 0,
    textCount: records.filter(
      (record) => record.inputType === 'text'
    ).length,
    voiceCount: records.filter(
      (record) => record.inputType === 'voice'
    ).length,
    linkedDreamCount: records.filter(
      (record) => Boolean(record.sleepNoteId)
    ).length,
    linkedSleepNoteCount: linkedNotes.length,
    averageConcernIntensity,
    topMoods,
    topClarities,
    topTags,
    topSleepCategories,
    dailyCounts: buildDailyCounts(records, now),
    comparisonText: buildComparisonText(allDreams, now),
    reflections: buildReflections(
      records,
      topMoods,
      topTags,
      linkedNotes,
      activeDays
    ),
  };
}