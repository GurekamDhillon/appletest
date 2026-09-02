export interface Vehicle {
  id: string;
  name: string;
}

export type ChecklistType = 'vehicle' | 'office';

export interface ChecklistTemplate {
  id: string;
  type: ChecklistType;
  items: string[];
}

export type InspectionStatus = 'pending' | 'completed';

export interface InspectionRecord {
  id: string;
  templateType: ChecklistType;
  vehicleId?: string;
  /** e.g. "2026-09" */
  periodKey: string;
  status: InspectionStatus;
  checkedItems: string[];
  notes?: string;
  photoUri?: string;
  completedAt?: string;
  sharedAt?: string;
}

export interface FlhaEntry {
  id: string;
  date: string;
  siteOrJobLabel?: string;
  photoUri: string;
  sharedAt?: string;
}

export type OrderStage =
  | 'requested'
  | 'printed'
  | 'collected'
  | 'delivered'
  | 'pod_submitted';

export interface StageTransition {
  stage: OrderStage;
  at: string;
}

export interface SalesOrder {
  id: string;
  orderRef: string;
  client: string;
  stage: OrderStage;
  stageHistory: StageTransition[];
  podPhotoUri?: string;
  notes?: string;
}

export interface PackingSlip {
  id: string;
  receivedAt: string;
  description?: string;
  photoUri: string;
  submittedAt?: string;
}

export const ORDER_STAGES: OrderStage[] = [
  'requested',
  'printed',
  'collected',
  'delivered',
  'pod_submitted',
];

export const ORDER_STAGE_LABELS: Record<OrderStage, string> = {
  requested: 'Requested',
  printed: 'Printed',
  collected: 'Collected',
  delivered: 'Delivered',
  pod_submitted: 'POD Submitted',
};

export type RequestType = 'flha' | 'vehicle_inspection' | 'office_inspection' | 'receiving';

export interface PaperworkRequest {
  id: string;
  type: RequestType;
  vehicleLabel?: string;
  note?: string;
  dueDate?: string;
  status: 'open' | 'fulfilled';
  createdAt: string;
  fulfilledAt?: string;
}

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  flha: 'FLHA',
  vehicle_inspection: 'Vehicle Inspection',
  office_inspection: 'Office Inspection',
  receiving: 'Receiving / Packing Slip',
};
