import { Tabs, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';

function SettingsButton() {
  return (
    <Link href="/settings" asChild>
      <Pressable hitSlop={12} style={{ marginRight: 12 }}>
        <Ionicons name="settings-outline" size={22} />
      </Pressable>
    </Link>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerRight: () => <SettingsButton /> }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="flha"
        options={{
          title: 'FLHA',
          tabBarIcon: ({ color, size }) => <Ionicons name="shield-checkmark-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="inspections"
        options={{
          title: 'Inspections',
          tabBarIcon: ({ color, size }) => <Ionicons name="checkbox-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => <Ionicons name="cube-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="receiving"
        options={{
          title: 'Receiving',
          tabBarIcon: ({ color, size }) => <Ionicons name="archive-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
