import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ReelApi, Comment } from '@/src/api';
import { useAuth } from '@/src/auth';
import { colors, spacing, radius } from '@/src/theme';

export default function CommentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await ReelApi.comments(id);
      setComments(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const send = async () => {
    if (!id || !text.trim()) return;
    if (!user) { router.replace('/auth'); return; }
    setSending(true);
    try {
      const c = await ReelApi.addComment(id, text.trim());
      setComments((p) => [c, ...p]);
      setText('');
    } catch { /* ignore */ }
    finally { setSending(false); }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      testID=\"comments-screen\"
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.title}>Comments</Text>
        <Pressable onPress={() => router.back()} style={styles.closeBtn} testID=\"comments-close\">
          <Ionicons name=\"close\" size={22} color={colors.onSurface} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
      ) : comments.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name=\"chatbubbles-outline\" size={54} color={colors.onSurfaceTertiary} />
          <Text style={styles.empty}>No comments yet. Be first.</Text>
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          renderItem={({ item }) => (
            <View style={styles.comment}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.user_name[0]?.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.commentAuthor}>{item.user_name}</Text>
                <Text style={styles.commentText}>{item.text}</Text>
              </View>
            </View>
          )}
        />
      )}

      <View style={[styles.inputBar, { paddingBottom: insets.bottom + spacing.md }]}>
        {!user ? (
          <Pressable
            style={styles.signinBar}
            onPress={() => router.replace('/auth')}
            testID=\"comments-signin-button\"
          >
            <Text style={styles.signinText}>Sign in to comment</Text>
          </Pressable>
        ) : (
          <View style={styles.inputRow}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder=\"Add a comment...\"
              placeholderTextColor={colors.onSurfaceTertiary}
              style={styles.input}
              testID=\"comments-input\"
            />
            <Pressable
              onPress={send}
              disabled={sending || !text.trim()}
              style={[styles.sendBtn, (sending || !text.trim()) && { opacity: 0.4 }]}
              testID=\"comments-send-button\"
            >
              <Ionicons name=\"arrow-up\" size={20} color={colors.onBrand} />
            </Pressable>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: { color: colors.onSurface, fontSize: 18, fontWeight: '600' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  empty: { color: colors.onSurfaceTertiary, fontSize: 14 },
  comment: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.onBrand, fontWeight: '600' },
  commentAuthor: { color: colors.onSurface, fontSize: 13, fontWeight: '600', marginBottom: 2 },
  commentText: { color: colors.onSurfaceSecondary, fontSize: 14, lineHeight: 19 },
  inputBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.onSurface,
    fontSize: 14,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  signinBar: {
    backgroundColor: colors.brand,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  signinText: { color: colors.onBrand, fontWeight: '600' },
});
"
Observation: Create successful: /app/frontend/app/comments/[id].tsx
