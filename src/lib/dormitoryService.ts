import { storage, logAction } from './storage';
import { Asset, Location, Person, Assignment, MaintenanceRecord, UserProfile } from '../types';

export interface LiteraPair {
  bunkId: string;
  bunkNumber: number;
  slotIndex: number;
  upperBed: Asset | null;
  lowerBed: Asset | null;
}

export const DORMITORY_NAMES = [
  'Dormitorio de Caballeros 1',
  'Dormitorio de Caballeros 2',
  'Dormitorio de Caballeros 3',
  'Dormitorio de Caballeros 4',
  'Dormitorio de Damas',
  'Dormitorio de Instructores',
] as const;

export type DormitoryName = typeof DORMITORY_NAMES[number];

/**
 * Standardize and match dormitory location names without creating duplicate locations.
 */
export function normalizeDormitoryName(rawName: string): DormitoryName | null {
  const lower = rawName.toLowerCase().trim();
  if (lower.includes('caballeros 1') || lower === 'dormitorio 1' || lower === 'dorm_1') return 'Dormitorio de Caballeros 1';
  if (lower.includes('caballeros 2') || lower === 'dormitorio 2' || lower === 'dorm_2') return 'Dormitorio de Caballeros 2';
  if (lower.includes('caballeros 3') || lower === 'dormitorio 3' || lower === 'dorm_3') return 'Dormitorio de Caballeros 3';
  if (lower.includes('caballeros 4') || lower === 'dormitorio 4' || lower === 'dorm_4') return 'Dormitorio de Caballeros 4';
  if (lower.includes('damas') || lower.includes('mujeres') || lower === 'dorm_damas') return 'Dormitorio de Damas';
  if (lower.includes('instructores') || lower.includes('oficiales') || lower === 'dorm_inst') return 'Dormitorio de Instructores';
  return null;
}

/**
 * Ensure the 6 dormitories exist in the locations collection.
 */
export async function ensureDormitoryLocations(locations: Location[]): Promise<Location[]> {
  const updatedLocations = [...locations];
  const dormsMap = new Map<DormitoryName, Location>();

  // Map existing
  for (const loc of locations) {
    const norm = normalizeDormitoryName(loc.name);
    if (norm && !dormsMap.has(norm)) {
      dormsMap.set(norm, loc);
      if (loc.name !== norm) {
        try {
          await storage.updateDocument('locations', loc.id, { name: norm });
          loc.name = norm;
        } catch (e) {
          console.warn('Error updating dormitory name:', e);
        }
      }
    }
  }

  // Create missing dormitories
  for (const dormName of DORMITORY_NAMES) {
    if (!dormsMap.has(dormName)) {
      try {
        const newLoc = await storage.addDocument('locations', {
          name: dormName,
          building: 'EIC',
          area: 'Primera Planta',
          floor: 1,
          type: 'Dormitorio',
          templateId: 'dormitorios'
        });
        if (newLoc) {
          updatedLocations.push(newLoc as Location);
          dormsMap.set(dormName, newLoc as Location);
        }
      } catch (e) {
        console.warn('Error creating dormitory location:', e);
      }
    }
  }

  return updatedLocations;
}

/**
 * Check if a bed serial number is unique across all assets in the system.
 */
export function isSerialUnique(serial: string, assets: Asset[], excludeAssetId?: string): boolean {
  if (!serial || !serial.trim()) return false;
  const clean = serial.trim().toUpperCase();
  return !assets.some(a => {
    if (excludeAssetId && a.id === excludeAssetId) return false;
    const aSerial = (a.serial || '').trim().toUpperCase();
    const aCode = (a.code || '').trim().toUpperCase();
    return aSerial === clean || aCode === clean;
  });
}

/**
 * Maps dormitory beds into the 25 template slots (slots 1 to 25).
 */
export function mapBedsToTemplateSlots(beds: Asset[]): Map<number, LiteraPair> {
  const slotMap = new Map<number, LiteraPair>();
  const unassignedBeds: Asset[] = [];

  // Group beds that already have a bunkNumber or slotIndex
  const bunkNumberMap = new Map<number, { upper: Asset | null; lower: Asset | null; bunkId: string }>();

  beds.forEach(bed => {
    const details = bed.details || {};
    const bunkNum = details.bunkNumber || (details.bunkId ? parseInt(String(details.bunkId).replace(/\D/g, '')) : null);
    const pos = details.position || (bed.name.toLowerCase().includes('superior') ? 'superior' : bed.name.toLowerCase().includes('inferior') ? 'inferior' : null);

    if (bunkNum && bunkNum >= 1 && bunkNum <= 25) {
      if (!bunkNumberMap.has(bunkNum)) {
        bunkNumberMap.set(bunkNum, { upper: null, lower: null, bunkId: details.bunkId || `LIT-${bunkNum}` });
      }
      const entry = bunkNumberMap.get(bunkNum)!;
      if (pos === 'superior') {
        entry.upper = bed;
      } else if (pos === 'inferior') {
        entry.lower = bed;
      } else {
        if (!entry.upper) entry.upper = bed;
        else if (!entry.lower) entry.lower = bed;
        else unassignedBeds.push(bed);
      }
    } else {
      unassignedBeds.push(bed);
    }
  });

  // Assign configured slots
  bunkNumberMap.forEach((data, bunkNum) => {
    slotMap.set(bunkNum, {
      bunkId: data.bunkId,
      bunkNumber: bunkNum,
      slotIndex: bunkNum,
      upperBed: data.upper,
      lowerBed: data.lower
    });
  });

  // Pair any leftover unassigned beds into open slots sequentially
  let currentSlot = 1;
  for (let i = 0; i < unassignedBeds.length; i += 2) {
    while (slotMap.has(currentSlot) && currentSlot <= 25) {
      currentSlot++;
    }
    if (currentSlot <= 25) {
      slotMap.set(currentSlot, {
        bunkId: `LIT-${String(currentSlot).padStart(2, '0')}`,
        bunkNumber: currentSlot,
        slotIndex: currentSlot,
        upperBed: unassignedBeds[i] || null,
        lowerBed: unassignedBeds[i + 1] || null
      });
      currentSlot++;
    }
  }

  return slotMap;
}

/**
 * Seed initial bunk beds for a dormitory if it has 0 beds.
 */
export async function seedDormitoryBedsIfEmpty(
  locationId: string, 
  dormName: string, 
  existingAssets: Asset[]
): Promise<Asset[]> {
  const currentBeds = existingAssets.filter(a => a.locationId === locationId);
  if (currentBeds.length > 0) return currentBeds;

  const dormCodeMap: Record<string, string> = {
    'Dormitorio de Caballeros 1': 'DC1',
    'Dormitorio de Caballeros 2': 'DC2',
    'Dormitorio de Caballeros 3': 'DC3',
    'Dormitorio de Caballeros 4': 'DC4',
    'Dormitorio de Damas': 'DD',
    'Dormitorio de Instructores': 'DI',
  };

  const codePrefix = dormCodeMap[dormName] || 'D4';
  const bunkCount = dormName === 'Dormitorio de Instructores' ? 6 : dormName === 'Dormitorio de Damas' ? 16 : 25;
  const createdBeds: Asset[] = [];

  const baseSerialMap: Record<string, number> = {
    'Dormitorio de Caballeros 1': 4951100,
    'Dormitorio de Caballeros 2': 4951200,
    'Dormitorio de Caballeros 3': 4951300,
    'Dormitorio de Caballeros 4': 4951380,
    'Dormitorio de Damas': 4951500,
    'Dormitorio de Instructores': 4951600,
  };

  const baseSerial = baseSerialMap[dormName] || 4951380;
  const nowSecs = Math.floor(Date.now() / 1000);

  // Sample people IDs for assignments
  const samplePersonIds = ['p-1', 'p-2', 'p-3', 'p-4'];

  for (let i = 1; i <= bunkCount; i++) {
    const bunkId = `LIT-${codePrefix}-${String(i).padStart(2, '0')}`;

    let upperStatus: 'good' | 'bad' | 'maintenance' = 'good';
    let lowerStatus: 'good' | 'bad' | 'maintenance' = 'good';
    let upperAssigned = false;
    let lowerAssigned = false;

    // Reproduce visual reference pattern for Dormitorio 4
    if (dormName === 'Dormitorio de Caballeros 4') {
      if (i === 5 || i === 10) {
        upperStatus = 'bad';
        lowerStatus = 'bad';
      } else if (i === 14 || i === 16 || (i >= 18 && i <= 23)) {
        upperAssigned = true;
        lowerAssigned = true;
      }
    }

    const serialUpper = String(baseSerial + (i * 2) - 1);
    const serialLower = String(baseSerial + (i * 2));

    const upperDetails: Record<string, any> = {
      bunkId,
      bunkNumber: i,
      position: 'superior'
    };
    if (upperStatus === 'bad') {
      upperDetails.damageReason = 'Desgaste de resortes y soporte lateral';
    }

    const upperBed = await storage.addDocument('assets', {
      code: `EIC-CAM-${codePrefix}-${String(i).padStart(2, '0')}-SUP`,
      serial: serialUpper,
      name: `Litera ${String(i).padStart(2, '0')} - Cama Superior`,
      description: `Cama superior de litera institucional en ${dormName}`,
      category: 'Mobiliario',
      brand: 'Metálicas Honduras',
      model: 'Litera Militar Estándar',
      locationId: locationId,
      status: upperStatus,
      type: 'general',
      details: upperDetails
    });

    const lowerDetails: Record<string, any> = {
      bunkId,
      bunkNumber: i,
      position: 'inferior'
    };
    if (lowerStatus === 'bad') {
      lowerDetails.damageReason = 'Perno de fijación quebrado';
    }

    const lowerBed = await storage.addDocument('assets', {
      code: `EIC-CAM-${codePrefix}-${String(i).padStart(2, '0')}-INF`,
      serial: serialLower,
      name: `Litera ${String(i).padStart(2, '0')} - Cama Inferior`,
      description: `Cama inferior de litera institucional en ${dormName}`,
      category: 'Mobiliario',
      brand: 'Metálicas Honduras',
      model: 'Litera Militar Estándar',
      locationId: locationId,
      status: lowerStatus,
      type: 'general',
      details: lowerDetails
    });

    // Create assignment if assigned
    if (upperBed && upperAssigned) {
      const personId = samplePersonIds[(i * 2) % samplePersonIds.length];
      const assignId = await storage.addDocument('assignments', {
        assetId: (upperBed as any).id,
        personId,
        startDate: { seconds: nowSecs - 86400 * (i * 2) },
        status: 'active',
        userId: 'admin',
        observations: 'Asignación regular de curso de formación'
      });
      await storage.updateDocument('assets', (upperBed as any).id, {
        currentAssignmentId: assignId ? (assignId as any).id : null,
        assignedPersonId: personId
      });
    }

    if (lowerBed && lowerAssigned) {
      const personId = samplePersonIds[(i * 2 + 1) % samplePersonIds.length];
      const assignId = await storage.addDocument('assignments', {
        assetId: (lowerBed as any).id,
        personId,
        startDate: { seconds: nowSecs - 86400 * (i * 2 + 1) },
        status: 'active',
        userId: 'admin',
        observations: 'Asignación regular de curso de formación'
      });
      await storage.updateDocument('assets', (lowerBed as any).id, {
        currentAssignmentId: assignId ? (assignId as any).id : null,
        assignedPersonId: personId
      });
    }

    if (upperBed) createdBeds.push(upperBed as Asset);
    if (lowerBed) createdBeds.push(lowerBed as Asset);
  }

  return createdBeds;
}
