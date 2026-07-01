import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { ReelApi, Reel } from '@/src/api';
import { colors, spacing, radius } from '@/src/theme';

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_GAP = spacing.md;
const CARD_W = (SCREEN_W - spacing.lg * 2 - GRID_GAP) / 2;
const CATEGORIES = ['All', 'Romance', 'Thriller', 'Drama', 'Comedy'];

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');

  const load = useCallback(async (cat: string) => {
    setLoading(true);
    try {
      const data = await ReelApi.list(undefined, cat === 'All' ? undefined : cat);
      setReels(data);
    } catch {
      setReels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(category);
  }, [category, load]);

  const renderItem = ({ item, index }: { item: Reel; index: number }) => {
    // Bento: every 5th card is larger (full width)
    const isLarge = index % 5 === 0;
    const width = isLarge ? SCREEN_W - spacing.lg * 2 : CARD_W;
    const height = isLarge ? 240 : 220;
    return (
      <Pressable
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          router.push('/(tabs)');
        }}
        style={[styles.card, { width, height }]}
        testID={`discover-card-${item.id}`}
      >
        <Image
          source={{ uri: item.thumbnail_url }}
          style={StyleSheet.absoluteFillObject}
          contentFit=\"cover\"
          transition={200}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.9)']}
          style={styles.cardGradient}
        />
        <View style={styles.cardMeta}>
          <View style={styles.langPill}>
            <Text style={styles.langPillText}>{item.language}</Text>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          <View style={styles.cardStatsRow}>
            <Ionicons name=\"heart\" size={12} color={colors.brand} />
            <Text style={styles.cardStats}>{item.likes_count}</Text>
            <Ionicons name=\"eye\" size={12} color={colors.onSurfaceTertiary} style={{ marginLeft: 8 }} />
            <Text style={styles.cardStats}>{item.views}</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]} testID=\"discover-screen\">
      <Text style={styles.header}>Discover</Text>

      <View testID=\"category-filter-row\">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          style={{ maxHeight: 56 }}
        >
          {CATEGORIES.map((cat) => {
            const active = category === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                style={[styles.chip, active && styles.chipActive]}
                testID={`category-chip-${cat.toLowerCase()}`}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} size=\"large\" />
        </View>
      ) : reels.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name=\"film-outline\" size={64} color={colors.onSurfaceTertiary} />
          <Text style={styles.emptyText}>No dramas in {category}</Text>
        </View>
      ) : (
        <FlatList
          data={reels}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={{ gap: GRID_GAP }}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: 120,
            gap: GRID_GAP,
          }}
          showsVerticalScrollIndicator={false}
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
  chipsRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    height: 56,
  },
  chip: {
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    justifyContent: 'center',
    flexShrink: 0,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: colors.onBrand, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  emptyText: { color: colors.onSurfaceTertiary, fontSize: 15 },
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSecondary,
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '70%',
  },
  cardMeta: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    gap: 6,
  },
  langPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  langPillText: { color: colors.onSurface, fontSize: 10, fontWeight: '600' },
  cardTitle: { color: colors.onSurface, fontSize: 15, fontWeight: '600', lineHeight: 19 },
  cardStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardStats: { color: colors.onSurfaceTertiary, fontSize: 11, fontWeight: '500' },
});
"
Observation: Create successful: /app/frontend/app/(tabs)/discover.tsx
