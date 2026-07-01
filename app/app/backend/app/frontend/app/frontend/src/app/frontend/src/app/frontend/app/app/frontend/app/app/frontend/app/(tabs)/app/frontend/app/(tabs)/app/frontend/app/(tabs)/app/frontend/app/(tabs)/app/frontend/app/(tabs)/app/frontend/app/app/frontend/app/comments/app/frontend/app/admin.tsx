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
import { Redirect, useRouter } from 'expo-router';

import { ReelApi } from '@/src/api';
import { useAuth } from '@/src/auth';
import { colors, spacing, radius } from '@/src/theme';

const LANGS = ['English', 'Hindi', 'Spanish', 'Tamil', 'Telugu'];
const CATS = ['Romance', 'Thriller', 'Drama', 'Comedy'];

export default function AdminUploadScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumb, setThumb] = useState('');
  const [language, setLanguage] = useState('English');
  const [category, setCategory] = useState('Romance');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!user) return <Redirect href=\"/auth\" />;
  if (user.role !== 'admin') return <Redirect href=\"/(tabs)\" />;

  const submit = async () => {
    if (!title || !videoUrl || !thumb) {
      setMsg('Title, video URL and thumbnail are required');
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      await ReelApi.create({
        title, description, video_url: videoUrl, thumbnail_url: thumb,
        language, category, duration: 60,
      });
      setMsg('Reel uploaded successfully!');
      setTitle(''); setDescription(''); setVideoUrl(''); setThumb('');
    } catch (e: any) {
      setMsg(e?.response?.data?.detail || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      testID=\"admin-screen\"
    >
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.md }}
        keyboardShouldPersistTaps=\"handled\"
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} testID=\"admin-back\">
            <Ionicons name=\"chevron-back\" size={26} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.title}>Upload Reel</Text>
          <View style={{ width: 26 }} />
        </View>

        <Field label=\"Title\" value={title} onChangeText={setTitle} testID=\"admin-title\" />
        <Field label=\"Description\" value={description} onChangeText={setDescription} multiline testID=\"admin-desc\" />
        <Field label=\"Video URL (mp4)\" value={videoUrl} onChangeText={setVideoUrl} testID=\"admin-video\" />
        <Field label=\"Thumbnail URL\" value={thumb} onChangeText={setThumb} testID=\"admin-thumb\" />

        <Text style={styles.label}>Language</Text>
        <View style={styles.pillRow}>
          {LANGS.map((l) => (
            <Pressable
              key={l}
              onPress={() => setLanguage(l)}
              style={[styles.pill, language === l && styles.pillActive]}
              testID={`admin-lang-${l.toLowerCase()}`}
            >
              <Text style={[styles.pillText, language === l && styles.pillTextActive]}>{l}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Category</Text>
        <View style={styles.pillRow}>
          {CATS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              style={[styles.pill, category === c && styles.pillActive]}
              testID={`admin-cat-${c.toLowerCase()}`}
            >
              <Text style={[styles.pillText, category === c && styles.pillTextActive]}>{c}</Text>
            </Pressable>
          ))}
        </View>

        {msg && <Text style={styles.msg}>{msg}</Text>}

        <Pressable
          style={[styles.submit, loading && { opacity: 0.6 }]}
          onPress={submit}
          disabled={loading}
          testID=\"admin-submit\"
        >
          {loading ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.submitText}>Upload Reel</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, testID, multiline, ...props }: any) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={colors.onSurfaceTertiary}
        style={[styles.input, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
        testID={testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  title: { color: colors.onSurface, fontSize: 20, fontWeight: '600' },
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
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pillActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  pillText: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: '500' },
  pillTextActive: { color: colors.onBrand, fontWeight: '600' },
  msg: { color: colors.onSurfaceSecondary, textAlign: 'center', fontSize: 13 },
  submit: {
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  submitText: { color: colors.onBrand, fontWeight: '600', fontSize: 15 },
});
"
Observation: Create successful: /app/frontend/app/admin.tsx
