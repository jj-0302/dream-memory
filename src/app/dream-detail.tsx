import { DreamAudioPlayer } from '../components/dream-audio-player';
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  deleteDreamRecord,
  getDreamRecordById,
  type DreamRecord,
  updateDreamRecord,
} from '../lib/dream-storage';

export default function DreamDetailScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    id?: string | string[];
  }>();

  const dreamId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const [record, setRecord] = useState<DreamRecord | null>(
    null
  );
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadDream() {
        if (!dreamId) {
          setIsLoading(false);
          setErrorMessage('缺少梦境编号');
          return;
        }

        try {
          setIsLoading(true);
          setErrorMessage('');

          const savedRecord =
            await getDreamRecordById(dreamId);

          if (!isActive) {
            return;
          }

          if (!savedRecord) {
            setRecord(null);
            setErrorMessage('没有找到这条梦境');
            return;
          }

          setRecord(savedRecord);
          setContent(savedRecord.content);
        } catch {
          if (isActive) {
            setErrorMessage('读取梦境失败，请稍后重试');
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      }

      loadDream();

      return () => {
        isActive = false;
      };
    }, [dreamId])
  );

  const formatTime = (dateText: string) => {
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

  const startEditing = () => {
    if (!record) {
      return;
    }

    setContent(record.content);
    setErrorMessage('');
    setConfirmDelete(false);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    if (record) {
      setContent(record.content);
    }

    setErrorMessage('');
    setIsEditing(false);
  };

  const saveChanges = async () => {
    if (!record || !content.trim() || isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');

      const updatedRecord = await updateDreamRecord(
        record.id,
        content
      );

      setRecord(updatedRecord);
      setContent(updatedRecord.content);
      setIsEditing(false);
    } catch {
      setErrorMessage('保存修改失败，请稍后重试');
    } finally {
      setIsSaving(false);
    }
  };

  const openOrganizePage = () => {
    if (!record) {
      return;
    }

    router.push({
      pathname: '/dream-organize',
      params: {
        id: record.id,
      },
    });
  };

  const handleDelete = async () => {
    if (!record) {
      return;
    }

    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    try {
      setErrorMessage('');
      await deleteDreamRecord(record.id);
      router.replace('/history');
    } catch {
      setConfirmDelete(false);
      setErrorMessage('删除失败，请稍后重试');
    }
  };

  const canSave =
    content.trim().length > 0 && !isSaving;

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.page}>
          <View style={styles.header}>
            <Pressable
              onPress={() => router.replace('/history')}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.backButtonText}>‹</Text>
            </Pressable>

            <Text style={styles.headerTitle}>梦境详情</Text>

            <View style={styles.headerSpace} />
          </View>

          {isLoading ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateText}>
                正在读取梦境……
              </Text>
            </View>
          ) : null}

          {!isLoading && errorMessage && !record ? (
            <View style={styles.stateCard}>
              <Text style={styles.errorText}>
                {errorMessage}
              </Text>

              <Pressable
                onPress={() => router.replace('/history')}
                style={({ pressed }) => [
                  styles.returnButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.returnButtonText}>
                  返回全部梦境
                </Text>
              </Pressable>
            </View>
          ) : null}

          {!isLoading && record ? (
            <>
              <View style={styles.titleArea}>
                <Text style={styles.eyebrow}>
                  DREAM MEMORY
                </Text>

                <Text style={styles.title}>
                  {isEditing
                    ? '编辑这段梦境'
                    : record.title || '那时记下的梦'}
                </Text>

                <Text style={styles.dateText}>
                  {formatTime(record.createdAt)}
                </Text>
              </View>

              {isEditing ? (
                <View style={styles.inputCard}>
                  <TextInput
                    value={content}
                    onChangeText={setContent}
                    multiline
                    maxLength={5000}
                    textAlignVertical="top"
                    selectionColor="#5FAF9C"
                    style={styles.textInput}
                  />

                  <View style={styles.inputFooter}>
                    <Text style={styles.inputHint}>
                      修改后不会改变最初的记录时间
                    </Text>

                    <Text style={styles.characterCount}>
                      {content.length} / 5000
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.contentCard}>
                  {record.mood ||
                  record.clarity ||
                  record.dreamOrder ||
                  (record.tags &&
                    record.tags.length > 0) ? (
                    <View style={styles.metadataArea}>
                      <View style={styles.metadataRow}>
                        {record.dreamOrder ? (
                          <Text style={styles.metadataChip}>
                            第 {record.dreamOrder} 个梦
                          </Text>
                        ) : null}

                        {record.mood ? (
                          <Text style={styles.metadataChip}>
                            {record.mood}
                          </Text>
                        ) : null}

                        {record.clarity ? (
                          <Text style={styles.metadataChip}>
                            {record.clarity}
                          </Text>
                        ) : null}
                      </View>

                      {record.tags &&
                      record.tags.length > 0 ? (
                        <View style={styles.metadataRow}>
                          {record.tags.map((tag) => (
                            <Text
                              key={tag}
                              style={styles.tagChip}
                            >
                              #{tag}
                            </Text>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  <Text style={styles.contentText}>
                    {record.content}
                  </Text>

                  <View style={styles.recordInfo}>
                    <Text style={styles.recordInfoText}>
                      {record.inputType === 'voice'
                        ? '语音记录'
                        : '文字记录'}
                    </Text>

                    {record.updatedAt !== record.createdAt ? (
                      <Text style={styles.recordInfoText}>
                        已编辑
                      </Text>
                    ) : null}
                  </View>
                </View>
              )}

              {errorMessage ? (
                <View style={styles.errorCard}>
                  <Text style={styles.errorText}>
                    {errorMessage}
                  </Text>
                </View>
              ) : null}

              {isEditing ? (
                <View style={styles.editActions}>
                  <Pressable
                    onPress={cancelEditing}
                    style={({ pressed }) => [
                      styles.cancelButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.cancelButtonText}>
                      取消
                    </Text>
                  </Pressable>

                  <Pressable
                    disabled={!canSave}
                    onPress={saveChanges}
                    style={({ pressed }) => [
                      styles.saveButton,
                      !canSave && styles.disabledButton,
                      pressed && canSave && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.saveButtonText,
                        !canSave &&
                          styles.disabledButtonText,
                      ]}
                    >
                      {isSaving
                        ? '正在保存……'
                        : '保存修改'}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <>
<Pressable
  onPress={() =>
    router.push({
      pathname: '/dream-analysis',
      params: {
        id: record.id,
      },
    })
  }
  style={({ pressed }) => [
    styles.analysisButton,
    pressed && styles.pressed,
  ]}
>
  <Text style={styles.analysisButtonText}>
    ✦ 分析这段梦境
  </Text>
</Pressable>
                  <Pressable
                    onPress={openOrganizePage}
                    style={({ pressed }) => [
                      styles.organizeButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.organizeButtonText}>
                      整理梦境信息
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={startEditing}
                    style={({ pressed }) => [
                      styles.editButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.editButtonText}>
                      编辑梦境正文
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleDelete}
                    style={({ pressed }) => [
                      styles.deleteButton,
                      confirmDelete &&
                        styles.deleteConfirmButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.deleteButtonText,
                        confirmDelete &&
                          styles.deleteConfirmText,
                      ]}
                    >
                      {confirmDelete
                        ? '再次点击，确认删除'
                        : '删除这条梦境'}
                    </Text>
                  </Pressable>

                  {confirmDelete ? (
                    <Text style={styles.deleteWarning}>
                      删除后无法恢复。如果不想删除，请直接返回。
                    </Text>
                  ) : null}
                </>
              )}
            </>
               ) : null}

          {!isEditing && record?.audioUri ? (
            <DreamAudioPlayer
              uri={record.audioUri}
              durationMillis={record.audioDurationMillis}
            />
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
    backgroundColor: '#FFFFFF',
  },

  backButtonText: {
    color: '#173B37',
    fontSize: 34,
    lineHeight: 36,
    marginTop: -3,
  },

  headerTitle: {
    color: '#173B37',
    fontSize: 16,
    fontWeight: '700',
  },

  headerSpace: {
    width: 44,
    height: 44,
  },

  stateCard: {
    alignItems: 'center',
    marginTop: 50,
    padding: 25,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },

  stateText: {
    color: '#728F89',
    fontSize: 13,
  },

  returnButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#5FAF9C',
  },

  returnButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  titleArea: {
    marginTop: 22,
    padding: 22,
    borderRadius: 24,
    backgroundColor: '#EAF6F0',
  },

  eyebrow: {
    color: '#728F89',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },

  title: {
    color: '#173B37',
    fontSize: 29,
    lineHeight: 39,
    fontWeight: '700',
    marginTop: 12,
  },

  dateText: {
    color: '#728F89',
    fontSize: 12,
    marginTop: 8,
  },

  contentCard: {
    marginTop: 26,
    padding: 22,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E1EDE7',
    backgroundColor: '#FFFFFF',
  },

  metadataArea: {
    marginBottom: 17,
    paddingBottom: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#E1EDE7',
  },

  metadataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },

  metadataChip: {
    color: '#466A63',
    fontSize: 10,
    marginRight: 7,
    marginTop: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#EAF6F0',
  },

  tagChip: {
    color: '#728F89',
    fontSize: 11,
    marginRight: 9,
    marginTop: 8,
  },

  contentText: {
    color: '#173B37',
    fontSize: 16,
    lineHeight: 28,
  },

  recordInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E1EDE7',
  },

  recordInfoText: {
    color: '#728F89',
    fontSize: 11,
  },

  inputCard: {
    minHeight: 310,
    marginTop: 26,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#5FAF9C',
    backgroundColor: '#FFFFFF',
  },

  textInput: {
    flex: 1,
    minHeight: 240,
    color: '#173B37',
    fontSize: 16,
    lineHeight: 27,
    padding: 0,
  },

  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E1EDE7',
  },

  inputHint: {
    flex: 1,
    color: '#728F89',
    fontSize: 11,
    marginRight: 12,
  },

  characterCount: {
    color: '#728F89',
    fontSize: 11,
  },

  errorCard: {
    marginTop: 15,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FCECEF',
  },

  errorText: {
    color: '#AE5B68',
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
  },

  analysisButton: {
  height: 58,
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 13,
  borderRadius: 29,
  backgroundColor: '#5FAF9C',
},

analysisButtonText: {
  color: '#FFFFFF',
  fontSize: 15,
  fontWeight: '700',
},

organizeButton: {
  height: 52,
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 13,
  borderRadius: 26,
  borderWidth: 1,
  borderColor: '#BFDCD1',
  backgroundColor: '#131F38',
},

organizeButtonText: {
  color: '#466A63',
  fontSize: 14,
  fontWeight: '700',
},
  editButton: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 13,
    borderRadius: 28,
    backgroundColor: '#5FAF9C',
  },

  editButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  deleteButton: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 13,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#F1C7D0',
    backgroundColor: '#FFF5F6',
  },

  deleteConfirmButton: {
    borderColor: '#AE5B68',
    backgroundColor: '#291720',
  },

  deleteButtonText: {
    color: '#9B7780',
    fontSize: 13,
  },

  deleteConfirmText: {
    color: '#AE5B68',
    fontWeight: '700',
  },

  deleteWarning: {
    color: '#8E7880',
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 10,
  },

  editActions: {
    flexDirection: 'row',
    marginTop: 24,
  },

  cancelButton: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E1EDE7',
    backgroundColor: '#11192C',
  },

  cancelButtonText: {
    color: '#466A63',
    fontSize: 14,
    fontWeight: '700',
  },

  saveButton: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 7,
    borderRadius: 28,
    backgroundColor: '#5FAF9C',
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  disabledButton: {
    backgroundColor: '#EAF6F0',
  },

  disabledButtonText: {
    color: '#728F89',
  },

  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.99 }],
  },
});