import { useState, useEffect, useMemo } from 'react';
import { storage, logAction } from '../lib/storage';
import { Asset, Location } from '../types';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { DollarSign, Plus, Package, FileText, Check, AlertTriangle, Save, FolderOpen, CreditCard, Clock, Activity } from 'lucide-react';
import { formatDateTime, cn } from '../lib/utils';

interface Aporte {
  id: string;
  courseName: string;
  concept: string;
  amount: number;
  status: 'previsto' | 'recibido' | 'conciliado';
  date: string;
  receiptId?: string;
}

interface PurchaseProject {
  id: string;
  code: string;
  name: string;
  justification: string;
  benefitedArea: string;
  budget: number;
  status: 'borrador' | 'propuesto' | 'aprobado' | 'en_ejecucion' | 'ejecutado' | 'cerrado' | 'cancelado';
  committedAmount: number; // Compromisos pendientes
  spentAmount: number; // Gasto realizado
  sources: string[]; // List of Aporte IDs
  createdAt: any;
}

export default function Projects() {
  const { profile } = useAuth();
  const [aportes, setAportes] = useState<Aporte[]>([]);
  const [projects, setProjects] = useState<PurchaseProject[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isAporteModalOpen, setIsAporteModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  
  // Form states
  const [aporteForm, setAporteForm] = useState({
    courseName: '',
    concept: '',
    amount: '',
    status: 'recibido' as 'previsto' | 'recibido' | 'conciliado',
    date: new Date().toISOString().split('T')[0]
  });

  const [projectForm, setProjectForm] = useState({
    code: '',
    name: '',
    justification: '',
    benefitedArea: '',
    budget: '',
    sources: [] as string[]
  });

  useEffect(() => {
    setLoading(true);
    const unsubAportes = storage.subscribe('aportes', (data) => {
      setAportes(data as Aporte[]);
    });
    const unsubProjects = storage.subscribe('projects', (data) => {
      setProjects(data as PurchaseProject[]);
      setLoading(false);
    });

    return () => {
      unsubAportes();
      unsubProjects();
    };
  }, []);

  // Balances Math (Section 7)
  const financialSummary = useMemo(() => {
    // Only 'recibido' or 'conciliado' count as real income
    const totalIngresos = aportes
      .filter(a => a.status === 'recibido' || a.status === 'conciliado')
      .reduce((sum, a) => sum + Number(a.amount), 0);

    const totalEgresos = projects
      .filter(p => p.status !== 'cancelado')
      .reduce((sum, p) => sum + Number(p.spentAmount || 0), 0);

    const totalCompromisos = projects
      .filter(p => p.status === 'aprobado' || p.status === 'en_ejecucion')
      .reduce((sum, p) => sum + Number(p.committedAmount || 0), 0);

    const saldoContable = totalIngresos - totalEgresos;
    const saldoDisponible = saldoContable - totalCompromisos;

    return {
      totalIngresos,
      totalEgresos,
      totalCompromisos,
      saldoContable,
      saldoDisponible
    };
  }, [aportes, projects]);

  const handleCreateAporte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aporteForm.courseName || !aporteForm.amount || !profile) return;

    if (profile.role !== 'admin' && profile.role !== 'buyer') {
      alert('Error: Su rol no cuenta con permisos para registrar aportes financieros.');
      return;
    }

    try {
      setLoading(true);
      const nowSecs = Math.floor(Date.now() / 1000);

      const aporteDoc = {
        courseName: aporteForm.courseName.trim(),
        concept: aporteForm.concept.trim(),
        amount: parseFloat(aporteForm.amount) || 0,
        status: aporteForm.status,
        date: aporteForm.date,
        receiptId: `REC_${nowSecs}`
      };

      const docRef = await storage.addDocument('aportes', aporteDoc);

      // Audit Log
      await logAction({
        assetId: docRef.id,
        assetName: `Aporte: ${aporteForm.courseName}`,
        assetCode: `REC_${nowSecs}`,
        operation: 'create',
        changes: [{ field: 'status', oldValue: null, newValue: aporteForm.status }],
        userId: profile.uid,
        userName: profile.name,
        timestamp: { seconds: nowSecs }
      });

      setIsAporteModalOpen(false);
      setAporteForm({ courseName: '', concept: '', amount: '', status: 'recibido', date: new Date().toISOString().split('T')[0] });
      alert('Aporte financiero registrado correctamente.');
    } catch (err) {
      console.error(err);
      alert('Error al guardar el aporte financiero.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.code || !projectForm.name || !projectForm.budget || !profile) return;

    if (profile.role !== 'admin' && profile.role !== 'buyer') {
      alert('Error: Su rol no cuenta con permisos para proponer proyectos de compras.');
      return;
    }

    const budgetVal = parseFloat(projectForm.budget) || 0;

    // Concurrency guard: check if budget exceeds currently available funds
    if (budgetVal > financialSummary.saldoDisponible) {
      alert(`Error: El presupuesto propuesto (L. ${budgetVal.toFixed(2)}) supera los fondos institucionales disponibles actualmente (L. ${financialSummary.saldoDisponible.toFixed(2)}).`);
      return;
    }

    // Check duplicate code
    if (projects.some(p => p.code.toLowerCase().trim() === projectForm.code.toLowerCase().trim())) {
      alert(`Error: Ya existe un proyecto registrado con el Código de Compra "${projectForm.code}".`);
      return;
    }

    try {
      setLoading(true);
      const nowSecs = Math.floor(Date.now() / 1000);

      const projectDoc: Partial<PurchaseProject> = {
        code: projectForm.code.toUpperCase().trim(),
        name: projectForm.name.trim(),
        justification: projectForm.justification.trim(),
        benefitedArea: projectForm.benefitedArea.trim(),
        budget: budgetVal,
        status: 'propuesto',
        committedAmount: budgetVal, // Initial budget committed pending execution
        spentAmount: 0,
        sources: projectForm.sources,
        createdAt: { seconds: nowSecs }
      };

      const docRef = await storage.addDocument('projects', projectDoc);

      // Audit Log
      await logAction({
        assetId: docRef.id,
        assetName: projectForm.name,
        assetCode: projectForm.code.toUpperCase(),
        operation: 'create',
        changes: [{ field: 'status', oldValue: null, newValue: 'propuesto' }],
        userId: profile.uid,
        userName: profile.name,
        timestamp: { seconds: nowSecs }
      });

      setIsProjectModalOpen(false);
      setProjectForm({ code: '', name: '', justification: '', benefitedArea: '', budget: '', sources: [] });
      alert('Proyecto de compra propuesto exitosamente en el sistema.');
    } catch (err) {
      console.error(err);
      alert('Error al guardar el proyecto de compra.');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveProject = async (proj: PurchaseProject) => {
    if (!profile) return;

    if (profile.role !== 'admin') {
      alert('Error: Solo un administrador autorizado puede aprobar proyectos de compras.');
      return;
    }

    try {
      setLoading(true);
      await storage.updateDocument('projects', proj.id, {
        status: 'aprobado'
      });

      await logAction({
        assetId: proj.id,
        assetName: proj.name,
        assetCode: proj.code,
        operation: 'update',
        changes: [{ field: 'status', oldValue: 'propuesto', newValue: 'aprobado' }],
        userId: profile.uid,
        userName: profile.name,
        timestamp: { seconds: Math.floor(Date.now() / 1000) }
      });

      alert('Proyecto aprobado y fondos comprometidos correctamente.');
    } catch (err) {
      console.error(err);
      alert('Error al aprobar el proyecto.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecutePayment = async (proj: PurchaseProject) => {
    if (!profile) return;

    if (profile.role !== 'admin' && profile.role !== 'buyer') {
      alert('Error: No tiene permisos para registrar gastos del proyecto.');
      return;
    }

    const payStr = prompt(`Registre el monto del gasto ejecutado para "${proj.name}" (Presupuesto máximo: L. ${proj.budget}):`);
    if (payStr === null) return;
    const payment = parseFloat(payStr) || 0;

    if (payment <= 0) {
      alert('Error: Ingrese un monto de egreso válido.');
      return;
    }

    try {
      setLoading(true);
      const spent = (proj.spentAmount || 0) + payment;
      const committed = Math.max(0, proj.budget - spent);

      await storage.updateDocument('projects', proj.id, {
        status: spent >= proj.budget ? 'ejecutado' : 'en_ejecucion',
        spentAmount: spent,
        committedAmount: committed // Reduce commitment as it gets spent!
      });

      await logAction({
        assetId: proj.id,
        assetName: proj.name,
        assetCode: proj.code,
        operation: 'update',
        changes: [
          { field: 'spentAmount', oldValue: proj.spentAmount, newValue: spent },
          { field: 'committedAmount', oldValue: proj.committedAmount, newValue: committed }
        ],
        observations: `Gasto parcial ejecutado: L. ${payment.toFixed(2)}`,
        userId: profile.uid,
        userName: profile.name,
        timestamp: { seconds: Math.floor(Date.now() / 1000) }
      });

      alert('Pago registrado y balances actualizados de manera consistente.');
    } catch (err) {
      console.error(err);
      alert('Error al registrar el egreso.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-800 flex items-center gap-2 uppercase tracking-tight">
            <CreditCard className="h-6 w-6 text-primary" />
            Proyectos de Compras e Ingresos de Cursos
          </h2>
          <p className="text-xs lg:text-sm text-slate-500 font-medium italic">Trazabilidad contable y ejecución de fondos</p>
        </div>
        
        {/* Quick buttons */}
        <div className="flex gap-2 w-full sm:w-auto shrink-0">
          <button
            onClick={() => setIsAporteModalOpen(true)}
            className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs uppercase shadow active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Aporte Curso
          </button>
          <button
            onClick={() => setIsProjectModalOpen(true)}
            className="flex-1 sm:flex-initial bg-primary hover:bg-primary/95 text-white px-4 py-2.5 rounded-xl font-bold text-xs uppercase shadow active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Propuesta Proyecto
          </button>
        </div>
      </div>

      {/* Financial Dashboard Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm text-center">
          <p className="text-[9px] text-emerald-500 uppercase font-black tracking-widest mb-1">Aportes Recibidos (Ingresos)</p>
          <p className="text-xl font-black text-slate-800">L. {financialSummary.totalIngresos.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm text-center">
          <p className="text-[9px] text-rose-500 uppercase font-black tracking-widest mb-1">Gasto Ejecutado (Egresos)</p>
          <p className="text-xl font-black text-rose-600">L. {financialSummary.totalEgresos.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm text-center">
          <p className="text-[9px] text-amber-500 uppercase font-black tracking-widest mb-1">Compromisos Pendientes</p>
          <p className="text-xl font-black text-amber-600">L. {financialSummary.totalCompromisos.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-accent/10 p-5 rounded-3xl border-2 border-accent text-center shadow-inner">
          <p className="text-[9px] text-primary uppercase font-black tracking-widest mb-1">Saldo Disponible de Compra</p>
          <p className="text-xl font-black text-primary">L. {financialSummary.saldoDisponible.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Active Projects Table */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Cartera de Proyectos de Compra</h3>
          </div>
          
          <div className="space-y-4">
            {projects.map(p => {
              const statusLabels: Record<string, string> = {
                borrador: 'Borrador',
                propuesto: 'Propuesto',
                aprobado: 'Aprobado',
                en_ejecucion: 'En Ejecución',
                ejecutado: 'Ejecutado',
                cerrado: 'Cerrado',
                cancelado: 'Cancelado'
              };

              return (
                <div key={p.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono font-bold text-slate-400">{p.code}</span>
                      <span className={cn(
                        "text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded",
                        p.status === 'propuesto' ? "bg-amber-100 text-amber-800" :
                        p.status === 'aprobado' ? "bg-emerald-100 text-emerald-800" :
                        p.status === 'en_ejecucion' ? "bg-blue-100 text-blue-800" : "bg-slate-200 text-slate-700"
                      )}>
                        {statusLabels[p.status] || p.status}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">{p.name}</h4>
                    <p className="text-xs text-slate-500 italic max-w-md">{p.justification}</p>
                  </div>

                  <div className="flex gap-4 items-center shrink-0">
                    <div className="text-right text-[10px] font-bold text-slate-500">
                      <span>Presupuesto: L. {p.budget.toLocaleString('es-HN')}</span>
                      <span className="block text-rose-500">Gastado: L. {(p.spentAmount || 0).toLocaleString('es-HN')}</span>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex gap-1.5">
                      {p.status === 'propuesto' && profile?.role === 'admin' && (
                        <button
                          onClick={() => handleApproveProject(p)}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors shadow-sm"
                        >
                          Aprobar
                        </button>
                      )}
                      {(p.status === 'aprobado' || p.status === 'en_ejecucion') && (profile?.role === 'admin' || profile?.role === 'buyer') && (
                        <button
                          onClick={() => handleExecutePayment(p)}
                          className="px-2.5 py-1.5 bg-primary hover:bg-primary/95 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors shadow-sm"
                        >
                          Pagar Gasto
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {projects.length === 0 && (
              <p className="text-xs text-slate-400 italic text-center py-6">No hay proyectos de compra propuestos.</p>
            )}
          </div>
        </div>

        {/* Course Aportes Timeline */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-5 w-5 text-emerald-600" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Ingresos Recibidos</h3>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {aportes.map(a => (
              <div key={a.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1 text-[10px]">
                <div className="flex justify-between font-bold">
                  <span className="text-slate-800 truncate max-w-[130px]">{a.courseName}</span>
                  <span className="text-emerald-600">L. {Number(a.amount).toLocaleString('es-HN')}</span>
                </div>
                <div className="flex justify-between items-center text-[8px] font-bold text-slate-400">
                  <span className="uppercase">{a.concept || 'Aporte General'}</span>
                  <span>{a.date}</span>
                </div>
              </div>
            ))}
            {aportes.length === 0 && (
              <p className="text-xs text-slate-400 italic text-center py-6">No se registran aportes de cursos.</p>
            )}
          </div>
        </div>
      </div>

      {/* Aporte Modal */}
      <Modal
        isOpen={isAporteModalOpen}
        onClose={() => setIsAporteModalOpen(false)}
        title="Registrar Aporte de Curso"
      >
        <form onSubmit={handleCreateAporte} className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nombre del Curso Aportante</label>
            <input 
              type="text"
              required
              placeholder="p. ej. Investigación Criminal Avanzada"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs font-bold"
              value={aporteForm.courseName}
              onChange={e => setAporteForm(prev => ({ ...prev, courseName: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Concepto de Aporte</label>
            <input 
              type="text"
              required
              placeholder="p. ej. Aporte para renovación de dormitorios"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs font-bold"
              value={aporteForm.concept}
              onChange={e => setAporteForm(prev => ({ ...prev, concept: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Monto del Aporte (HNL)</label>
              <input 
                type="number"
                step="0.01"
                min={1}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs font-bold"
                value={aporteForm.amount}
                onChange={e => setAporteForm(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fecha</label>
              <input 
                type="date"
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs font-bold"
                value={aporteForm.date}
                onChange={e => setAporteForm(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              type="button"
              onClick={() => setIsAporteModalOpen(false)}
              className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 font-bold rounded-xl text-xs flex items-center justify-center gap-2"
            >
              Registrar Aporte
            </button>
          </div>
        </form>
      </Modal>

      {/* Project Modal */}
      <Modal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        title="Proponer Proyecto de Compra"
      >
        <form onSubmit={handleCreateProject} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Código de Proyecto</label>
              <input 
                type="text"
                required
                placeholder="p. ej. ADQ-CAMAS-2026"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs font-bold font-mono"
                value={projectForm.code}
                onChange={e => setProjectForm(prev => ({ ...prev, code: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Presupuesto Estimado (HNL)</label>
              <input 
                type="number"
                step="0.01"
                min={1}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs font-bold"
                value={projectForm.budget}
                onChange={e => setProjectForm(prev => ({ ...prev, budget: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nombre del Proyecto</label>
            <input 
              type="text"
              required
              placeholder="p. ej. Adquisición de Literas Metálicas"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs font-bold"
              value={projectForm.name}
              onChange={e => setProjectForm(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Área Beneficiada</label>
              <input 
                type="text"
                required
                placeholder="p. ej. Dormitorio 1 y 2"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs font-bold"
                value={projectForm.benefitedArea}
                onChange={e => setProjectForm(prev => ({ ...prev, benefitedArea: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Justificación del Proyecto</label>
            <textarea
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs font-bold resize-none h-20"
              placeholder="Describa la necesidad y justificación de esta adquisición..."
              value={projectForm.justification}
              onChange={e => setProjectForm(prev => ({ ...prev, justification: e.target.value }))}
            />
          </div>

          <div className="flex gap-3">
            <button 
              type="button"
              onClick={() => setIsProjectModalOpen(false)}
              className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex-1 bg-primary text-white py-3 font-bold rounded-xl text-xs flex items-center justify-center gap-2"
            >
              Guardar Propuesta
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
