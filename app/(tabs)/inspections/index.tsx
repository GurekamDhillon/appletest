import { useCallback, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, StatusPill, PillTone } from '../../../components/ui';
import { InspectionRecord, Vehicle } from '../../../lib/models';
import { getAll, STORAGE_KEYS } from '../../../lib/storage';
import { currentMonthKey, daysUntilThe20th } from '../../../lib/dates';

interface Row {
  key: string;
  title: string;
  record?: InspectionRecord;
}

export default function InspectionsScreen() {
  const [rows, setRows] = useState<Row[]>([]);

  const load = useCallback(async () => {
    const vehicles = await getAll<Vehicle>(STORAGE_KEYS.vehicles);
    const records = await getAll<InspectionRecord>(STORAGE_KEYS.inspections);
    const period = currentMonthKey();

    const vehicleRows: Row[] = vehicles.map((v) => ({
      key: v.id,
      title: `${v.name} Inspection`,
      record: records.find(
        (r) => r.templateType === 'vehicle' && r.vehicleId === v.id && r.periodKey === period
      ),
    }));

    const officeRow: Row = {
      key: 'office',
      title: 'Office Inspection',
      record: records.find((r) => r.templateType === 'office' && r.periodKey === period),
    };

    setRows([...vehicleRows, officeRow]);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const daysLeft = daysUntilThe20th();

  function statusFor(row: Row): { label: string; tone: PillTone } {
    if (row.record?.status === 'completed') return { label: 'Done', tone: 'ok' };
    if (daysLeft < 0) return { label: 'Overdue', tone: 'danger' };
    if (daysLeft <= 5) return { label: `Due in ${daysLeft}d`, tone: 'warning' };
    return { label: `Due in ${daysLeft}d`, tone: 'neutral' };
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={rows}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => {
          const status = statusFor(item);
          return (
            <Link href={{ pathname: '/inspections/[id]', params: { id: item.key } }} asChild>
              <Pressable>
                <Card style={styles.row}>
                  <Text style={styles.title}>{item.title}</Text>
                  <StatusPill label={status.label} tone={status.tone} />
                </Card>
              </Pressable>
            </Link>
          );
        }}
        ListHeaderComponent={<Text style={styles.hint}>Due by the 20th, every month.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  listContent: { padding: 16 },
  hint: { color: '#6B6B70', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '600' },
});
