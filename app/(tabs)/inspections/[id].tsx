import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, PrimaryButton, SecondaryButton, StatusPill } from '../../../components/ui';
import { ChecklistTemplate, InspectionRecord, Vehicle } from '../../../lib/models';
import { getAll, newId, upsert, STORAGE_KEYS } from '../../../lib/storage';
import { capturePhoto, sharePhoto } from '../../../lib/attachments';
import { currentMonthKey } from '../../../lib/dates';
import { autoCloseMatchingRequest } from '../../../lib/api';

export default function InspectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isOffice = id === 'office';

  const [title, setTitle] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [template, setTemplate] = useState<ChecklistTemplate | null>(null);
  const [record, setRecord] = useState<InspectionRecord | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const templates = await getAll<ChecklistTemplate>(STORAGE_KEYS.checklistTemplates);
    const records = await getAll<InspectionRecord>(STORAGE_KEYS.inspections);
    const period = currentMonthKey();

    if (isOffice) {
      setTitle('Office Inspection');
      setTemplate(templates.find((t) => t.type === 'office') ?? null);
      const existing = records.find((r) => r.templateType === 'office' && r.periodKey === period);
      setRecord(existing ?? null);
      setChecked(new Set(existing?.checkedItems ?? []));
      setNotes(existing?.notes ?? '');
    } else {
      const vehicles = await getAll<Vehicle>(STORAGE_KEYS.vehicles);
      const vehicle = vehicles.find((v) => v.id === id);
      setTitle(vehicle ? `${vehicle.name} Inspection` : 'Vehicle Inspection');
      setVehicleName(vehicle?.name ?? '');
      setTemplate(templates.find((t) => t.type === 'vehicle') ?? null);
      const existing = records.find(
        (r) => r.templateType === 'vehicle' && r.vehicleId === id && r.periodKey === period
      );
      setRecord(existing ?? null);
      setChecked(new Set(existing?.checkedItems ?? []));
      setNotes(existing?.notes ?? '');
    }
  }, [id, isOffice]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function toggleItem(item: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }

  async function completeInspection() {
    if (!template) return;
    setBusy(true);
    try {
      const photoUri = await capturePhoto();
      const base: InspectionRecord = {
        id: record?.id ?? newId(),
        templateType: isOffice ? 'office' : 'vehicle',
        vehicleId: isOffice ? undefined : (id as string),
        periodKey: currentMonthKey(),
        status: 'completed',
        checkedItems: Array.from(checked),
        notes: notes.trim() || undefined,
        photoUri: photoUri ?? record?.photoUri,
        completedAt: new Date().toISOString(),
      };
      await upsert(STORAGE_KEYS.inspections, base);
      if (photoUri) {
        await sharePhoto(photoUri, `Send ${title} to Safety`);
        await upsert(STORAGE_KEYS.inspections, { ...base, sharedAt: new Date().toISOString() });
      }
      await autoCloseMatchingRequest(
        isOffice ? 'office_inspection' : 'vehicle_inspection',
        isOffice ? undefined : vehicleName
      );
      router.back();
    } finally {
      setBusy(false);
    }
  }

  if (!template) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.empty}>Loading checklist…</Text>
      </SafeAreaView>
    );
  }

  const allChecked = template.items.every((item) => checked.has(item));

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.listContent}>
        <Card>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>{title}</Text>
            {record?.status === 'completed' ? <StatusPill label="Completed" tone="ok" /> : null}
          </View>
          {template.items.map((item) => {
            const isChecked = checked.has(item);
            return (
              <Pressable key={item} onPress={() => toggleItem(item)} style={styles.checklistRow}>
                <Ionicons
                  name={isChecked ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={isChecked ? '#34C759' : '#8A8A8E'}
                />
                <Text style={styles.checklistLabel}>{item}</Text>
              </Pressable>
            );
          })}
        </Card>

        <Card>
          <Text style={styles.notesLabel}>Notes</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Anything to flag…"
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </Card>

        {record?.photoUri ? (
          <Card>
            <Text style={styles.notesLabel}>Attached photo</Text>
            <Image source={{ uri: record.photoUri }} style={styles.photo} />
          </Card>
        ) : null}

        <PrimaryButton
          label={allChecked ? 'Complete, Photograph & Send' : `Complete (${checked.size}/${template.items.length} checked)`}
          onPress={completeInspection}
          disabled={busy}
        />
        <SecondaryButton label="Save Without Completing" onPress={async () => {
          if (!template) return;
          const base: InspectionRecord = {
            id: record?.id ?? newId(),
            templateType: isOffice ? 'office' : 'vehicle',
            vehicleId: isOffice ? undefined : (id as string),
            periodKey: currentMonthKey(),
            status: record?.status ?? 'pending',
            checkedItems: Array.from(checked),
            notes: notes.trim() || undefined,
            photoUri: record?.photoUri,
            completedAt: record?.completedAt,
          };
          await upsert(STORAGE_KEYS.inspections, base);
          router.back();
        }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  listContent: { padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  checklistLabel: { fontSize: 15, flex: 1 },
  notesLabel: { fontSize: 13, fontWeight: '600', color: '#6B6B70', marginBottom: 8 },
  notesInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C7C7CC',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 15,
  },
  photo: { width: '100%', height: 200, borderRadius: 8, backgroundColor: '#E5E5EA' },
  empty: { textAlign: 'center', color: '#8A8A8E', marginTop: 24 },
});
