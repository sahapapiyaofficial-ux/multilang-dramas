import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/src/auth';
import { colors, spacing, radius } from '@/src/theme';

const HERO_IMG = 'https://images.unsplash.com/photo-1780764818559-1dd2205ea2c5?w=800&q=80';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const initials = user?.name
    ? user.name
        .split(' ')
        .slice(0, 2)
        .map((s) => s[0]?.toUpperCase())
        .join('')
    : user?.email?.[0]?.toUpperCase() || '?';

  return (
    <View style={styles.container} testID=\"profile-screen\">
      {/* Hero */}
      <View style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}>
        <Image source={{ uri: HERO_IMG }} style={StyleSheet.absoluteFillObject} contentFit=\"cover\" />
        <LinearGradient
          colors={['rgba(10,10,10,0.5)', 'rgba(10,10,10,0.95)']}
          style={StyleSheet.absoluteFillObject}
        />
        {user ? (
          <View style={styles.heroInner}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.name}>{user.name || user.email.split('@')[0]}</Text>
            <Text style={styles.emailText}>{user.email}</Text>
            {user.role === 'admin' && (
              <View style={styles.adminBadge}>
                <Ionicons name=\"shield-checkmark\" size={12} color={colors.brand} />
                <Text style={styles.adminText}>Admin</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.heroInner}>
            <Ionicons name=\"film\" size={48} color={colors.brand} />
            <Text style={styles.name}>Welcome to ReelDrama</Text>
            <Text style={styles.emailText}>Sign in to like, save & comment</Text>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                router.push('/auth');
              }}
              testID=\"profile-signin-button\"
            >
              <Text style={styles.primaryBtnText}>Sign In / Sign Up</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        <MenuRow
          icon=\"language\"
          label=\"Languages\"
          sub=\"English, Hindi, Spanish, Tamil, Telugu\"
          testID=\"menu-languages\"
        />
        <MenuRow icon=\"film-outline\" label=\"My Watchlist\" onPress={() => router.push('/(tabs)/watchlist')} testID=\"menu-watchlist\" />
        {user?.role === 'admin' && (
          <MenuRow
            icon=\"cloud-upload-outline\"
            label=\"Admin Upload\"
            onPress={() => router.push('/admin')}
            testID=\"menu-admin-upload\"
          />
        )}
        <MenuRow icon=\"information-circle-outline\" label=\"About ReelDrama\" testID=\"menu-about\" />
        {user && (
          <MenuRow
            icon=\"log-out-outline\"
            label=\"Sign Out\"
            danger
            onPress={async () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
              await signOut();
            }}
            testID=\"menu-signout\"
          />
        )}
      </View>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  sub,
  onPress,
  danger,
  testID,
}: {
  icon: any;
  label: string;
  sub?: string;
  onPress?: () => void;
  danger?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.7 }]}
      onPress={onPress}
      testID={testID}
    >
      <View style={[styles.menuIcon, danger && { backgroundColor: 'rgba(229,9,20,0.15)' }]}>
        <Ionicons name={icon} size={20} color={danger ? colors.brand : colors.onSurfaceSecondary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuLabel, danger && { color: colors.brand }]}>{label}</Text>
        {sub && <Text style={styles.menuSub}>{sub}</Text>}
      </View>
      <Ionicons name=\"chevron-forward\" size={18} color={colors.onSurfaceTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  hero: {
    height: 280,
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
  },
  heroInner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.brand,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: { color: colors.onBrand, fontSize: 26, fontWeight: '600' },
  name: { color: colors.onSurface, fontSize: 22, fontWeight: '600' },
  emailText: { color: colors.onSurfaceSecondary, fontSize: 13 },
  adminBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.pill,
  },
  adminText: { color: colors.brand, fontSize: 11, fontWeight: '600' },
  primaryBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
  primaryBtnText: { color: colors.onBrand, fontWeight: '600', fontSize: 15 },
  menu: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.sm },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  menuIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.surfaceTertiary,
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { color: colors.onSurface, fontSize: 15, fontWeight: '500' },
  menuSub: { color: colors.onSurfaceTertiary, fontSize: 12, marginTop: 2 },
});
"
Observation: Create successful: /app/frontend/app/(tabs)/profile.tsx
