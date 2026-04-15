import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

export default function AppLayout() {
  return (
    <NativeTabs tintColor="#FF9500" initialRouteName="(recipes)">
      <NativeTabs.Trigger name="(recipes)">
        <Icon sf="fork.knife" />
        <Label>Recetas</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(events)">
        <Icon sf="calendar" />
        <Label>Eventos</Label>
      </NativeTabs.Trigger>
    </NativeTabs>

  );
}
