import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/src/auth';
import { colors, spacing, radius } from '@/src/theme';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password, name.trim() || undefined);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Authentication failed';
      setError(typeof msg === 'string' ? msg : 'Authentication failed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      testID=\"auth-screen\"
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps=\"handled\"
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn} testID=\"auth-close-button\">
            <Ionicons name=\"close\" size={22} color={colors.onSurface} />
          </Pressable>
        </View>

        <View style={styles.brandBlock}>
          <Ionicons name=\"film\" size={44} color={colors.brand} />
          <Text style={styles.brand}>ReelDrama</Text>
          <Text style={styles.tagline}>Cinematic short dramas in your language</Text>
        </View>

        <View style={styles.tabs}>
          <Pressable
            onPress={() => setMode('login')}
            style={[styles.tab, mode === 'login' && styles.tabActive]}
            testID=\"auth-tab-login\"
          >
            <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>Sign In</Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('signup')}
            style={[styles.tab, mode === 'signup' && styles.tabActive]}
            testID=\"auth-tab-signup\"
          >
            <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>Sign Up</Text>
          </Pressable>
        </View>

        <View style={styles.form}>
          {mode === 'signup' && (
            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder=\"Your name\"
                placeholderTextColor={colors.onSurfaceTertiary}
                style={styles.input}
                testID=\"auth-name-input\"
              />
            </View>
          )}
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder=\"[email protected]\"
              placeholderTextColor={colors.onSurfaceTertiary}
              keyboardType=\"email-address\"
              autoCapitalize=\"none\"
              autoCorrect={false}
              style={styles.input}
              testID=\"auth-email-input\"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder=\"••••••••\"
              placeholderTextColor={colors.onSurfaceTertiary}
              secureTextEntry
              style={styles.input}
              testID=\"auth-password-input\"
            />
          </View>

          {error && (
            <View style={styles.errBox} testID=\"auth-error\">
              <Ionicons name=\"alert-circle\" size={16} color={colors.brand} />
              <Text style={styles.errText}>{error}</Text>
            </View>
          )}

          <Pressable
            onPress={submit}
            disabled={loading}
            style={[styles.submitBtn, loading && { opacity: 0.6 }]}
            testID=\"auth-submit-button\"
          >
            {loading ? (
              <ActivityIndicator color={colors.onBrand} />
            ) : (
              <Text style={styles.submitText}>{mode === 'login' ? 'Sign In' : 'Create Account'}</Text>
            )}
          </Pressable>

          <Text style={styles.hint}>
            {mode === 'login'
              ? 'Admin? Try [email protected] / admin123'
              : 'By signing up you agree to our terms.'}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  scroll: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  headerRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  brandBlock: { alignItems: 'center', gap: 6, marginTop: spacing.lg, marginBottom: spacing.md },
  brand: { color: colors.onSurface, fontSize: 30, fontWeight: '600', letterSpacing: 0.5 },
  tagline: { color: colors.onSurfaceTertiary, fontSize: 13 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.pill,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderRadius: radius.pill },
  tabActive: { backgroundColor: colors.brand },
  tabText: { color: colors.onSurfaceSecondary, fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: colors.onBrand },
  form: { gap: spacing.md },
  field: { gap: 6 },
  label: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.onSurface,
    fontSize: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  errBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.brandTertiary,
    padding: spacing.md, borderRadius: radius.md,
  },
  errText: { color: '#FFB3B8', fontSize: 13, flex: 1 },
  submitBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitText: { color: colors.onBrand, fontSize: 15, fontWeight: '600' },
  hint: { color: colors.onSurfaceTertiary, fontSize: 12, textAlign: 'center', marginTop: spacing.sm },
});
"
Observation: Create successful: /app/frontend/app/auth.tsx
