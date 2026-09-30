export type UserRole = 
  | 'admin' 
  | 'inventory_manager' 
  | 'weapon_manager' 
  | 'vehicle_manager' 
  | 'viewer' 
  | 'supervisor' 
  | 'conductor' 
  | 'maintenance_staff' 
  | 'buyer';

export type UserStatus = 'active' | 'inactive';

export interface UserProfile {
  id: string; // Same as uid
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  createdAt: any;
  areaId?: string; // Authorized area/location
}

export interface Location {
  id: string;
  name: string; // Space/Area name
  building: string;
  area: string; // Floor description
  floor?: 1 | 2;
  type: string;
  offices?: string[]; // Sub-offices within this space
  templateId?: string; // Links to inventory templates
}

export type AssetType = 'general' | 'weapon' | 'vehicle';
export type AssetStatus = 'good' | 'regular' | 'bad' | 'maintenance' | 'decommissioned' | 'repaired' | 'bodega';

export interface Asset {
  id: string;
  code: string; // Control interno
  name: string;
  description: string; // Descripción según factura
  category: string;
  brand?: string;
  model?: string;
  serial?: string; // Serie
  color?: string;
  costoUnitario?: number;
  tipoDocumentoValuacion?: string;
  locationId: string;
  office?: string; // Specific office within the location
  status: AssetStatus;
  type: AssetType;
  photoId?: string;
  details?: Record<string, any>;
  currentAssignmentId?: string | null;
  assignedPersonId?: string | null; // Denormalized for easier filtering
  createdAt: any;
  updatedAt: any;
}

export interface Movement {
  id: string;
  assetId: string;
  fromLocationId: string;
  toLocationId: string;
  fromOffice?: string;
  toOffice?: string;
  reason: string;
  userId: string;
  timestamp: any;
}

export interface MaintenanceRecord {
  id: string;
  assetId: string;
  description: string;
  startDate: any;
  endDate?: any;
  status: 'open' | 'closed';
  workDone?: string;
  userId: string;
  diagnostico?: string;
  evidenceBeforePhotoId?: string;
  evidenceAfterPhotoId?: string;
  verifiedBy?: string;
  verifiedDate?: any;
  cycleId?: string;
}

export interface Course {
  id: string;
  name: string;
  code?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  expectedStudents?: number;
  confirmedStudents?: number;
  externalStudents?: number;
  status?: 'active' | 'completed' | 'planned';
  createdAt?: any;
  updatedAt?: any;
}

export interface Assignment {
  id: string;
  assetId: string;
  personId: string;
  previousPersonId?: string | null;
  startDate: any;
  endDate?: any;
  status: 'active' | 'returned';
  userId: string;
  observations?: string;
  courseId?: string | null;
  courseName?: string | null;
  course?: string | null;
  releasedBy?: string;
  releasedByName?: string;
}

export type OperationType = 
  | 'create' 
  | 'update' 
  | 'status_change' 
  | 'transfer' 
  | 'assign' 
  | 'return' 
  | 'maintenance_open' 
  | 'maintenance_close' 
  | 'photo_change' 
  | 'decommission';

export interface AuditLog {
  id: string;
  assetId: string;
  assetName: string;
  assetCode: string;
  operation: OperationType;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  observations?: string;
  userId: string;
  userName: string;
  timestamp: any;
}

export interface Person {
  id: string;
  name: string;
  identification: string;
  department: string;
  phone?: string;
}

export interface Driver {
  id: string;
  personId?: string;
  name: string;
  identification: string; // 13 digits
  phone?: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseIssueDate?: string;
  licenseExpiration: string;
  observations?: string;
  photoId?: string;
  licenseFrontPhotoId?: string;
  licenseBackPhotoId?: string;
  dniFrontPhotoId?: string;
  dniBackPhotoId?: string;
  createdBy: string;
  createdByName: string;
  createdAt: any;
  updatedAt?: any;
}
