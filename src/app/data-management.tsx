import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import {
  clearAllLocalData,
  createBackup,
  getBackupPreview,
  getLocalDataSummary,
  parseBackup,
  restoreBackup,
  serializeBackup,
  type BackupPreview,
  type DreamMemoryBackup,
  type LocalDataSummary,
} from '../lib/backup-service';

function formatDate(dateText: string): string {
  const date = new Date(dateText);

  if (Number.isNaN(date.getTime())) {
    return dateText;
  }

  return date.toLocaleString('zh-CN');
}

function downloadBackupOnWeb(
  fileName: string,
  content: string
): void {
  const blob = new Blob([content], {
    type: 'application/json;charset=utf-8',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export default function DataManagementScreen() {
  const [summary, setSummary] =
    useState<LocalDataSummary | null>(null);
  const [pendingBackup, setPendingBackup] =
    useState<DreamMemoryBackup | null>(null);
  const [backupPreview, setBackupPreview] =
    useState<BackupPreview | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const loadSummary = useCallback(async () => {
    const result = await getLocalDataSummary();
    setSummary(result);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSummary();
    }, [loadSummary])
  );

  const showMessage = (
    nextMessage: string,
    error = false
  ) => {
    setMessage(nextMessage);
    setIsError(error);
  };

  const handleExport = async () => {
    if (isBusy) {
      return;
    }

    try {
      setIsBusy(true);
      showMessage('');

      const backup = await createBackup();
      const content = serializeBackup(backup);
      const date = new Date()
        .toISOString()
        .slice(0, 10);
      const fileName = `dream-memory-backup-${date}.json`;

      if (Platform.OS === 'web') {
        downloadBackupOnWeb(fileName, content);
        showMessage('备份文件已经下载');
        return;
      }

      if (!FileSystem.cacheDirectory) {
        throw new Error('无法访问临时文件目录');
      }

      const fileUri =
        FileSystem.cacheDirectory + fileName;

      await FileSystem.writeAsStringAsync(
        fileUri,
        content,
        {
          encoding: FileSystem.EncodingType.UTF8,
        }
      );

      const sharingAvailable =
        await Sharing.isAvailableAsync();

      if (!sharingAvailable) {
        throw new Error('当前设备不支持系统文件分享');
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: '导出 Dream Memory 备份',
      });

      showMessage('备份文件已经生成');
    } catch (error) {
      console.error('导出备份失败：', error);

      showMessage(
        error instanceof Error
          ? error.message
          : '导出备份失败',
        true
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleChooseBackup = async () => {
    if (isBusy) {
      return;
    }

    try {
      setIsBusy(true);
      showMessage('');
      setPendingBackup(null);
      setBackupPreview(null);

      const result =
        await DocumentPicker.getDocumentAsync({
          type: [
            'application/json',
            'text/json',
            'text/plain',
          ],
          copyToCacheDirectory: true,
          multiple: false,
        });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      let text: string;

      if (Platform.OS === 'web' && asset.file) {
        text = await asset.file.text();
      } else {
        text = await FileSystem.readAsStringAsync(
          asset.uri,
          {
            encoding: FileSystem.EncodingType.UTF8,
          }
        );
      }

      const backup = parseBackup(text);
      const preview = getBackupPreview(backup);

      setPendingBackup(backup);
      setBackupPreview(preview);
      showMessage(
        '备份文件读取成功，请确认后恢复'
      );
    } catch (error) {
      console.error('读取备份失败：', error);

      showMessage(
        error instanceof Error
          ? error.message
          : '读取备份文件失败',
        true
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleRestore = async () => {
    if (!pendingBackup || isBusy) {
      return;
    }

    try {
      setIsBusy(true);
      showMessage('');

      await restoreBackup(pendingBackup);
      await loadSummary();

      setPendingBackup(null);
      setBackupPreview(null);
      setConfirmClear(false);

      showMessage('备份恢复成功，本地数据已经更新');
    } catch (error) {
      console.error('恢复备份失败：', error);

      showMessage(
        error instanceof Error
          ? error.message
          : '恢复备份失败',
        true
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleClear = async () => {
    if (isBusy) {
      return;
    }

    if (!confirmClear) {
      setConfirmClear(true);
      showMessage(
        '再次点击“确认清空全部数据”才能删除'
      );
      return;
    }

    try {
      setIsBusy(true);

      await clearAllLocalData();
      await loadSummary();

      setConfirmClear(false);
      setPendingBackup(null);
      setBackupPreview(null);

      showMessage('全部本地数据已经清空');
    } catch (error) {
      console.error('清空数据失败：', error);

      showMessage(
        error instanceof Error
          ? error.message
          : '清空数据失败',
        true
      );
    } finally {
      setIsBusy(false);
    }
  };

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

            <Text style={styles.headerLabel}>
              DATA & BACKUP
            </Text>

            <View style={styles.headerPlaceholder} />
          </View>

          <Text style={styles.title}>数据管理</Text>

          <Text style={styles.subtitle}>
            备份梦境、睡前记录、分析结果、探索对话、反馈和阶段复盘等本地数据。备份可能包含个人信息，请妥善保管。
          </Text>

          <View style={styles.summaryCard}>
            <Text style={styles.cardEyebrow}>
              LOCAL DATA
            </Text>

            <Text style={styles.cardTitle}>
              当前设备中的记录
            </Text>

            {summary ? (
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {summary.dreamCount}
                  </Text>
                  <Text style={styles.summaryLabel}>
                    梦境
                  </Text>
                </View>

                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {summary.sleepNoteCount}
                  </Text>
                  <Text style={styles.summaryLabel}>
                    睡前记录
                  </Text>
                </View>

                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {summary.textDreamCount}
                  </Text>
                  <Text style={styles.summaryLabel}>
                    文字梦境
                  </Text>
                </View>

                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {summary.voiceDreamCount}
                  </Text>
                  <Text style={styles.summaryLabel}>
                    语音梦境
                  </Text>
                </View>
              </View>
            ) : (
              <ActivityIndicator
                color="#7895F5"
                style={styles.loader}
              />
            )}
          </View>

          {message ? (
            <View
              style={[
                styles.messageCard,
                isError && styles.errorCard,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  isError && styles.errorText,
                ]}
              >
                {message}
              </Text>
            </View>
          ) : null}

          <View style={styles.actionCard}>
            <Text style={styles.actionTitle}>
              导出备份
            </Text>

            <Text style={styles.actionDescription}>
              生成一个 JSON 文件，保存当前应用中的本地数据。
            </Text>

            <Pressable
              disabled={isBusy}
              onPress={handleExport}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
                isBusy && styles.disabled,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                导出全部数据
              </Text>
            </Pressable>
          </View>

          <View style={styles.actionCard}>
            <Text style={styles.actionTitle}>
              导入备份
            </Text>

            <Text style={styles.actionDescription}>
              选择之前导出的 JSON 文件。恢复操作会替换当前设备中的 Dream Memory 数据。
            </Text>

            <Pressable
              disabled={isBusy}
              onPress={handleChooseBackup}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
                isBusy && styles.disabled,
              ]}
            >
              <Text style={styles.secondaryButtonText}>
                选择备份文件
              </Text>
            </Pressable>

            {backupPreview ? (
              <View style={styles.previewCard}>
                <Text style={styles.previewTitle}>
                  等待恢复的备份
                </Text>

                <Text style={styles.previewText}>
                  导出时间：
                  {formatDate(backupPreview.exportedAt)}
                </Text>

                <Text style={styles.previewText}>
                  梦境 {backupPreview.dreamCount} 条 ·
                  睡前记录 {backupPreview.sleepNoteCount} 条
                </Text>

                <Text style={styles.previewText}>
                  文字 {backupPreview.textDreamCount} 条 ·
                  语音 {backupPreview.voiceDreamCount} 条
                </Text>

                <Pressable
                  disabled={isBusy}
                  onPress={handleRestore}
                  style={({ pressed }) => [
                    styles.restoreButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.restoreButtonText}>
                    确认恢复此备份
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setPendingBackup(null);
                    setBackupPreview(null);
                    showMessage('已取消恢复');
                  }}
                  style={({ pressed }) => [
                    styles.cancelButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.cancelButtonText}>
                    取消
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>
              关于语音文件
            </Text>

            <Text style={styles.warningText}>
              JSON 备份会保存语音记录的文字信息和元数据，但不会把录音文件本身嵌入备份。换设备或卸载应用后，旧录音可能无法继续播放。
            </Text>
          </View>

          <View style={styles.dangerCard}>
            <Text style={styles.dangerTitle}>
              清空本地数据
            </Text>

            <Text style={styles.dangerDescription}>
              此操作会删除全部梦境、睡前记录、分析结果、探索对话、反馈、阶段复盘和草稿，且无法撤销。建议先导出备份。
            </Text>

            <Pressable
              disabled={isBusy}
              onPress={handleClear}
              style={({ pressed }) => [
                styles.dangerButton,
                confirmClear &&
                  styles.dangerButtonConfirmed,
                pressed && styles.pressed,
                isBusy && styles.disabled,
              ]}
            >
              <Text
                style={[
                  styles.dangerButtonText,
                  confirmClear &&
                    styles.dangerButtonTextConfirmed,
                ]}
              >
                {confirmClear
                  ? '确认清空全部数据'
                  : '清空全部数据'}
              </Text>
            </Pressable>

            {confirmClear ? (
              <Pressable
                onPress={() => {
                  setConfirmClear(false);
                  showMessage('已取消清空');
                }}
                style={styles.cancelClearButton}
              >
                <Text style={styles.cancelButtonText}>
                  取消清空
                </Text>
              </Pressable>
            ) : null}
          </View>

          {isBusy ? (
            <View style={styles.busyRow}>
              <ActivityIndicator
                size="small"
                color="#7895F5"
              />
              <Text style={styles.busyText}>
                正在处理……
              </Text>
            </View>
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
    paddingBottom: 60,
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

  summaryCard: {
    marginTop: 24,
    padding: 24,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFDCD1',
  },

  cardEyebrow: {
    color: '#5FAF9C',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
  },

  cardTitle: {
    marginTop: 8,
    color: '#173B37',
    fontSize: 20,
    fontWeight: '800',
  },

  summaryGrid: {
    marginTop: 22,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  summaryItem: {
    width: '47%',
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },

  summaryValue: {
    color: '#173B37',
    fontSize: 25,
    fontWeight: '800',
  },

  summaryLabel: {
    marginTop: 5,
    color: '#728F89',
    fontSize: 12,
  },

  loader: {
    marginTop: 24,
  },

  messageCard: {
    marginTop: 16,
    padding: 15,
    borderRadius: 16,
    backgroundColor: '#EAF6F0',
    borderWidth: 1,
    borderColor: '#254B6B',
  },

  errorCard: {
    backgroundColor: '#FCECEF',
    borderColor: '#F1C7D0',
  },

  messageText: {
    color: '#99C8E6',
    fontSize: 13,
    lineHeight: 20,
  },

  errorText: {
    color: '#AE5B68',
  },

  actionCard: {
    marginTop: 16,
    padding: 22,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1EDE7',
  },

  actionTitle: {
    color: '#173B37',
    fontSize: 18,
    fontWeight: '800',
  },

  actionDescription: {
    marginTop: 9,
    color: '#7886A5',
    fontSize: 13,
    lineHeight: 21,
  },

  primaryButton: {
    marginTop: 20,
    minHeight: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5FAF9C',
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  secondaryButton: {
    marginTop: 20,
    minHeight: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF6F0',
    borderWidth: 1,
    borderColor: '#BFDCD1',
  },

  secondaryButtonText: {
    color: '#466A63',
    fontSize: 14,
    fontWeight: '800',
  },

  previewCard: {
    marginTop: 18,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#EAF6F0',
  },

  previewTitle: {
    color: '#173B37',
    fontSize: 15,
    fontWeight: '800',
  },

  previewText: {
    marginTop: 8,
    color: '#728F89',
    fontSize: 12,
    lineHeight: 19,
  },

  restoreButton: {
    marginTop: 18,
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5FAF9C',
  },

  restoreButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  cancelButton: {
    marginTop: 8,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelButtonText: {
    color: '#7786A8',
    fontSize: 12,
    fontWeight: '700',
  },

  warningCard: {
    marginTop: 16,
    padding: 20,
    borderRadius: 22,
    backgroundColor: '#F4EEE7',
    borderWidth: 1,
    borderColor: '#E8DCD1',
  },

  warningTitle: {
    color: '#D8C5EC',
    fontSize: 15,
    fontWeight: '800',
  },

  warningText: {
    marginTop: 9,
    color: '#8E7880',
    fontSize: 12,
    lineHeight: 20,
  },

  dangerCard: {
    marginTop: 16,
    padding: 22,
    borderRadius: 24,
    backgroundColor: '#FFF5F6',
    borderWidth: 1,
    borderColor: '#F1C7D0',
  },

  dangerTitle: {
    color: '#F1CAD4',
    fontSize: 18,
    fontWeight: '800',
  },

  dangerDescription: {
    marginTop: 9,
    color: '#8E7880',
    fontSize: 13,
    lineHeight: 21,
  },

  dangerButton: {
    marginTop: 20,
    minHeight: 50,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D98B9A',
  },

  dangerButtonConfirmed: {
    backgroundColor: '#AE5B68',
    borderColor: '#C97889',
  },

  dangerButtonText: {
    color: '#C88196',
    fontSize: 13,
    fontWeight: '800',
  },

  dangerButtonTextConfirmed: {
    color: '#FFFFFF',
  },

  cancelClearButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  busyRow: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },

  busyText: {
    color: '#728F89',
    fontSize: 12,
  },

  pressed: {
    opacity: 0.72,
  },

  disabled: {
    opacity: 0.5,
  },
});