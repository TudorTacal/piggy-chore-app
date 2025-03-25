import { Stack } from 'expo-router';

export default function ChildrenLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'My Children',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="add"
        options={{
          title: 'Add Child',
          presentation: 'modal',
          headerShown: false,
        }}
      />
    </Stack>
  );
}