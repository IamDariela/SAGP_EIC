import {can} from '../core/policy.js';
import {today} from '../core/model.js';
import {financeTotals} from '../core/queries.js';
import {actions,table,form,delegate,escapeHtml as e,lookup,money,actionButton as button,stats,options,view} from '../core/ui.js';
import {documentHtml,handleDocument} from '../core/documents.js';
export function mount(ctx) {
  const {root,state,user}=ctx,editable=can(user.role,'fund.save');
  const {addFund,allocate,expense}=financeForms(ctx);
  actions(editable?[{label:'Registrar fondo',run:addFund},{label:'Asignar financiación',kind:'secondary',run:allocate},{label:'Registrar gasto',kind:'secondary',run:expense}]:[]);
  root.innerHTML='<p class="notice">El registro administrativo relaciona fondos, proyectos y gastos. Las operaciones de esta demostración no realizan pagos.</p><div id="finance-stats"></div><h2 class="section-title">Fondos recibidos</h2><div id="funds"></div><h2 class="section-title">Planificación y ejecución de adquisiciones</h2><div id="execution"></div><h2 class="section-title">Origen de la financiación</h2><div id="allocations"></div><h2 class="section-title">Gastos y comprobantes</h2><div id="expenses"></div>';
  const sum=rows=>rows.reduce((n,r)=>n+r.amount,0);
  stats(root.querySelector('#finance-stats'),[['Recibido',money(sum(state.funds))],['Financiado',money(sum(state.allocations))],['Ejecutado',money(sum(state.expenses))],['Sin asignar',money(sum(state.funds)-sum(state.allocations))]]);
  table(root.querySelector('#funds'),state.funds,[{key:'concept',label:'Origen'},{key:'date',label:'Fecha'},{label:'Curso',render:f=>e(lookup(state.courses,f.courseId))},{label:'Monto',render:f=>money(f.amount)},{label:'Documentos',render:f=>button('fund-docs',f.id,'Comprobantes')}]);
  table(root.querySelector('#execution'),state.projects.map(p=>({...p,...financeTotals(state,p.id)})),[{key:'name',label:'Proyecto'},{key:'year',label:'Año'},{label:'Necesidad',render:p=>p.extraordinary?'Extraordinaria':'Planificada'},{label:'Presupuesto',render:p=>money(p.budget)},{label:'Financiado',render:p=>money(p.funded)},{label:'Ejecutado',render:p=>money(p.spent)},{label:'Saldo financiado',render:p=>money(p.balance)},{label:'Ejecución',render:p=>p.budget?Math.round(p.spent/p.budget*100)+'%':'—'}]);
  table(root.querySelector('#allocations'),state.allocations,[{label:'Fondo',render:a=>e(lookup(state.funds,a.fundId,'concept'))},{label:'Proyecto',render:a=>e(lookup(state.projects,a.projectId))},{label:'Monto',render:a=>money(a.amount)},{key:'date',label:'Fecha'}]);
  table(root.querySelector('#expenses'),state.expenses,[{label:'Proyecto',render:g=>e(lookup(state.projects,g.projectId))},{key:'supplier',label:'Proveedor'},{key:'concept',label:'Adquisición / gasto'},{key:'invoice',label:'Factura'},{label:'Monto',render:g=>money(g.amount)},{key:'date',label:'Fecha'},{label:'Documentos',render:g=>button('expense-docs',g.id,'Comprobantes')}]);
  delegate(root,(action,id)=>{
    const type=action==='fund-docs'?'fund':action==='expense-docs'?'expense':null;if(!type)return;
    const record=state[type==='fund'?'funds':'expenses'].find(r=>r.id===id),dialog=view('Comprobantes · '+record.concept,documentHtml(ctx,type,id,record));
    delegate(dialog,(a,target)=>handleDocument(ctx,a,target,()=>dialog.close()));
  });
}


/** Shared forms used by the acquisitions overview and the finance directory. */
export function financeForms(ctx,{courseRequired=false}={}){
  const {state}=ctx;
  const addFund=()=>form({title:courseRequired?'Registrar aporte de curso':'Registrar fondo recibido',values:{date:today()},fields:[{name:'concept',label:'Concepto / origen'},{name:'amount',label:'Monto recibido (L.)',type:'number',min:0.01,step:'0.01'},{name:'date',label:'Fecha',type:'date'},{name:'courseId',label:'Curso relacionado',required:courseRequired,options:options(state.courses)}],save:data=>ctx.perform({action:'fund.save',data})});
  const allocate=()=>form({title:'Asignar financiación',fields:[{name:'fundId',label:'Fondo de origen',options:state.funds.map(f=>({value:f.id,label:f.concept+' · saldo '+money(f.amount-state.allocations.filter(a=>a.fundId===f.id).reduce((n,a)=>n+a.amount,0))}))},{name:'projectId',label:'Proyecto aprobado',options:options(state.projects.filter(p=>p.status==='approved'))},{name:'amount',label:'Monto a asignar (L.)',type:'number',min:0.01,step:'0.01'}],save:data=>ctx.perform({action:'allocation.save',data})});
  const expense=()=>form({title:'Registrar gasto',values:{date:today()},fields:[{name:'projectId',label:'Proyecto financiado',options:state.projects.filter(p=>p.status==='approved').map(p=>({value:p.id,label:p.name+' · saldo '+money(financeTotals(state,p.id).balance)}))},{name:'supplier',label:'Proveedor'},{name:'concept',label:'Concepto adquirido'},{name:'invoice',label:'Factura / comprobante'},{name:'amount',label:'Monto (L.)',type:'number',min:0.01,step:'0.01'},{name:'date',label:'Fecha',type:'date'}],save:data=>ctx.perform({action:'expense.save',data})});

  return {addFund,allocate,expense};
}
