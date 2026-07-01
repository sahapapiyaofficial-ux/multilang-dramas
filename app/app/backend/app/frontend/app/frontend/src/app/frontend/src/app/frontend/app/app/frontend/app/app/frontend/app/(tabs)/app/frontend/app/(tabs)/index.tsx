import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';
import { useEvent } from 'expo';
import { VideoView, useVideoPlayer, VideoPlayer } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';

import { ReelApi, Reel } from '@/src/api';
import { useAuth } from '@/src/auth';
import { colors, spacing, radius } from '@/src/theme';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');
const TAB_BAR_H = 72;

const LANGUAGES = ['All', 'English', 'Hindi', 'Spanish', 'Tamil', 'Telugu'];

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('All');
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(true);

  const ITEM_HEIGHT = SCREEN_H;

  const load = useCallback(async (lang: string) => {
    setLoading(true);
    try {
      const data = await ReelApi.list(lang === 'All' ? undefined : lang);
      setReels(data);
      setActiveIndex(0);
    } catch (e) {
      setReels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(language);
  }, [language, load]);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, [])
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      const idx = viewableItems[0].index ?? 0;
      setActiveIndex(idx);
      Haptics.selectionAsync().catch(() => {});
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;

  const handleLike = async (reel: Reel, idx: number) => {
    if (!user) {
      router.push('/auth');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const res = await ReelApi.like(reel.id);
      setReels((prev) =>
        prev.map((r, i) =>
          i === idx
            ? { ...r, liked: res.liked, likes_count: r.likes_count + (res.liked ? 1 : -1) }
            : r
        )
      );
    } catch { /* ignore */ }
  };

  const handleSave = async (reel: Reel, idx: number) => {
    if (!user) {
      router.push('/auth');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      const res = await ReelApi.toggleSave(reel.id);
      setReels((prev) => prev.map((r, i) => (i === idx ? { ...r, saved: res.saved } : r)));
    } catch { /* ignore */ }
  };

  const openComments = (reel: Reel) => {
    router.push({ pathname: '/comments/[id]', params: { id: reel.id } });
  };

  return (
    <View style={styles.container} testID=\"feed-screen\">
      {/* Sticky Language Chips */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]} testID=\"language-filter-row\">
        <Text style={styles.brand}>ReelDrama</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {LANGUAGES.map((lang) => {
            const active = language === lang;
            return (
              <Pressable
                key={lang}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setLanguage(lang);
                }}
                style={[styles.chip, active && styles.chipActive]}
                testID={`language-chip-${lang.toLowerCase()}`}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{lang}</Text>
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
          <Text style={styles.emptyText}>No reels in {language}</Text>
          <Pressable onPress={() => load(language)} style={styles.retryBtn} testID=\"feed-retry-button\">
            <Text style={styles.retryText}>Refresh</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={reels}
          keyExtractor={(r) => r.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          snapToAlignment=\"start\"
          decelerationRate=\"fast\"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewConfig}
          windowSize={3}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          getItemLayout={(_, i) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * i, index: i })}
          renderItem={({ item, index }) => (
            <ReelItem
              reel={item}
              index={index}
              active={index === activeIndex && isFocused}
              height={ITEM_HEIGHT}
              onLike={() => handleLike(item, index)}
              onSave={() => handleSave(item, index)}
              onComment={() => openComments(item)}
              bottomInset={insets.bottom + TAB_BAR_H}
              topInset={insets.top}
            />
          )}
        />
      )}
    </View>
  );
}

type ReelItemProps = {
  reel: Reel;
  index: number;
  active: boolean;
  height: number;
  onLike: () => void;
  onSave: () => void;
  onComment: () => void;
  bottomInset: number;
  topInset: number;
};

function ReelItem({ reel, active, height, onLike, onSave, onComment, bottomInset }: ReelItemProps) {
  const player = useVideoPlayer(reel.video_url, (p) => {
    p.loop = true;
    p.muted = false;
  });

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  useEffect(() => {
    if (active) {
      player.play();
    } else {
      player.pause();
      player.currentTime = 0;
    }
  }, [active, player]);

  const togglePlay = () => {
    if (isPlaying) player.pause();
    else player.play();
    Haptics.selectionAsync().catch(() => {});
  };

  const fmt = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  };

  return (
    <Pressable onPress={togglePlay} style={[styles.reelItem, { height }]} testID={`reel-item-${reel.id}`}>
      <VideoView
        style={StyleSheet.absoluteFill}
        player={player}
        contentFit=\"cover\"
        nativeControls={false}
        allowsPictureInPicture={false}
      />

      {/* Top gradient */}
      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'transparent']}
        style={styles.topGradient}
        pointerEvents=\"none\"
      />
      {/* Bottom gradient */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={styles.bottomGradient}
        pointerEvents=\"none\"
      />

      {/* Play indicator when paused */}
      {!isPlaying && active && (
        <View style={styles.playIcon} pointerEvents=\"none\">
          <Ionicons name=\"play\" size={64} color=\"rgba(255,255,255,0.9)\" />
        </View>
      )}

      {/* Right action rail */}
      <View style={[styles.actionRail, { bottom: bottomInset + spacing.lg }]}>
        <ActionButton
          icon={reel.liked ? 'heart' : 'heart-outline'}
          color={reel.liked ? colors.brand : colors.onSurface}
          count={fmt(reel.likes_count)}
          onPress={onLike}
          testID={`like-button-${reel.id}`}
        />
        <ActionButton
          icon=\"chatbubble-ellipses-outline\"
          color={colors.onSurface}
          count={fmt(reel.comments_count)}
          onPress={onComment}
          testID={`comment-button-${reel.id}`}
        />
        <ActionButton
          icon={reel.saved ? 'bookmark' : 'bookmark-outline'}
          color={reel.saved ? colors.brand : colors.onSurface}
          count=\"Save\"
          onPress={onSave}
          testID={`save-button-${reel.id}`}
        />
        <ActionButton
          icon=\"share-social-outline\"
          color={colors.onSurface}
          count=\"Share\"
          onPress={() => Haptics.selectionAsync().catch(() => {})}
          testID={`share-button-${reel.id}`}
        />
      </View>

      {/* Bottom-left info */}
      <View style={[styles.infoBox, { bottom: bottomInset + spacing.lg, right: 100 }]}>
        <View style={styles.tagsRow}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{reel.language}</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: colors.brandTertiary }]}>
            <Text style={[styles.tagText, { color: '#FFB3B8' }]}>{reel.category}</Text>
          </View>
        </View>
        <Text style={styles.title} numberOfLines={2}>{reel.title}</Text>
        <Text style={styles.desc} numberOfLines={2}>{reel.description}</Text>
      </View>
    </Pressable>
  );
}

function ActionButton({
  icon,
  color,
  count,
  onPress,
  testID,
}: {
  icon: any;
  color: string;
  count: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable onPress={onPress} style={styles.actionBtn} testID={testID}>
      <BlurView tint=\"dark\" intensity={40} style={styles.actionBlur}>
        <Ionicons name={icon} size={28} color={color} />
      </BlurView>
      <Text style={styles.actionCount}>{count}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  brand: {
    color: colors.onSurface,
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 6,
  },
  chipsRow: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  chip: {
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(23,23,23,0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    justifyContent: 'center',
    flexShrink: 0,
  },
  chipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  chipText: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: colors.onBrand, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  emptyText: { color: colors.onSurfaceTertiary, fontSize: 15 },
  retryBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
  retryText: { color: colors.onBrand, fontWeight: '600' },
  reelItem: {
    width: SCREEN_W,
    backgroundColor: '#000',
  },
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 160 },
  bottomGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 320 },
  playIcon: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  actionRail: {
    position: 'absolute',
    right: spacing.md,
    gap: spacing.lg,
    alignItems: 'center',
  },
  actionBtn: { alignItems: 'center', gap: 4 },
  actionBlur: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  actionCount: {
    color: colors.onSurface,
    fontSize: 11,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowRadius: 4,
  },
  infoBox: {
    position: 'absolute',
    left: spacing.lg,
    gap: spacing.sm,
  },
  tagsRow: { flexDirection: 'row', gap: spacing.sm },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  tagText: { color: colors.onSurface, fontSize: 11, fontWeight: '600' },
  title: {
    color: colors.onSurface,
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowRadius: 6,
  },
  desc: {
    color: colors.onSurfaceSecondary,
    fontSize: 13,
    lineHeight: 18,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowRadius: 4,
  },
});
"
Observation: Create successful: /app/frontend/app/(tabs)/index.tsx
