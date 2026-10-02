import {normalize,text} from './model.js';

/** Small institutional templates. Preview and commit use the same mapping and business commands. */
export const IMPORT_TEMPLATES={
  people:{label:'Personas / estudiantes',headers:['Identidad','Nombre','Departamento','Telefono','Curso','Alojamiento']},
  inventory:{label:'Inventario',headers:['Codigo','Nombre','Categoria','Ubicacion','Serie','Valor']},
  vehicles:{label:'Vehículos',headers:['Codigo','Placa','Marca','Modelo','Año','Kilometraje','Serie','Ubicacion']}
};
const headerKey=value=>normalize(value).replace(/[^a-z0-9]/g,'');
export function importCommands(state,{kind,rows}) {
  if(!IMPORT_TEMPLATES[kind] || !Array.isArray(rows) || !rows.length || rows.length>200)throw new Error('Selecciona una plantilla válida con entre 1 y 200 registros.');
  const commands=[];
  for(const values of rows) {
    if(!values || typeof values!=='object' || Array.isArray(values))throw new Error('Fila inválida.');
    const row=Object.fromEntries(Object.entries(values).map(([key,value])=>[headerKey(key),text(value)]));
    if(kind==='people') {
      const person={name:row.nombre,identification:row.identidad,department:row.departamento,phone:row.telefono};
      if(row.curso) {
        const course=state.courses.find(c=>normalize(c.code)===normalize(row.curso) || normalize(c.name)===normalize(row.curso));
        if(!course)throw new Error(`Curso desconocido: ${row.curso}.`);
        if(!['si','no'].includes(normalize(row.alojamiento)))throw new Error('Alojamiento debe ser Sí o No.');
        commands.push({action:'student.import',data:{person,courseId:course.id,needsBed:normalize(row.alojamiento)==='si'}});
      }else commands.push({action:'person.save',data:person});
    } else {
      const location=state.locations.find(l=>normalize(l.name)===normalize(row.ubicacion));
      if(!location)throw new Error(`Ubicación desconocida: ${row.ubicacion || '(vacía)'}.`);
      commands.push({action:'asset.save',data:{type:kind==='vehicles'?'vehicle':'general',code:row.codigo,name:kind==='vehicles'?`${row.marca} ${row.modelo}`:row.nombre,category:row.categoria,brand:row.marca,model:row.modelo,serial:row.serie,locationId:location.id,status:'good',costoUnitario:row.valor || 0,details:{plate:row.placa,year:row.ano,mileage:row.kilometraje}}});
    }
  }
  return commands;
}
