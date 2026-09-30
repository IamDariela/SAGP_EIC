import { useState, useEffect, useMemo } from 'react';
import { storage } from '../lib/storage';
import { Asset, Location, Person, Assignment, MaintenanceRecord, Course } from '../types';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { Calendar, Users, AlertTriangle, ArrowRight, TrendingUp, Grid, ShieldAlert, Sparkles, Plus, Check } from 'lucide-react';
import { formatDateTime, cn } from '../lib/utils';
import { ensureDefaultCourses } from '../lib/courseService';

export default function Planning() {
  const { profile } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Interval query states
  const [interval, setIntervalDates] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0] // 30 days ahead
  });

  const [scenario, setScenario] = useState<'confirmed' | 'projection'>('confirmed');

  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [newCourse, setNewCourse] = useState<Partial<Course>>({
    name: '',
    startDate: '',
    endDate: '',
    expectedStudents: 20,
    confirmedStudents: 20,
    externalStudents: 0
  });

  useEffect(() => {
    setLoading(true);
    let isMounted = true;
    const unsubAssets = storage.subscribe('assets', (data) => {
      if (isMounted) setAssets((data as Asset[]).filter(a => a.category?.toLowerCase().includes('cama') || a.category?.toLowerCase().includes('litera') || a.name.toLowerCase().includes('cama') || a.name.toLowerCase().includes('litera')));
    });
    const unsubLocs = storage.subscribe('locations', (data) => {
      if (isMounted) setLocations((data as Location[]).filter(l => l.name.toLowerCase().includes('dormitorio') || l.building.toLowerCase().includes('dormitorio')));
    });
    const unsubPeople = storage.subscribe('people', (data) => {
      if (isMounted) setPeople(data as Person[]);
    });
    const unsubAssigns = storage.subscribe('assignments', (data) => {
      if (isMounted) setAssignments(data as Assignment[]);
    });
    const unsubMaint = storage.subscribe('maintenance', (data) => {
      if (isMounted) {
        setMaintenance(data as MaintenanceRecord[]);
        setLoading(false);
      }
    });
    const unsubCourses = storage.subscribe('courses', async (data) => {
      const list = data as Course[];
      if (isMounted) setCourses(list);
      if (list.length === 0) {
        const seeded = await ensureDefaultCourses(list);
        if (isMounted) setCourses(seeded);
      }
    });

    return () => {
      isMounted = false;
      unsubAssets();
      unsubLocs();
      unsubPeople();
      unsubAssigns();
      unsubMaint();
      unsubCourses();
    };
  }, []);

  // Planning Calculations (Section 6)
  const analysis = useMemo(() => {
    const totalPlazas = assets.length;
    const malas = assets.filter(a => a.status === 'bad').length;
    const enMantenimiento = assets.filter(a => a.status === 'maintenance').length;
    
    // Confirmed utilisable capacity
    let capacidadUtilizable = totalPlazas - malas - enMantenimiento;

    // Projection scenario: we hypothetically count 50% of the damaged beds as repaired/reclaimed!
    if (scenario === 'projection') {
      const estimatedRepaired = Math.ceil(malas * 0.6); // assume 60% of bad beds will be repaired
      capacidadUtilizable += estimatedRepaired;
    }

    // Overlap checks and active demand per day
    const queryStart = new Date(interval.start);
    const queryEnd = new Date(interval.end);
    
    const activeCoursesInInterval = courses.filter(c => {
      if (!c.startDate || !c.endDate) return false;
      const startA = new Date(c.startDate);
      const endA = new Date(c.endDate);
      // startA < endB && startB < endA
      return startA < queryEnd && queryStart < endA;
    });

    // Calculate maximum demand and deficit timeline
    // We analyze the day-by-day metrics in the range
    const timeline: { dateStr: string; demand: number; capacity: number; deficit: number }[] = [];
    let maxDeficit = 0;
    let deficitDate: string | null = null;
    let maxDemandOnRange = 0;

    const daysCount = Math.ceil((queryEnd.getTime() - queryStart.getTime()) / (24 * 3600 * 1000)) + 1;
    for (let i = 0; i < daysCount; i++) {
      const curDate = new Date(queryStart.getTime() + i * 24 * 3600 * 1000);
      const curDateStr = curDate.toISOString().split('T')[0];

      // Find active courses on this date
      const coursesOnDay = courses.filter(c => {
        if (!c.startDate || !c.endDate) return false;
        const start = new Date(c.startDate);
        const end = new Date(c.endDate);
        return curDate >= start && curDate <= end;
      });

      // Sum demand of these courses (confirmed students - external students who do not need bed)
      const demandOnDay = coursesOnDay.reduce((sum, c) => {
        const confirmed = Number(c.confirmedStudents ?? 20);
        const external = Number(c.externalStudents ?? 0);
        return sum + (confirmed - external);
      }, 0);
      const def = Math.max(0, demandOnDay - capacidadUtilizable);

      if (demandOnDay > maxDemandOnRange) maxDemandOnRange = demandOnDay;
      if (def > maxDeficit) {
        maxDeficit = def;
        deficitDate = curDateStr;
      }

      timeline.push({
        dateStr: curDateStr,
        demand: demandOnDay,
        capacity: capacidadUtilizable,
        deficit: def
      });
    }

    return {
      totalPlazas,
      malas,
      enMantenimiento,
      capacidadUtilizable,
      activeCoursesCount: activeCoursesInInterval.length,
      maxDemandOnRange,
      maxDeficit,
      deficitDate,
      timeline
    };
  }, [assets, courses, interval, scenario]);

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.name || !newCourse.startDate || !newCourse.endDate) return;

    try {
      await storage.addDocument('courses', {
        name: newCourse.name.trim(),
        code: `CUR-${newCourse.name.trim().substring(0, 4).toUpperCase()}`,
        startDate: newCourse.startDate,
        endDate: newCourse.endDate,
        expectedStudents: Number(newCourse.expectedStudents) || 20,
        confirmedStudents: Number(newCourse.confirmedStudents) || 20,
        externalStudents: Number(newCourse.externalStudents) || 0,
        status: 'active'
      });

      setIsCourseModalOpen(false);
      setNewCourse({ name: '', startDate: '', endDate: '', expectedStudents: 20, confirmedStudents: 20, externalStudents: 0 });
      alert('Curso planificado y registrado correctamente.');
    } catch (err) {
      console.error('Error al agregar curso:', err);
      alert('Error técnico al guardar el curso.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-800 flex items-center gap-2 uppercase tracking-tight">
            <TrendingUp className="h-6 w-6 text-primary" />
            Planificación de Alojamiento y Capacidad
          </h2>
          <p className="text-xs lg:text-sm text-slate-500 font-medium italic">Simulación de cupos y análisis de suficiencia temporal</p>
        </div>
        
        {/* Scenario Switcher */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-sm shrink-0">
          <button
            onClick={() => setScenario('confirmed')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-black uppercase transition-all",
              scenario === 'confirmed' ? "bg-primary text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            Situación Confirmada
          </button>
          <button
            onClick={() => setScenario('projection')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-black uppercase transition-all flex items-center gap-1.5",
              scenario === 'projection' ? "bg-accent text-primary shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Proyección de Recuperación
          </button>
        </div>
      </div>

      {/* Date Interval Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            Intervalo Desde
          </label>
          <input 
            type="date"
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-0 outline-none"
            value={interval.start}
            onChange={e => setIntervalDates(prev => ({ ...prev, start: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            Intervalo Hasta
          </label>
          <input 
            type="date"
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-0 outline-none"
            value={interval.end}
            onChange={e => setIntervalDates(prev => ({ ...prev, end: e.target.value }))}
          />
        </div>
        <div className="md:col-span-2 flex items-end">
          <button
            onClick={() => setIsCourseModalOpen(true)}
            className="w-full bg-primary hover:bg-primary/95 text-white py-3 rounded-xl font-bold text-xs uppercase shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Planificar Nuevo Curso / Matrícula
          </button>
        </div>
      </div>

      {/* Capacity Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm text-center">
          <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Total Plazas Físicas</p>
          <p className="text-2xl font-black text-slate-800">{analysis.totalPlazas}</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm text-center">
          <p className="text-[9px] text-rose-500 uppercase font-black tracking-widest mb-1">Camas Fuera de Servicio</p>
          <p className="text-2xl font-black text-rose-600">{analysis.malas + analysis.enMantenimiento}</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm text-center">
          <p className="text-[9px] text-emerald-500 uppercase font-black tracking-widest mb-1">Plazas Utilizables ({scenario === 'confirmed' ? 'Real' : 'Proyección'})</p>
          <p className="text-2xl font-black text-emerald-600">{analysis.capacidadUtilizable}</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm text-center">
          <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Cursos en Período</p>
          <p className="text-2xl font-black text-primary">{analysis.activeCoursesCount}</p>
        </div>
      </div>

      {/* Deficit Alert Banner */}
      {analysis.maxDeficit > 0 ? (
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-3xl flex flex-col sm:flex-row items-center gap-4 justify-between animate-in slide-in-from-top-3 duration-500">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center shrink-0">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-rose-800 uppercase tracking-tight">Déficit de Alojamiento Detectado</h3>
              <p className="text-xs text-rose-600 font-bold">
                Faltan un máximo de <span className="underline font-black">{analysis.maxDeficit} plazas</span> en la fecha <span className="underline font-black">{analysis.deficitDate}</span> dentro de la simulación.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase text-rose-700 bg-rose-100/50 px-3 py-1.5 rounded-full shrink-0">
            Conflicto de Fechas Solapadas
          </span>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-3xl flex items-center gap-4 animate-in slide-in-from-top-3 duration-500">
          <div className="h-12 w-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
            <Check className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-black text-emerald-800 uppercase tracking-tight">Capacidad de Alojamiento Suficiente</h3>
            <p className="text-xs text-emerald-600 font-bold">No se registran déficits o solapamientos críticos en las fechas consultadas.</p>
          </div>
        </div>
      )}

      {/* Courses List and Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Table of active courses */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Matrículas y Cursos en Simulación</h3>
          </div>
          <div className="space-y-4">
            {courses.map(c => {
              const totalEst = Number(c.confirmedStudents ?? 20) - Number(c.externalStudents ?? 0);

              return (
                <div key={c.id} className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">{c.name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1 flex items-center gap-1.5">
                      {c.startDate || 'Fecha inicio'}
                      <ArrowRight className="h-3 w-3" />
                      {c.endDate || 'Fecha fin'}
                    </p>
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 block font-bold uppercase">Necesitan Cama:</span>
                      <span className="text-sm font-black text-primary">{totalEst} Alumnos</span>
                    </div>
                    <div className="text-right border-l border-slate-200 pl-4 text-[9px] font-bold text-slate-500">
                      <span>Totales: {c.expectedStudents ?? 20}</span>
                      <span className="block text-emerald-600">Confirmados: {c.confirmedStudents ?? 20}</span>
                      <span className="block text-rose-500">Externos: {c.externalStudents ?? 0}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline breakdown */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Desglose de Capacidad vs Demanda</h3>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {analysis.timeline.map((day, idx) => {
              const occupancyPct = Math.min(100, Math.ceil((day.demand / day.capacity) * 100)) || 0;
              return (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-slate-800">{day.dateStr}</span>
                    <span className={cn(
                      day.deficit > 0 ? "text-rose-600 font-black" : "text-slate-500"
                    )}>
                      {day.deficit > 0 ? `Déficit: -${day.deficit}` : `${day.demand}/${day.capacity} Camas`}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all",
                        day.deficit > 0 ? "bg-rose-500" : "bg-primary"
                      )}
                      style={{ width: `${occupancyPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add Course Modal */}
      <Modal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        title="Planificar Nuevo Curso de Matrícula"
      >
        <form onSubmit={handleAddCourse} className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nombre del Curso / Grupo</label>
            <input 
              type="text"
              required
              placeholder="p. ej. Criminalística de Campo II"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs font-bold"
              value={newCourse.name || ''}
              onChange={e => setNewCourse(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fecha de Entrada</label>
              <input 
                type="date"
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs font-bold"
                value={newCourse.startDate || ''}
                onChange={e => setNewCourse(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fecha de Salida</label>
              <input 
                type="date"
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs font-bold"
                value={newCourse.endDate || ''}
                onChange={e => setNewCourse(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase">Previsión Alumnos</label>
              <input 
                type="number"
                min={0}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                value={newCourse.expectedStudents}
                onChange={e => setNewCourse(prev => ({ ...prev, expectedStudents: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase">Confirmados</label>
              <input 
                type="number"
                min={0}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                value={newCourse.confirmedStudents}
                onChange={e => setNewCourse(prev => ({ ...prev, confirmedStudents: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase">Alumnos Externos</label>
              <input 
                type="number"
                min={0}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                value={newCourse.externalStudents}
                onChange={e => setNewCourse(prev => ({ ...prev, externalStudents: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              type="button"
              onClick={() => setIsCourseModalOpen(false)}
              className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex-1 bg-primary text-white py-3 font-bold rounded-xl text-xs hover:bg-primary/90 flex items-center justify-center gap-2"
            >
              Planificar Curso
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
