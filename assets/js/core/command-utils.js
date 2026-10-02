import {text,normalize} from './model.js';

export const required = (value,label) => { if (!text(value)) throw new Error(`${label} es obligatorio.`); return text(value); };
export const number = (value,label,{integer=false,min=0}={}) => {
  if (text(value) === '') throw new Error(`${label} es obligatorio.`);
  const result=Number(value);
  if (!Number.isFinite(result) || result<min || (integer && !Number.isInteger(result))) throw new Error(`${label} debe ser ${integer?'un entero':'un número'} mayor o igual a ${min}.`);
  return result;
};
export function date(value,label) {
  const result=required(value,label), parsed=new Date(result+'T12:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0,10)!==result) throw new Error(`${label} no es una fecha válida.`);
  return result;
}
export const find=(state,name,id)=>{const item=state[name].find(item=>item.id===id);if(!item)throw new Error('El registro ya no existe. Actualiza la pantalla.');return item;};
export function unique(state,name,field,value,id,label) {
  if(state[name].some(item=>item.id!==id && normalize(item[field])===normalize(value)))throw new Error(`${label} ya existe.`);
}
export function upsert(state,name,values,id,now,makeId) {
  if(id){const item=find(state,name,id);Object.assign(item,values,{updatedAt:now});return item;}
  const item={...values,id:makeId(),createdAt:now,updatedAt:now};state[name].push(item);return item;
}
export function closeAssignment(state,resource,itemId,now,actorId) {
  for(const assignment of state.assignments.filter(a=>a.resource===resource && a.itemId===itemId && a.status==='active'))Object.assign(assignment,{status:'returned',endDate:now,returnedBy:actorId});
}
