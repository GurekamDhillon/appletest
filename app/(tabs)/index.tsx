import { useCallback, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, PillTone, StatusPill } from '../../components/ui';
import {
  FlhaEntry,
  InspectionRecord,
  PackingSlip,
  Vehicle,
} from '../../lib/models';
import { getAll, STORAGE_KEYS } from '../../lib/storage';
import { ApiNotConfiguredError, getOrders, getRequests } from '../../lib/api';
import { REQUEST_TYPE_LABELS } from '../../lib/models';
import { currentMonthKey, currentWeekKey, daysSince, daysUntilThe20th } from '../../lib/dates';
import { recomputeReminders } from '../../lib/notifications';

interface DashRow {
  key: string;
  href: string;
  title: string;
  subtitle: string;
  tone: PillTone;
  urgency: number; // higher = more urgent, controls sort order
}

const TONE_URGENCY: Record<PillTone, number> = { danger: 3, warning: 2, neutral: 1, ok: 0 };

export default function HomeScreen() {
  const [rows, setRows] = useState<DashRow[]>([]);

  const load = useCallback(async () => {
    const [flhaEntries, inspections, vehicles, packingSlips] = await Promise.all([
      getAll<FlhaEntry>(STORAGE_KEYS.flhaEntries),
      getAll<InspectionRecord>(STORAGE_KEYS.inspections),
      getAll<Vehicle>(STORAGE_KEYS.vehicles),
      getAll<PackingSlip>(STORAGE_KEYS.packingSlips),
    ]);

    const period = currentMonthKey();
    const daysLeft = daysUntilThe20th();
    const result: DashRow[] = [];

    // FLHA
    const doneThisWeek = flhaEntries.filter(
      (e) => currentWeekKey(new Date(e.date)) === currentWeekKey()
    ).length;
    result.push({
      key: 'flha',
      href: '/flha',
      title: 'FLHA',
      subtitle: `${doneThisWeek} of 2 this week`,
      tone: doneThisWeek >= 2 ? 'ok' : new Date().getDay() >= 3 ? 'warning' : 'neutral',
      urgency: doneThisWeek >= 2 ? 0 : new Date().getDay() >= 3 ? 2 : 1,
    });

    // Monthly inspections: Truck, Van, Office
    const inspectionTargets: { key: string; label: string; templateType: 'vehicle' | 'office'; vehicleId?: string }[] =
      [
        ...vehicles.map((v) => ({ key: v.id, label: `${v.name} Inspection`, templateType: 'vehicle' as const, vehicleId: v.id })),
        { key: 'office', label: 'Office Inspection', templateType: 'office' as const },
      ];
    let monthlyDone = 0;
    for (const target of inspectionTargets) {
      const record = inspections.find(
        (r) =>
          r.templateType === target.templateType &&
          r.periodKey === period &&
          (target.templateType === 'office' || r.vehicleId === target.vehicleId)
      );
      const done = record?.status === 'completed';
      if (done) monthlyDone += 1;
      const tone: PillTone = done ? 'ok' : daysLeft < 0 ? 'danger' : daysLeft <= 5 ? 'warning' : 'neutral';
      result.push({
        key: `inspection-${target.key}`,
        href: `/inspections/${target.key}`,
        title: target.label,
        subtitle: done ? 'Completed' : daysLeft < 0 ? 'Overdue' : `Due in ${daysLeft}d`,
        tone,
        urgency: TONE_URGENCY[tone],
      });
    }

    // Receiving
    const unsent = packingSlips.filter((s) => !s.submittedAt).length;
    result.push({
      key: 'receiving',
      href: '/receiving',
      title: 'Packing slips',
      subtitle: unsent === 0 ? 'All sent' : `${unsent} not sent`,
      tone: unsent === 0 ? 'ok' : 'warning',
      urgency: unsent === 0 ? 0 : 2,
    });

    // Sales orders
    try {
      const orders = await getOrders();
      const active = orders.filter((o) => !o.cancelled);
      const stuck = active.filter((o) => {
        if (o.stage !== 'collected' && o.stage !== 'delivered') return false;
        const last = o.stageHistory[o.stageHistory.length - 1];
        return last ? daysSince(last.at) >= 3 : false;
      }).length;
      result.push({
        key: 'orders',
        href: '/orders',
        title: 'Sales orders',
        subtitle: stuck === 0 ? `${active.length} open` : `${stuck} stuck >3 days`,
        tone: stuck === 0 ? 'neutral' : 'danger',
        urgency: stuck === 0 ? 0 : 3,
      });
    } catch (err) {
      if (!(err instanceof ApiNotConfiguredError)) {
        result.push({
          key: 'orders',
          href: '/orders',
          title: 'Sales orders',
          subtitle: 'Failed to load — tap to retry',
          tone: 'warning',
          urgency: 2,
        });
      }
    }

    // Staff-requested paperwork (best-effort -- skip silently if not configured)
    try {
      const requests = await getRequests();
      const today = new Date();
      for (const r of requests) {
        if (r.status !== 'open') continue;
        const daysUntilDue = r.dueDate
          ? Math.ceil((new Date(r.dueDate).getTime() - today.getTime()) / 86400000)
          : undefined;
        const tone: PillTone =
          daysUntilDue === undefined ? 'neutral' : daysUntilDue < 0 ? 'danger' : daysUntilDue <= 2 ? 'warning' : 'neutral';
        let href = '/receiving';
        if (r.type === 'flha') href = '/flha';
        else if (r.type === 'office_inspection') href = '/inspections/office';
        else if (r.type === 'vehicle_inspection') {
          const vehicle = vehicles.find((v) => v.name === r.vehicleLabel);
          href = vehicle ? `/inspections/${vehicle.id}` : '/inspections';
        }
        const label = r.vehicleLabel ? `${REQUEST_TYPE_LABELS[r.type]} (${r.vehicleLabel})` : REQUEST_TYPE_LABELS[r.type];
        result.push({
          key: `request-${r.id}`,
          href,
          title: `Requested: ${label}`,
          subtitle: daysUntilDue === undefined ? (r.note ?? 'Requested') : daysUntilDue < 0 ? 'Overdue' : `Due in ${daysUntilDue}d`,
          tone,
          urgency: TONE_URGENCY[tone] + 1, // requests nudge slightly above equivalent-tone routine items
        });
      }
    } catch {
      // Not configured / unreachable -- skip silently, these are local-first features.
    }

    result.sort((a, b) => b.urgency - a.urgency);
    setRows(result);

    recomputeReminders({
      flhaCountThisWeek: doneThisWeek,
      monthlyInspectionsDone: monthlyDone,
      monthlyInspectionsTotal: inspectionTargets.length,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={rows}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <Link href={item.href as never} asChild>
            <Pressable>
              <Card style={styles.row}>
                <Text style={styles.title}>{item.title}</Text>
                <StatusPill label={item.subtitle} tone={item.tone} />
              </Card>
            </Pressable>
          </Link>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  listContent: { padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '600' },
});
