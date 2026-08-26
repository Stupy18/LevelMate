import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { screenGradient } from '../../lib/theme';

/**
 * Wraps a screen's content with the subtle tinted-gradient background so cards
 * and inputs read as elevated surfaces on top of it. Purely visual — renders
 * children unchanged, just behind an absolute-fill gradient.
 */
export default function ScreenBackground({ children }: { children: ReactNode }) {
  return (
    <View style={styles.fill}>
      <LinearGradient
        colors={screenGradient.colors}
        start={screenGradient.start}
        end={screenGradient.end}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
