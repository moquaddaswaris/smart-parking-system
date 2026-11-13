export interface ParkingSlotData {
  id: number;
  camera_id?: string;
  zone?: string;
  occupied: boolean;
  confidence?: number;
  last_status_change?: string;
}

export interface ZoneStatus {
  name: string;
  total: number;
  occupied: number;
  available: number;
  occupancy_percentage: number;
  slots: ParkingSlotData[];
}

export interface ParkingStatusResponse {
  total: number;
  occupied: number;
  available: number;
  occupancy_percentage: number;
  last_updated: string;
  slots: ParkingSlotData[];
  cameras?: Record<string, ZoneStatus>;
}

export type SlotFilterStatus = "all" | "available" | "occupied";
export type ActiveTab = "slots" | "info";

export interface ParkingStats {
  total: number;
  occupied: number;
  available: number;
  occupancyPercentage: number;
}
