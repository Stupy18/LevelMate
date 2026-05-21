import { Tabs } from 'expo-router';
import { Text } from 'react-native';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Discover: '🧭',
    'My Games': '📅',
    Create: '⊕',
    Profile: '👤',
  };
  return (
    <Text style={{ fontSize: label === 'Create' ? 28 : 22, opacity: focused ? 1 : 0.5 }}>
      {icons[label]}
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1A1A24',
          borderTopColor: '#2A2A3A',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#6C47FF',
        tabBarInactiveTintColor: '#9B9BAE',
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ focused }) => <TabIcon label="Discover" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="my-games"
        options={{
          title: 'My Games',
          tabBarIcon: ({ focused }) => <TabIcon label="My Games" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarIcon: ({ focused }) => <TabIcon label="Create" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon label="Profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
