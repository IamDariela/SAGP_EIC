import { storage } from './storage';
import { Course } from '../types';

export const DEFAULT_COURSES: Omit<Course, 'id'>[] = [
  {
    name: 'Investigación Criminal',
    code: 'CUR-INV-CRIM',
    description: 'Curso básico y de inducción en Investigación Criminal',
    status: 'active',
    expectedStudents: 40,
    confirmedStudents: 35,
    externalStudents: 0
  },
  {
    name: 'Investigación Criminal Avanzada',
    code: 'CUR-INV-AVAN',
    description: 'Especialización táctica y metodológica en Investigación Criminal',
    status: 'active',
    expectedStudents: 35,
    confirmedStudents: 32,
    externalStudents: 2
  },
  {
    name: 'Balística Forense I',
    code: 'CUR-BAL-01',
    description: 'Análisis balístico e identificación de armamento',
    status: 'active',
    expectedStudents: 30,
    confirmedStudents: 28,
    externalStudents: 2
  },
  {
    name: 'Ciberseguridad y Delitos Digitales',
    code: 'CUR-CIBER-01',
    description: 'Investigación de ciberdelitos y evidencia digital',
    status: 'active',
    expectedStudents: 25,
    confirmedStudents: 24,
    externalStudents: 0
  },
  {
    name: 'Policía Judicial y Técnicas de Entrevista',
    code: 'CUR-POL-JUD',
    description: 'Procedimientos judiciales y entrevistas técnico-policiales',
    status: 'active',
    expectedStudents: 30,
    confirmedStudents: 30,
    externalStudents: 5
  }
];

let isSeedingCourses = false;

/**
 * Ensures standard default courses exist in the system catalog without duplicates.
 */
export async function ensureDefaultCourses(existingCourses: Course[]): Promise<Course[]> {
  if (isSeedingCourses) return existingCourses;
  isSeedingCourses = true;

  try {
    const updatedList = [...existingCourses];
    const existingNamesMap = new Map<string, Course>();
    
    existingCourses.forEach(c => {
      const cleanName = (c.name || '').trim().toLowerCase();
      if (cleanName) {
        existingNamesMap.set(cleanName, c);
      }
    });

    for (const def of DEFAULT_COURSES) {
      const cleanDefName = def.name.trim().toLowerCase();
      if (!existingNamesMap.has(cleanDefName)) {
        try {
          const created = await storage.addDocument('courses', {
            name: def.name,
            code: def.code,
            description: def.description,
            status: def.status,
            expectedStudents: def.expectedStudents,
            confirmedStudents: def.confirmedStudents,
            externalStudents: def.externalStudents
          });
          if (created) {
            const newCourse = created as Course;
            updatedList.push(newCourse);
            existingNamesMap.set(cleanDefName, newCourse);
          }
        } catch (err) {
          console.warn('[CourseService] Could not auto-seed course:', def.name, err);
        }
      }
    }

    return updatedList;
  } finally {
    isSeedingCourses = false;
  }
}
