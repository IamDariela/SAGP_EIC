import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';

const LOCATIONS = [
  { name: 'Aula 101', building: 'Edificio A', area: 'Académica', type: 'Aula' },
  { name: 'Laboratorio Balística', building: 'Edificio B', area: 'Investigación', type: 'Laboratorio' },
  { name: 'Polígono Virtual', building: 'Sede Principal', area: 'Entrenamiento', type: 'Especializado' },
  { name: 'Dormitorios Oficiales', building: 'Edificio C', area: 'Alojamiento', type: 'Dormitorio' },
  { name: 'Área de Vehículos', building: 'Patio Central', area: 'Logística', type: 'Estacionamiento' },
  { name: 'Armamento', building: 'Sótano 1', area: 'Seguridad', type: 'Almacén' },
];

const CATEGORIES = ['Mobiliario', 'Equipamiento', 'Informática', 'Armas', 'Vehículos'];

export async function seedDatabase() {
  const locationsSnap = await getDocs(query(collection(db, 'locations'), limit(1)));
  if (!locationsSnap.empty) return; // Already seeded

  console.log('Seeding database...');

  const locationIds: string[] = [];
  for (const loc of LOCATIONS) {
    const docRef = await addDoc(collection(db, 'locations'), loc);
    locationIds.push(docRef.id);
  }

  // General Assets
  for (let i = 1; i <= 10; i++) {
    await addDoc(collection(db, 'assets'), {
      code: `EIC-MOB-${1000 + i}`,
      name: i % 2 === 0 ? 'Silla Ergonómica' : 'Escritorio Metálico',
      description: 'Bien institucional para uso administrativo',
      category: 'Mobiliario',
      brand: 'Standard',
      model: 'V1',
      locationId: locationIds[i % locationIds.length],
      status: i === 5 ? 'bad' : 'good',
      type: 'general',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  // Weapons
  for (let i = 1; i <= 5; i++) {
    await addDoc(collection(db, 'assets'), {
      code: `EIC-ARM-${2000 + i}`,
      name: 'Pistola 9mm',
      description: 'Arma de dotación reglamentaria',
      category: 'Armas',
      brand: 'Glock',
      model: '17',
      serial: `G17-${50000 + i}`,
      locationId: locationIds[5], // Armamento
      status: 'good',
      type: 'weapon',
      details: {
        caliber: '9mm',
        weaponType: 'Pistola',
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  // Vehicles
  for (let i = 1; i <= 3; i++) {
    await addDoc(collection(db, 'assets'), {
      code: `EIC-VEH-${3000 + i}`,
      name: 'Patrulla Hilux',
      description: 'Vehículo de transporte operativo',
      category: 'Vehículos',
      brand: 'Toyota',
      model: 'Hilux',
      serial: `CHASSIS-${90000 + i}`,
      locationId: locationIds[4], // Área de Vehículos
      status: 'good',
      type: 'vehicle',
      details: {
        plate: `P-BC-${100 + i}`,
        vin: `VIN-${80000 + i}`,
        year: 2023,
        mileage: 1500 * i,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  // People
  const people = [
    { name: 'Juan Pérez', identification: '0801-1990-12345', department: 'Investigación' },
    { name: 'María Rodríguez', identification: '0501-1985-54321', department: 'Académica' },
  ];
  for (const p of people) {
    await addDoc(collection(db, 'people'), p);
  }

  console.log('Seeding complete.');
}
