import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, PrimaryButton, SectionTitle } from '../../components/ui';
import { getApiSettings, saveApiSettings } from '../../lib/api';
import { ChecklistTemplate, Vehicle } from '../../lib/models';
import { getAll, saveAll, STORAGE_KEYS } from '../../lib/storage';

export default function SettingsScreen() {
  const [baseUrl, setBaseUrl] = useState('');
  const [accessCode, setAccessCode] = useState('');

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleNames, setVehicleNames] = useState<Record<string, string>>({});

  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [templateText, setTemplateText] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const settings = await getApiSettings();
    setBaseUrl(settings?.baseUrl ?? '');
    setAccessCode(settings?.accessCode ?? '');

    const vs = await getAll<Vehicle>(STORAGE_KEYS.vehicles);
    setVehicles(vs);
    setVehicleNames(Object.fromEntries(vs.map((v) => [v.id, v.name])));

    const ts = await getAll<ChecklistTemplate>(STORAGE_KEYS.checklistTemplates);
    setTemplates(ts);
    setTemplateText(Object.fromEntries(ts.map((t) => [t.id, t.items.join('\n')])));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function saveServer() {
    await saveApiSettings({ baseUrl, accessCode });
    Alert.alert('Saved', 'Sales order server settings updated.');
  }

  async function saveVehicles() {
    const updated = vehicles.map((v) => ({ ...v, name: vehicleNames[v.id]?.trim() || v.name }));
    await saveAll(STORAGE_KEYS.vehicles, updated);
    setVehicles(updated);
    Alert.alert('Saved', 'Vehicle names updated.');
  }

  async function saveTemplates() {
    const updated = templates.map((t) => ({
      ...t,
      items: (templateText[t.id] ?? '').split('\n').map((s) => s.trim()).filter(Boolean),
    }));
    await saveAll(STORAGE_KEYS.checklistTemplates, updated);
    setTemplates(updated);
    Alert.alert('Saved', 'Checklist templates updated.');
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.listContent}>
        <SectionTitle>Sales order server</SectionTitle>
        <Card>
          <Text style={styles.label}>Server URL</Text>
          <TextInput
            style={styles.input}
            placeholder="https://fieldops.example.com"
            autoCapitalize="none"
            autoCorrect={false}
            value={baseUrl}
            onChangeText={setBaseUrl}
          />
          <Text style={styles.label}>Access code</Text>
          <TextInput
            style={styles.input}
            placeholder="Shared team code"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            value={accessCode}
            onChangeText={setAccessCode}
          />
          <PrimaryButton label="Save Server Settings" onPress={saveServer} />
        </Card>

        <SectionTitle>Vehicles</SectionTitle>
        <Card>
          {vehicles.map((v) => (
            <View key={v.id} style={{ marginBottom: 12 }}>
              <TextInput
                style={styles.input}
                value={vehicleNames[v.id] ?? ''}
                onChangeText={(text) => setVehicleNames((prev) => ({ ...prev, [v.id]: text }))}
              />
            </View>
          ))}
          <PrimaryButton label="Save Vehicle Names" onPress={saveVehicles} />
        </Card>

        <SectionTitle>Checklist templates</SectionTitle>
        {templates.map((t) => (
          <Card key={t.id}>
            <Text style={styles.label}>{t.type === 'vehicle' ? 'Vehicle checklist' : 'Office checklist'} (one item per line)</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              multiline
              value={templateText[t.id] ?? ''}
              onChangeText={(text) => setTemplateText((prev) => ({ ...prev, [t.id]: text }))}
            />
          </Card>
        ))}
        <PrimaryButton label="Save Checklist Templates" onPress={saveTemplates} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  listContent: { padding: 16, gap: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#6B6B70', marginBottom: 6 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C7C7CC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  multiline: { minHeight: 160, textAlignVertical: 'top' },
});
