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
      <StatusBar style="light" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
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
                    selectionColor="#7898F2"
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

  stateCard: {
    alignItems: 'center',
    marginTop: 50,
    padding: 25,
    borderRadius: 20,
    backgroundColor: '#10192C',
  },

  stateText: {
    color: '#8290AA',
    fontSize: 13,
  },

  returnButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#526FCA',
  },

  returnButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
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

  dateText: {
    color: '#71809E',
    fontSize: 12,
    marginTop: 8,
  },

  contentCard: {
    marginTop: 26,
    padding: 22,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#293B60',
    backgroundColor: '#10192C',
  },

  metadataArea: {
    marginBottom: 17,
    paddingBottom: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#263552',
  },

  metadataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },

  metadataChip: {
    color: '#A8BCEB',
    fontSize: 10,
    marginRight: 7,
    marginTop: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#192744',
  },

  tagChip: {
    color: '#7E93BD',
    fontSize: 11,
    marginRight: 9,
    marginTop: 8,
  },

  contentText: {
    color: '#E5EAF5',
    fontSize: 16,
    lineHeight: 28,
  },

  recordInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#263552',
  },

  recordInfoText: {
    color: '#657693',
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
    borderColor: '#526FCA',
    backgroundColor: '#10192C',
  },

  textInput: {
    flex: 1,
    minHeight: 240,
    color: '#E8ECF6',
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
    borderTopColor: '#263552',
  },

  inputHint: {
    flex: 1,
    color: '#63728D',
    fontSize: 11,
    marginRight: 12,
  },

  characterCount: {
    color: '#63728D',
    fontSize: 11,
  },

  errorCard: {
    marginTop: 15,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#291A25',
  },

  errorText: {
    color: '#E59090',
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
  backgroundColor: '#526FCA',
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
  borderColor: '#3B5180',
  backgroundColor: '#131F38',
},

organizeButtonText: {
  color: '#AFC2EF',
  fontSize: 14,
  fontWeight: '700',
},
  editButton: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 13,
    borderRadius: 28,
    backgroundColor: '#526FCA',
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
    borderColor: '#3B2B3D',
    backgroundColor: '#151421',
  },

  deleteConfirmButton: {
    borderColor: '#A85767',
    backgroundColor: '#291720',
  },

  deleteButtonText: {
    color: '#9B7780',
    fontSize: 13,
  },

  deleteConfirmText: {
    color: '#EE9EAC',
    fontWeight: '700',
  },

  deleteWarning: {
    color: '#7D5F69',
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
    borderColor: '#2B3B58',
    backgroundColor: '#11192C',
  },

  cancelButtonText: {
    color: '#A2AEC5',
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
    backgroundColor: '#526FCA',
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  disabledButton: {
    backgroundColor: '#1C273D',
  },

  disabledButtonText: {
    color: '#59677F',
  },

  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.99 }],
  },
});