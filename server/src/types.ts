export type OrderStage = 'requested' | 'printed' | 'collected' | 'delivered' | 'pod_submitted';

export const ORDER_STAGES: OrderStage[] = [
  'requested',
  'printed',
  'collected',
  'delivered',
  'pod_submitted',
];

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

export type RequestType = 'flha' | 'vehicle_inspection' | 'office_inspection' | 'receiving';

export const REQUEST_TYPES: RequestType[] = [
  'flha',
  'vehicle_inspection',
  'office_inspection',
  'receiving',
];

export interface PaperworkRequest {
  id: string;
  type: RequestType;
  /** Only meaningful for type === 'vehicle_inspection' (e.g. "Truck" or "Van"). */
  vehicleLabel?: string;
  note?: string;
  dueDate?: string;
  status: 'open' | 'fulfilled';
  createdAt: string;
  fulfilledAt?: string;
}
