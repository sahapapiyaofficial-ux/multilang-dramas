import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View } from 'react-native';

import { colors } from '@/src/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.onSurfaceTertiary,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500', marginBottom: 4 },
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(10,10,10,0.92)',
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 72,
          paddingTop: 6,
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView tint=\"dark\" intensity={80} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,10,10,0.94)' }]} />
          ),
      }}
    >
      <Tabs.Screen
        name=\"index\"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size }) => <Ionicons name=\"play-circle\" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name=\"discover\"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, size }) => <Ionicons name=\"grid\" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name=\"watchlist\"
        options={{
          title: 'Watchlist',
          tabBarIcon: ({ color, size }) => <Ionicons name=\"bookmark\" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name=\"profile\"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name=\"person-circle\" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
"
Observation: Create successful: /app/frontend/app/(tabs)/_layout.tsx
