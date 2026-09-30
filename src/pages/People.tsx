import { useState, useEffect } from 'react';
import { storage } from '../lib/storage';
import { Person } from '../types';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import { Users, Plus, Search, User, Save, Phone } from 'lucide-react';

export default function People() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Partial<Person> | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = storage.subscribe('people', (data) => {
      setPeople(data as Person[]);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const filteredPeople = people.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.identification.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPerson?.name || !editingPerson?.identification) return;

    if (editingPerson.id) {
      await storage.updateDocument('people', editingPerson.id, editingPerson);
    } else {
      await storage.addDocument('people', {
        ...editingPerson,
        department: editingPerson.department || 'Sin departamento'
      });
    }
    setIsModalOpen(false);
    setEditingPerson(null);
  };

  const columns: Column<Person>[] = [
    { 
      header: 'Nombre Completo', 
      accessorKey: (p: Person) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
            <User className="h-4 w-4 text-slate-500" />
          </div>
          <span className="font-medium text-slate-800">{p.name}</span>
        </div>
      )
    },
    { header: 'Identificación / DNI', accessorKey: (p: any) => p.identification, className: 'font-mono text-xs' },
    { header: 'Teléfono', accessorKey: (p: any) => p.phone || 'N/T', className: 'text-xs' },
    { header: 'Departamento / Unidad', accessorKey: (p: any) => p.department },
    { 
      header: 'Acciones', 
      accessorKey: (p: Person) => (
        <button 
          onClick={() => {
            setEditingPerson(p);
            setIsModalOpen(true);
          }}
          className="text-primary hover:text-primary/80 text-xs font-bold uppercase tracking-widest"
        >
          Editar
        </button>
      ) 
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-800 flex items-center gap-2 uppercase tracking-tight">
            <Users className="h-6 w-6 text-primary" />
            Registro de Personal
          </h2>
          <p className="text-xs lg:text-sm text-slate-500 font-medium italic">Personal responsable de activos institucionales</p>
        </div>
        <button 
          onClick={() => {
            setEditingPerson({ department: 'UNIVERSIDAD NACIONAL DE LA POLICÍA DE HONDURAS' });
            setIsModalOpen(true);
          }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-all font-bold shadow-md active:scale-95"
        >
          <Plus className="h-5 w-5" />
          Registrar Persona
        </button>
      </div>

      <div className="relative group max-w-2xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
        <input
          type="text"
          placeholder="Buscar por nombre o número de identidad..."
          className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white shadow-sm transition-all text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <DataTable data={filteredPeople} columns={columns} loading={loading} />

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPerson(null);
        }}
        title={editingPerson?.id ? 'Editar Persona' : 'Registrar Persona'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nombre Completo</label>
            <input 
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold"
              value={editingPerson?.name || ''}
              onChange={e => setEditingPerson(prev => ({ ...prev, name: e.target.value.toUpperCase() }))}
              placeholder="NOMBRE DEL RESPONSABLE"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Identificación / DNI</label>
              <input 
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono"
                value={editingPerson?.identification || ''}
                onChange={e => setEditingPerson(prev => ({ ...prev, identification: e.target.value }))}
                placeholder="0000-0000-00000"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Teléfono</label>
              <div className="relative group">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input 
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold"
                  value={editingPerson?.phone || ''}
                  onChange={e => setEditingPerson(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="9999-0000"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dependencia / Departamento</label>
            <input 
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium"
              value={editingPerson?.department || ''}
              onChange={e => setEditingPerson(prev => ({ ...prev, department: e.target.value }))}
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex-1 bg-primary text-white px-4 py-3 rounded-xl hover:bg-primary/90 transition-all font-bold shadow-lg flex items-center justify-center gap-2"
            >
              <Save className="h-5 w-5" />
              <span>Guardar Persona</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
