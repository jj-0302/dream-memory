import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function HomeScreen() {
  const router = useRouter();
  const [message, setMessage] = useState('');

  const openVoiceRecorder = () => {
    setMessage('语音记录功能将在后续步骤接入，现在可以先用文字记录。');
  };

  const openTextEntry = () => {
    router.push('/text-entry');
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
          <View style={styles.topBar}>
            <View>
              <Text style={styles.brand}>DREAM MEMORY</Text>
              <Text style={styles.dateText}>今天 · 醒来之后</Text>
            </View>

            <View style={styles.avatar}>
              <Text style={styles.avatarText}>✦</Text>
            </View>
          </View>

          <View style={styles.hero}>
            <View style={styles.moonArea}>
              <View style={styles.moonGlowLarge} />
              <View style={styles.moonGlowSmall} />

              <View style={styles.moon}>
                <View style={styles.moonShadow} />
                <View style={styles.moonSpotOne} />
                <View style={styles.moonSpotTwo} />
              </View>

              <Text style={styles.starOne}>✦</Text>
              <Text style={styles.starTwo}>·</Text>
              <Text style={styles.starThree}>✧</Text>
            </View>

            <Text style={styles.eyebrow}>醒来以后</Text>

            <Text style={styles.title}>
              你还记得什么？
            </Text>

            <Text style={styles.subtitle}>
              不必完整，也不必合理。先把梦里仍然记得的片段留下来。
            </Text>
          </View>

          <View style={styles.actionArea}>
            <Pressable
              onPress={openVoiceRecorder}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <View style={styles.primaryIcon}>
                <Text style={styles.primaryIconText}>●</Text>
              </View>

              <View style={styles.buttonTextArea}>
                <Text style={styles.primaryButtonTitle}>说给我听</Text>
                <Text style={styles.primaryButtonDescription}>
                  可以停顿、重复，也可以慢慢想
                </Text>
              </View>

              <Text style={styles.primaryArrow}>›</Text>
            </Pressable>

            <Pressable
              onPress={openTextEntry}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <View style={styles.secondaryIcon}>
                <Text style={styles.secondaryIconText}>✎</Text>
              </View>

              <View style={styles.buttonTextArea}>
                <Text style={styles.secondaryButtonTitle}>用文字记录</Text>
                <Text style={styles.secondaryButtonDescription}>
                  写下一句话或一段梦境
                </Text>
              </View>

              <Text style={styles.secondaryArrow}>›</Text>
            </Pressable>

            {message ? (
              <View style={styles.messageBox}>
                <Text style={styles.messageText}>{message}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.seedCard}>
            <View style={styles.seedHeader}>
              <View style={styles.seedTitleArea}>
                <Text style={styles.seedIcon}>✦</Text>
                <Text style={styles.seedLabel}>梦境种子</Text>
              </View>

              <Text style={styles.seedTag}>随机提示</Text>
            </View>

            <Text style={styles.seedQuestion}>
              梦里有没有一个让你印象很深的地方？
            </Text>

            <Text style={styles.seedDescription}>
              它可能是一间房子、一条路、一所学校，或者一个现实中不存在的地方。
            </Text>
          </View>

          <View style={styles.footer}>
            <View style={styles.footerLine} />
            <Text style={styles.footerText}>
              你的梦境草稿只保存在当前设备中
            </Text>
          </View>
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
    paddingTop: 48,
    paddingHorizontal: 28,
    paddingBottom: 40,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  brand: {
    color: '#7185AD',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },

  dateText: {
    color: '#4F5E7B',
    fontSize: 12,
    marginTop: 6,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111B32',
    borderWidth: 1,
    borderColor: '#243453',
  },

  avatarText: {
    color: '#AFC7FF',
    fontSize: 16,
  },

  hero: {
    alignItems: 'center',
    marginTop: 36,
  },

  moonArea: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  moonGlowLarge: {
    position: 'absolute',
    width: 138,
    height: 138,
    borderRadius: 69,
    backgroundColor: 'rgba(88, 117, 199, 0.08)',
  },

  moonGlowSmall: {
    position: 'absolute',
    width: 106,
    height: 106,
    borderRadius: 53,
    backgroundColor: 'rgba(104, 139, 226, 0.11)',
  },

  moon: {
    width: 78,
    height: 78,
    borderRadius: 39,
    overflow: 'hidden',
    backgroundColor: '#DCE6FF',
    shadowColor: '#91ADFF',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.55,
    shadowRadius: 22,
    elevation: 10,
  },

  moonShadow: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    top: -13,
    right: -19,
    backgroundColor: '#111A32',
  },

  moonSpotOne: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    left: 17,
    top: 47,
    backgroundColor: 'rgba(140, 158, 203, 0.35)',
  },

  moonSpotTwo: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    left: 28,
    top: 58,
    backgroundColor: 'rgba(140, 158, 203, 0.24)',
  },

  starOne: {
    position: 'absolute',
    top: 16,
    right: 22,
    color: '#7794D2',
    fontSize: 13,
  },

  starTwo: {
    position: 'absolute',
    left: 20,
    bottom: 30,
    color: '#8CA5D9',
    fontSize: 20,
  },

  starThree: {
    position: 'absolute',
    right: 5,
    bottom: 10,
    color: '#526B9E',
    fontSize: 11,
  },

  eyebrow: {
    color: '#7185AD',
    fontSize: 13,
    letterSpacing: 3,
    marginBottom: 12,
  },

  title: {
    color: '#F4F6FD',
    fontSize: 31,
    lineHeight: 40,
    fontWeight: '700',
    textAlign: 'center',
  },

  subtitle: {
    maxWidth: 480,
    color: '#8390AA',
    fontSize: 14,
    lineHeight: 23,
    textAlign: 'center',
    marginTop: 14,
  },

  actionArea: {
    marginTop: 38,
  },

  primaryButton: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 22,
    backgroundColor: '#526FCA',
    shadowColor: '#4E6ECF',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 6,
  },

  primaryIcon: {
    width: 43,
    height: 43,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },

  primaryIconText: {
    color: '#FFFFFF',
    fontSize: 15,
  },

  buttonTextArea: {
    flex: 1,
  },

  primaryButtonTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },

  primaryButtonDescription: {
    color: '#D6DFFF',
    fontSize: 12,
    marginTop: 5,
  },

  primaryArrow: {
    color: '#E4EAFF',
    fontSize: 31,
    fontWeight: '300',
    marginLeft: 10,
  },

  secondaryButton: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginTop: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#283858',
    backgroundColor: '#11192C',
  },

  secondaryIcon: {
    width: 43,
    height: 43,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    backgroundColor: '#1C2944',
  },

  secondaryIconText: {
    color: '#AAC0F5',
    fontSize: 20,
  },

  secondaryButtonTitle: {
    color: '#E8ECF8',
    fontSize: 17,
    fontWeight: '700',
  },

  secondaryButtonDescription: {
    color: '#71809E',
    fontSize: 12,
    marginTop: 5,
  },

  secondaryArrow: {
    color: '#7585A6',
    fontSize: 31,
    fontWeight: '300',
    marginLeft: 10,
  },

  buttonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },

  messageBox: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#11192C',
    borderWidth: 1,
    borderColor: '#253451',
  },

  messageText: {
    color: '#91A4CB',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },

  seedCard: {
    marginTop: 26,
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#223250',
    backgroundColor: '#0E1628',
  },

  seedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  seedTitleArea: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  seedIcon: {
    color: '#E8CD7A',
    fontSize: 14,
    marginRight: 9,
  },

  seedLabel: {
    color: '#A9B7D2',
    fontSize: 13,
    fontWeight: '600',
  },

  seedTag: {
    color: '#596B8C',
    fontSize: 11,
  },

  seedQuestion: {
    color: '#E8ECF6',
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '600',
    marginTop: 18,
  },

  seedDescription: {
    color: '#7786A4',
    fontSize: 13,
    lineHeight: 21,
    marginTop: 9,
  },

  footer: {
    alignItems: 'center',
    marginTop: 30,
  },

  footerLine: {
    width: 30,
    height: 1,
    marginBottom: 13,
    backgroundColor: '#26334C',
  },

  footerText: {
    color: '#46536B',
    fontSize: 11,
  },
});