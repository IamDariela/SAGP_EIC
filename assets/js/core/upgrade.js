import {COLLECTIONS} from './model.js';

/** Upgrade only saved demo data. Keep IDs, history and empty collections; do not inject examples. */
export function linkParticipations(state) {
  for(const bed of state.beds) {
    bed.room ||= bed.bedNumber.split('-')[0];
    bed.bunk ||= '1';bed.position ||= bed.bedNumber.endsWith('A')?'upper':'lower';
    if(bed.status!=='occupied')continue;
    let enrollment=state.enrollments.find(n=>n.personId===bed.assignedPersonId && n.courseId===bed.courseId);
    if(!enrollment){enrollment={id:`participation-${bed.id}`,personId:bed.assignedPersonId,courseId:bed.courseId,needsBed:true,status:'active',createdAt:'2026-09-01T14:00:00Z'};state.enrollments.push(enrollment);}
    bed.enrollmentId=enrollment.id;
    const assignment=state.assignments.find(a=>a.id===bed.currentAssignmentId);if(assignment)assignment.enrollmentId=enrollment.id;
  }
  for(const assignment of state.assignments.filter(a=>a.resource==='asset' && a.status==='active' && !a.enrollmentId)) {
    if(state.assets.find(a=>a.id===assignment.itemId)?.type!=='weapon')continue;
    const enrollment=state.enrollments.find(n=>n.personId===assignment.personId && n.status==='active');
    // An old weapon loan may have no course. Preserve it as a legacy loan until the human returns it.
    if(enrollment){assignment.enrollmentId=enrollment.id;assignment.courseId=enrollment.courseId;}
  }
  return state;
}
export function upgradeDemo(saved) {
  if(saved?.version!==2)return saved;
  const state=structuredClone(saved);state.version=3;
  for(const key of COLLECTIONS)if(!(key in state))state[key]=[];
  return linkParticipations(state);
}
