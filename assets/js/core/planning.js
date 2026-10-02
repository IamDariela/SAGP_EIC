/** Inclusive calendar-day capacity analysis. Projection uses expected students, confirmed uses confirmed students. */
export function analyzeCapacity(state,start,end,scenario='confirmed') {
  const from=new Date(start+'T12:00:00Z'),to=new Date(end+'T12:00:00Z');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || Number.isNaN(from.valueOf()) || Number.isNaN(to.valueOf()) || from.toISOString().slice(0,10)!==start || to.toISOString().slice(0,10)!==end || to<from)throw new Error('Selecciona un período válido, con el fin posterior al inicio.');
  const count=Math.round((to-from)/86400000)+1;if(count>366)throw new Error('Consulta períodos de hasta 366 días.');
  if(!['confirmed','projection'].includes(scenario))throw new Error('Escenario inválido.');
  const capacity=state.beds.filter(b=>b.status!=='maintenance').length;
  const days=[];
  for(let day=0;day<count;day++){
    const date=new Date(from.valueOf()+day*86400000).toISOString().slice(0,10);
    const courses=state.courses.filter(c=>c.status!=='completed' && c.startDate<=date && c.endDate>=date);
    const demand=courses.reduce((sum,c)=>sum+Math.max(0,(scenario==='projection'?c.expectedStudents:c.confirmedStudents)-c.externalStudents),0);
    days.push({date,capacity,demand,deficit:Math.max(0,demand-capacity),courses:courses.length});
  }
  return {capacity,days,maxDemand:Math.max(...days.map(d=>d.demand)),maxDeficit:Math.max(...days.map(d=>d.deficit))};
}
