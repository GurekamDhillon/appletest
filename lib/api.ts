import AsyncStorage from '@react-native-async-storage/async-storage';
import { SalesOrder, OrderStage, PaperworkRequest, RequestType } from './models';

const SETTINGS_KEY = 'fieldops:apiSettings';

export interface ApiSettings {
  baseUrl: string;
  accessCode: string;
}

export async function getApiSettings(): Promise<ApiSettings | null> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ApiSettings;
  } catch {
    return null;
  }
}

export async function saveApiSettings(settings: ApiSettings): Promise<void> {
  const trimmed: ApiSettings = {
    baseUrl: settings.baseUrl.replace(/\/+$/, ''),
    accessCode: settings.accessCode.trim(),
  };
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(trimmed));
}

export class ApiNotConfiguredError extends Error {
  constructor() {
    super('Sales Order server is not configured yet. Set it up in Settings.');
    this.name = 'ApiNotConfiguredError';
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const settings = await getApiSettings();
  if (!settings || !settings.baseUrl || !settings.accessCode) {
    throw new ApiNotConfiguredError();
  }
  const headers = new Headers(init.headers);
  headers.set('X-Access-Code', settings.accessCode);
  if (!(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(`${settings.baseUrl}/api${path}`, {
    ...init,
    headers,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Request failed (${response.status}): ${text || response.statusText}`);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function getOrders(): Promise<SalesOrder[]> {
  return request<SalesOrder[]>('/orders');
}

export function createOrder(input: {
  orderRef: string;
  client: string;
  notes?: string;
}): Promise<SalesOrder> {
  return request<SalesOrder>('/orders', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function advanceStage(id: string, stage: OrderStage): Promise<SalesOrder> {
  return request<SalesOrder>(`/orders/${id}/stage`, {
    method: 'PATCH',
    body: JSON.stringify({ stage }),
  });
}

export function getRequests(): Promise<PaperworkRequest[]> {
  return request<PaperworkRequest[]>('/requests');
}

export function fulfillRequest(id: string): Promise<PaperworkRequest> {
  return request<PaperworkRequest>(`/requests/${id}/fulfill`, { method: 'PATCH' });
}

/**
 * Best-effort: if there's an open staff request matching this paperwork type
 * (and vehicle, for vehicle inspections), close the oldest one. Never throws --
 * the local-only FLHA/inspections/receiving flows must keep working even if
 * the Sales Order server isn't configured or is unreachable.
 */
export async function autoCloseMatchingRequest(
  type: RequestType,
  vehicleLabel?: string
): Promise<void> {
  try {
    const requests = await getRequests();
    const candidates = requests.filter(
      (r) =>
        r.status === 'open' &&
        r.type === type &&
        (type !== 'vehicle_inspection' || r.vehicleLabel === vehicleLabel)
    );
    candidates.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const match = candidates[0];
    if (match) {
      await fulfillRequest(match.id);
    }
  } catch {
    // Not configured, unreachable, etc. -- silently skip.
  }
}

export async function uploadPod(id: string, photoUri: string): Promise<SalesOrder> {
  const settings = await getApiSettings();
  if (!settings) throw new ApiNotConfiguredError();

  const formData = new FormData();
  const filename = photoUri.split('/').pop() ?? 'pod.jpg';
  // React Native's fetch accepts this file-shaped object for multipart bodies.
  formData.append('photo', {
    uri: photoUri,
    name: filename,
    type: 'image/jpeg',
  } as unknown as Blob);

  const response = await fetch(`${settings.baseUrl}/api/orders/${id}/pod`, {
    method: 'POST',
    headers: { 'X-Access-Code': settings.accessCode },
    body: formData,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Upload failed (${response.status}): ${text || response.statusText}`);
  }
  return (await response.json()) as SalesOrder;
}
