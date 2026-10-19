import {
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type DreamAudioPlayerProps = {
  uri: string;
  durationMillis?: number;
};

export function DreamAudioPlayer({
  uri,
  durationMillis,
}: DreamAudioPlayerProps) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  const togglePlayback = async () => {
    if (status.playing) {
      player.pause();
      return;
    }

    if (
      status.duration > 0 &&
      status.currentTime >= status.duration - 0.1
    ) {
      await player.seekTo(0);
    }

    player.play();
  };

  const formatDuration = (milliseconds?: number) => {
    const totalSeconds = Math.max(
      0,
      Math.round((milliseconds ?? 0) / 1000)
    );
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <View style={styles.card}>
      <Pressable
        onPress={togglePlayback}
        style={({ pressed }) => [
          styles.playButton,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.playIcon}>
          {status.playing ? 'Ⅱ' : '▶'}
        </Text>
      </Pressable>

      <View style={styles.infoArea}>
        <Text style={styles.title}>
          {status.playing ? '正在播放录音' : '语音梦境记录'}
        </Text>

        <Text style={styles.duration}>
          {formatDuration(
            status.duration > 0
              ? status.duration * 1000
              : durationMillis
          )}
        </Text>
      </View>

      <View style={styles.wave}>
        <View style={styles.waveLineShort} />
        <View style={styles.waveLineTall} />
        <View style={styles.waveLineMedium} />
        <View style={styles.waveLineTall} />
        <View style={styles.waveLineShort} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    padding: 17,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#31436B',
    backgroundColor: '#111B31',
  },

  playButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#526FCA',
  },

  playIcon: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  infoArea: {
    flex: 1,
    marginLeft: 13,
  },

  title: {
    color: '#DDE5F5',
    fontSize: 13,
    fontWeight: '700',
  },

  duration: {
    color: '#71809E',
    fontSize: 11,
    marginTop: 5,
  },

  wave: {
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },

  waveLineShort: {
    width: 3,
    height: 10,
    marginHorizontal: 2,
    borderRadius: 2,
    backgroundColor: '#5F78B9',
  },

  waveLineMedium: {
    width: 3,
    height: 18,
    marginHorizontal: 2,
    borderRadius: 2,
    backgroundColor: '#7793D8',
  },

  waveLineTall: {
    width: 3,
    height: 26,
    marginHorizontal: 2,
    borderRadius: 2,
    backgroundColor: '#91AAF0',
  },

  pressed: {
    opacity: 0.75,
  },
});
