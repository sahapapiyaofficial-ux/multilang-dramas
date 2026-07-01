import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';

import { ReelApi, Reel } from '@/src/api';
import { useAuth } from '@/src/auth';
import { colors, spacing, radius } from '@/src/theme';

export default function WatchlistScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setReels([]);
      return;
    }
    setLoading(true);
    try {
      const data = await ReelApi.watchlist();
      setReels(data);
    } catch {
      setReels([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + spacing.md }]} testID=\"watchlist-screen\">
        <Text style={styles.header}>Watchlist</Text>
        <View style={styles.emptyState}>
          <Ionicons name=\"bookmark-outline\" size={72} color={colors.onSurfaceTertiary} />
          <Text style={styles.emptyTitle}>Sign in to save dramas</Text>
          <Text style={styles.emptySub}>Your saved reels will live here.</Text>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => router.push('/auth')}
            testID=\"watchlist-signin-button\"
          >
            <Text style={styles.primaryBtnText}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]} testID=\"watchlist-screen\">
      <Text style={styles.header}>Watchlist</Text>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} size=\"large\" />
        </View>
      ) : reels.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name=\"bookmark-outline\" size={72} color={colors.onSurfaceTertiary} />
          <Text style={styles.emptyTitle}>Your watchlist is quiet</Text>
          <Text style={styles.emptySub}>Add some drama.</Text>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => router.push('/(tabs)/discover')}
            testID=\"watchlist-discover-button\"
          >
            <Text style={styles.primaryBtnText}>Go to Discover</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={reels}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 120, gap: spacing.md }}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push('/(tabs)')}
              testID={`watchlist-item-${item.id}`}
            >
              <Image
                source={{ uri: item.thumbnail_url }}
                style={styles.thumb}
                contentFit=\"cover\"
                transition={200}
              />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.rowTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.rowDesc} numberOfLines={2}>{item.description}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.meta}>{item.language}</Text>
                  <View style={styles.dot} />
                  <Text style={styles.meta}>{item.category}</Text>
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    color: colors.onSurface,
    fontSize: 32,
    fontWeight: '600',
    letterSpacing: 0.3,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
  emptyTitle: { color: colors.onSurface, fontSize: 20, fontWeight: '600' },
  emptySub: { color: colors.onSurfaceTertiary, fontSize: 14 },
  primaryBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
  primaryBtnText: { color: colors.onBrand, fontWeight: '600', fontSize: 15 },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  thumb: {
    width: 110, height: 74, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary,
  },
  rowTitle: { color: colors.onSurface, fontSize: 15, fontWeight: '600' },
  rowDesc: { color: colors.onSurfaceTertiary, fontSize: 12, lineHeight: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  meta: { color: colors.onSurfaceSecondary, fontSize: 11, fontWeight: '500' },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.onSurfaceTertiary },
});
"
Observation: Create successful: /app/frontend/app/(tabs)/watchlist.tsx
