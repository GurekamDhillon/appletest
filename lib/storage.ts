import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ChecklistTemplate,
  FlhaEntry,
  InspectionRecord,
  PackingSlip,
  SalesOrder,
  Vehicle,
} from './models';

export const STORAGE_KEYS = {
  vehicles: 'fieldops:vehicles',
  checklistTemplates: 'fieldops:checklistTemplates',
  inspections: 'fieldops:inspections',
  flhaEntries: 'fieldops:flhaEntries',
  salesOrders: 'fieldops:salesOrders',
  packingSlips: 'fieldops:packingSlips',
  seeded: 'fieldops:seeded',
} as const;

export async function getAll<T>(key: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

export async function saveAll<T>(key: string, items: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(items));
}

export async function upsert<T extends { id: string }>(
  key: string,
  item: T
): Promise<T[]> {
  const items = await getAll<T>(key);
  const index = items.findIndex((existing) => existing.id === item.id);
  if (index >= 0) {
    items[index] = item;
  } else {
    items.push(item);
  }
  await saveAll(key, items);
  return items;
}

export function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const DEFAULT_VEHICLE_CHECKLIST = [
  'Tire tread & pressure',
  'Fluid levels (oil, coolant, washer)',
  'Lights & signals working',
  'Brakes functioning correctly',
  'Fire extinguisher present & charged',
  'First aid kit stocked',
  'Registration & insurance in vehicle',
  'No visible body/glass damage',
];

const DEFAULT_OFFICE_CHECKLIST = [
  'Exits & walkways clear',
  'Fire extinguisher present & charged',
  'First aid kit stocked',
  'Emergency contact info posted',
  'Electrical panels accessible, no obstructions',
  'No trip/slip hazards',
  'Lighting functioning',
];

export async function ensureSeeded(): Promise<void> {
  const alreadySeeded = await AsyncStorage.getItem(STORAGE_KEYS.seeded);
  if (alreadySeeded) return;

  const vehicles: Vehicle[] = [
    { id: newId(), name: 'Truck' },
    { id: newId(), name: 'Van' },
  ];
  await saveAll(STORAGE_KEYS.vehicles, vehicles);

  const templates: ChecklistTemplate[] = [
    { id: newId(), type: 'vehicle', items: DEFAULT_VEHICLE_CHECKLIST },
    { id: newId(), type: 'office', items: DEFAULT_OFFICE_CHECKLIST },
  ];
  await saveAll(STORAGE_KEYS.checklistTemplates, templates);

  await AsyncStorage.setItem(STORAGE_KEYS.seeded, 'true');
}

export type {
  Vehicle,
  ChecklistTemplate,
  InspectionRecord,
  FlhaEntry,
  SalesOrder,
  PackingSlip,
};
