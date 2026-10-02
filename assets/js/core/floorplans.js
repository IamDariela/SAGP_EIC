/** Schematic arrangement transcribed from the supplied references. Percent coordinates.
 * Catalog IDs identify demo rooms; names also resolve official catalog records. Unmapped
 * spaces remain visible in the directory. This is presentation metadata, not mock data. */
import {normalize} from './model.js';
const labels={'loc-9':'Parqueo','loc-7':'Comedor','loc-6':'Polígono\nDigital','loc-4':'Lab de\nDactiloscopia','loc-doclab':'Lab de\nDocumentología','loc-3':'Laboratorio\nBalística','loc-itlab':'Lab\nInformática','loc-8':'Dormitorio\nOficiales','loc-dorm2':'Dormitorio\n2','loc-dorm3':'Dormitorio\n3','loc-dorm4':'Dormitorio\n4','loc-instructors':'Dormitorio\nInstructores','loc-ext-da':'Extensión\nDept.\nAcadémico','loc-sig':'Sistema\nIntegrado de\nGestión','loc-rh':'Recursos\nhumanos','loc-ga':'Gestión\nacadémica','loc-gc':'Gestión\nCurricular','loc-gt':'Gestión\nTecnológica','loc-sala':'Sala de\nReuniones','loc-dir':'Dirección','loc-wcm':'Baños ♂','loc-wcf':'♀ Baños','loc-student':'Admin\nEstudiantil','loc-dept':'Dept.\nAcadémico'};
labels['loc-sub']='Subdirector';
const room=(id,name,x,y,w,h,tone='')=>({id,name,label:labels[id] || name,x,y,w,h,tone});
export const FLOOR_PLANS={
  1:[
    room('loc-gym','Gimnasio',42,0,18,8,'common'),room('loc-gen','Generador',42,8,18,7,'utility'),
    room('loc-9','Área de Vehículos',61,0,28,15,'service'),
    room('loc-5','Ciudadela',16,15.5,44,18,'common'),room('loc-store2','Almacén 2',60.5,15.5,10.5,7.5),
    room('loc-7','Comedor Central',71,15.5,18,7.5),room('loc-store1','Almacén 1',60.5,23,10.5,3),
    room('loc-6','Polígono Virtual',60.5,26,10.5,7.5),room('loc-trials','Sala de Juicios Orales',74,23,15,10.5),
    room('loc-aud','Auditorio',16,37.5,21,23.5,'common'),room('loc-aula3','Aula 3',16,61,21,13.5),
    room('loc-itlab','Laboratorio Informática',16,74.5,21,13.5),room('loc-servers','Servidores',16,88,21,5),
    room('loc-4','Laboratorio Dactiloscopia',44,37.5,21,11.5),room('loc-doclab','Laboratorio Documentología',44,49,21,11.5),
    room('loc-3','Laboratorio Balística',44,60.5,21,11.5),room('loc-2','Aula 102',44,72,21,11.5),
    room('loc-1','Aula 101',44,83.5,21,11.5),room('loc-dorm4','Dormitorio Caballeros 4',69,37.5,21,11.5),
    room('loc-dorm3','Dormitorio Caballeros 3',69,49,21,11.5),room('loc-dorm2','Dormitorio Caballeros 2',69,60.5,21,11.5),
    room('loc-8','Dormitorio Oficiales',69,72,21,11.5),room('loc-instructors','Dormitorio Instructores',69,83.5,21,11.5)
  ],
  2:[
    room('loc-ext-da','Extensión del Departamento Académico',1,25,12,23),
    room('loc-sig','Sistema Integrado de Gestión',17,25,13,23),room(null,'Escaleras',30,25,13,23,'utility'),
    room('loc-rh','Recursos Humanos',43,25,12,23),room('loc-ga','Gestión Académica',55,25,12,23),
    room('loc-gc','Gestión Curricular',67,25,12,23),room('loc-gt','Gestión Tecnológica',79,25,12,23),
    room('loc-sala','Sala de Reuniones Principal',91,25,12,57,'common'),
    room('loc-dir','Dirección General EIC',1,48,12,34),room('loc-kitchen','Cocineta',13,59,18,23,'service'),
    room('loc-wcm','Baños Caballeros',35,59,8,11.5,'service'),room('loc-wcf','Baños Damas',31,70.5,12,11.5,'service'),
    room('loc-sub','Subdirección',43,59,12,23),room('loc-student','Administración Estudiantil',55,59,12,23),
    room('loc-dept','Departamento Académico',67,59,12,23)
  ]
};
export function resolveRoom(locations,room,floor){
  return locations.find(l=>l.floor===floor && (l.id===room.id || normalize(l.name)===normalize(room.name)));
}
