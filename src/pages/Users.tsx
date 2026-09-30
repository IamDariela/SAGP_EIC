import { useState, useEffect } from 'react';
import { storage, logAction } from '../lib/storage';
import { UserProfile, UserRole, UserStatus, Location } from '../types';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { 
  Users as UsersIcon, 
  UserPlus, 
  Search, 
  Filter, 
  Edit2, 
  UserX, 
  UserCheck, 
  Key, 
  Save, 
  X,
  Shield,
  MapPin,
  Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updatePassword, sendPasswordResetEmail } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore'; // Added imports
import { db } from '../lib/firebase'; // Added import
import firebaseConfig from '../../firebase-applet-config.json';

export default function Users() {
  const { profile: currentUserProfile, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    role: '',
    status: '',
  });

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'viewer' as UserRole,
    status: 'active' as UserStatus,
    areaId: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUserProfile || currentUserProfile.role !== 'admin') {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribeUsers = storage.subscribe('user_profiles', (data) => {
      setUsers(data as UserProfile[]);
      setLoading(false);
    }, (error) => {
      console.error('Subscription error:', error);
      setLoading(false);
      // Optional: alert user if needed
    });

    const unsubscribeLocations = storage.subscribe('locations', (data) => {
      setLocations(data as Location[]);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeLocations();
    };
  }, [currentUserProfile, authLoading]);

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = !filters.role || user.role === filters.role;
    const matchesStatus = !filters.status || user.status === filters.status;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // 1. Create in Firebase Auth using secondary app to avoid logging out current user
      const secondaryApp = initializeApp(firebaseConfig, 'SecondaryCreate');
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth, 
        formData.email, 
        formData.password
      ).catch((error) => {
        if (error.code === 'auth/email-already-in-use') {
          throw new Error('El correo electrónico ya está registrado.');
        }
        throw error;
      });
      const uid = userCredential.user.uid;

      // Clean up secondary app
      await deleteApp(secondaryApp);

      // 2. Create profile in Firestore
      const profileData: UserProfile = {
        id: uid,
        uid,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        status: formData.status,
        areaId: formData.areaId || undefined,
        createdAt: { seconds: Math.floor(Date.now() / 1000) },
      };

      // Check if document exists before setting (to prevent accidental overwrite)
      // Note: This requires getDoc, so let's import it in storage or here
      // For now, let's assume if Auth works, UID is unique and safe.
      
      await storage.setDocument('user_profiles', uid, profileData);

      // 3. Log action
      await logAction({
        assetId: 'system',
        assetName: 'Sistema de Usuarios',
        assetCode: 'USER-ADMIN',
        operation: 'create',
        observations: `Usuario creado: ${formData.email} con rol ${formData.role}`,
        userId: currentUserProfile?.uid || 'unknown',
        userName: currentUserProfile?.name || 'Admin',
        timestamp: { seconds: Math.floor(Date.now() / 1000) }
      });

      setIsCreateModalOpen(false);
      resetForm();
      alert('Usuario creado exitosamente.');
    } catch (error: any) {
      console.error('Error creating user:', error);
      alert(`Error al crear usuario: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const changes = [];
      if (selectedUser.role !== formData.role) changes.push({ field: 'role', oldValue: selectedUser.role, newValue: formData.role });
      if (selectedUser.status !== formData.status) changes.push({ field: 'status', oldValue: selectedUser.status, newValue: formData.status });
      if (selectedUser.name !== formData.name) changes.push({ field: 'name', oldValue: selectedUser.name, newValue: formData.name });
      if (selectedUser.areaId !== formData.areaId) changes.push({ field: 'areaId', oldValue: selectedUser.areaId, newValue: formData.areaId });

      if (changes.length > 0) {
        await storage.updateDocument('user_profiles', selectedUser.uid, {
          name: formData.name,
          role: formData.role,
          status: formData.status,
          areaId: formData.areaId || null,
        });

        await logAction({
          assetId: 'system',
          assetName: 'Sistema de Usuarios',
          assetCode: 'USER-ADMIN',
          operation: 'update',
          changes,
          userId: currentUserProfile?.uid || 'unknown',
          userName: currentUserProfile?.name || 'Admin',
          timestamp: { seconds: Math.floor(Date.now() / 1000) }
        });
      }

      setIsEditModalOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Error updating user:', error);
      alert(`Error al actualizar usuario: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || isSubmitting) return;
    setIsSubmitting(true);

    try {
      // For security, we just send a reset email
      await sendPasswordResetEmail(getAuth(), selectedUser.email);
      
      await logAction({
        assetId: 'system',
        assetName: 'Sistema de Usuarios',
        assetCode: 'USER-ADMIN',
        operation: 'status_change',
        observations: `Solicitud de restablecimiento de contraseña para: ${selectedUser.email}`,
        userId: currentUserProfile?.uid || 'unknown',
        userName: currentUserProfile?.name || 'Admin',
        timestamp: { seconds: Math.floor(Date.now() / 1000) }
      });

      setIsResetModalOpen(false);
      alert(`Se ha enviado un correo de restablecimiento a ${selectedUser.email}`);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      alert(`Error al restablecer contraseña: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleUserStatus = async (user: UserProfile) => {
    const newStatus: UserStatus = user.status === 'active' ? 'inactive' : 'active';
    
    // Check if it's the last admin
    if (newStatus === 'inactive' && user.role === 'admin') {
      const otherAdmins = users.filter(u => u.role === 'admin' && u.status === 'active' && u.id !== user.id);
      if (otherAdmins.length === 0) {
        alert('No se puede desactivar al último administrador activo.');
        return;
      }
    }

    try {
      console.log("Attempting to toggle status for user ID:", user.id);
      await storage.updateDocument('user_profiles', user.id, { status: newStatus });
      
      await logAction({
        assetId: 'system',
        assetName: 'Sistema de Usuarios',
        assetCode: 'USER-ADMIN',
        operation: 'status_change',
        changes: [{ field: 'status', oldValue: user.status, newValue: newStatus }],
        userId: currentUserProfile?.uid || 'unknown',
        userName: currentUserProfile?.name || 'Admin',
        timestamp: { seconds: Math.floor(Date.now() / 1000) }
      });
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Error toggling status: ' + error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'viewer',
      status: 'active',
      areaId: '',
      password: '',
    });
    setSelectedUser(null);
  };

  const openEditModal = (user: UserProfile) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      areaId: user.areaId || '',
      password: '', // Password not editable here
    });
    setIsEditModalOpen(true);
  };

  const columns = [
    { 
      header: 'Usuario', 
      accessorKey: (u: UserProfile) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
            {u.name.charAt(0)}
          </div>
          <div>
            <div className="font-bold text-slate-800">{u.name}</div>
            <div className="text-[10px] text-slate-500 font-mono">{u.email}</div>
          </div>
        </div>
      )
    },
    { 
      header: 'Rol', 
      accessorKey: (u: UserProfile) => (
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-600 bg-slate-100 px-2 py-1 rounded-lg w-fit">
          <Shield className="h-3 w-3 text-primary" />
          {u.role.replace('_', ' ')}
        </div>
      )
    },
    { 
      header: 'Estado', 
      accessorKey: (u: UserProfile) => (
        <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg w-fit ${
          u.status === 'active' ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
        }`}>
          {u.status === 'active' ? (
            <><UserCheck className="h-3 w-3" /> Activo</>
          ) : (
            <><UserX className="h-3 w-3" /> Inactivo</>
          )}
        </div>
      )
    },
    { 
      header: 'Creado', 
      accessorKey: (u: UserProfile) => (
        <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {u.createdAt ? format(new Date(u.createdAt.seconds * 1000), 'dd/MM/yyyy', { locale: es }) : 'N/A'}
        </div>
      )
    },
    { 
      header: 'Acciones', 
      accessorKey: (u: UserProfile) => (
        <div className="flex items-center gap-1">
          <button 
            onClick={() => openEditModal(u)}
            className="p-2 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-lg transition-all"
            title="Editar Datos"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button 
            onClick={() => {
              setSelectedUser(u);
              setIsResetModalOpen(true);
            }}
            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-slate-50 rounded-lg transition-all"
            title="Restablecer Acceso"
          >
            <Key className="h-4 w-4" />
          </button>
          <button 
            onClick={() => toggleUserStatus(u)}
            className={`p-2 rounded-lg transition-all ${
              u.status === 'active' ? 'text-rose-400 hover:text-rose-600 hover:bg-rose-50' : 'text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50'
            }`}
            title={u.status === 'active' ? 'Desactivar Usuario' : 'Activar Usuario'}
          >
            {u.status === 'active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
          </button>
        </div>
      )
    }
  ];

  if (currentUserProfile?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
        <div className="h-20 w-20 bg-rose-50 rounded-full flex items-center justify-center mb-6">
          <Shield className="h-10 w-10 text-rose-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Acceso Restringido</h2>
        <p className="text-slate-500 mt-2 max-w-sm">Esta sección es de uso exclusivo para administradores del sistema SAGP.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-800 flex items-center gap-2 uppercase tracking-tight">
            <UsersIcon className="h-6 w-6 text-primary" />
            Usuarios y Permisos
          </h2>
          <p className="text-xs lg:text-sm text-slate-500 font-medium italic">Administración centralizada de accesos y roles</p>
        </div>
        <button 
          onClick={() => {
            resetForm();
            setIsCreateModalOpen(true);
          }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-all font-bold shadow-md active:scale-95"
        >
          <UserPlus className="h-5 w-5" />
          <span>Crear Usuario</span>
        </button>
      </div>

      <div className="bg-white p-4 lg:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative group col-span-1 md:col-span-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 bg-slate-50/50 transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 bg-slate-50/50 transition-all text-sm appearance-none"
              value={filters.role}
              onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
            >
              <option value="">Todos los Roles</option>
              <option value="admin">Administrador</option>
              <option value="inventory_manager">Gestor Inventario</option>
              <option value="weapon_manager">Gestor Armas</option>
              <option value="vehicle_manager">Gestor Vehículos</option>
              <option value="viewer">Consultor</option>
            </select>
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 bg-slate-50/50 transition-all text-sm appearance-none"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="">Cualquier Estado</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      <DataTable data={filteredUsers} columns={columns} loading={loading} />

      {/* Create User Modal */}
      <Modal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        title="Crear Nueva Cuenta de Usuario"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nombre Completo</label>
            <input 
              required
              type="text"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ej: Inspector Juan Pérez"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Correo Electrónico (Acceso)</label>
            <input 
              required
              type="email"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              value={formData.email}
              onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="usuario@sig-eic.gov.hn"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rol de Sistema</label>
              <select 
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white transition-all"
                value={formData.role}
                onChange={e => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
              >
                <option value="admin">Administrador</option>
                <option value="inventory_manager">Gestor Inventario</option>
                <option value="weapon_manager">Gestor Armas</option>
                <option value="vehicle_manager">Gestor Vehículos</option>
                <option value="viewer">Consultor</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estado Inicial</label>
              <select 
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white transition-all"
                value={formData.status}
                onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as UserStatus }))}
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Área / Ubicación</label>
            <select 
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white transition-all"
              value={formData.areaId}
              onChange={e => setFormData(prev => ({ ...prev, areaId: e.target.value }))}
            >
              <option value="">Seleccione un área...</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Contraseña Temporal</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                required
                type="password"
                minLength={6}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                value={formData.password}
                onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <p className="text-[9px] text-slate-400 mt-1 italic">El usuario podrá cambiarla al iniciar sesión.</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-primary text-white px-4 py-3 rounded-xl hover:bg-primary/90 transition-all font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="h-5 w-5" />
              <span>{isSubmitting ? 'Creando...' : 'Crear Cuenta'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        title="Actualizar Datos de Usuario"
      >
        <form onSubmit={handleUpdateUser} className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-4 mb-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {selectedUser?.name.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-slate-800">{selectedUser?.email}</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">ID: {selectedUser?.uid}</p>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nombre Completo</label>
            <input 
              required
              type="text"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rol de Sistema</label>
              <select 
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white transition-all"
                value={formData.role}
                onChange={e => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
              >
                <option value="admin">Administrador</option>
                <option value="inventory_manager">Gestor Inventario</option>
                <option value="weapon_manager">Gestor Armas</option>
                <option value="vehicle_manager">Gestor Vehículos</option>
                <option value="viewer">Consultor</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estado</label>
              <select 
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white transition-all"
                value={formData.status}
                onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as UserStatus }))}
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Área / Ubicación</label>
            <select 
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none bg-white transition-all"
              value={formData.areaId}
              onChange={e => setFormData(prev => ({ ...prev, areaId: e.target.value }))}
            >
              <option value="">Seleccione un área...</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-primary text-white px-4 py-3 rounded-xl hover:bg-primary/90 transition-all font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="h-5 w-5" />
              <span>{isSubmitting ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Restablecer Acceso de Usuario"
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-amber-800">
            <Key className="h-6 w-6 shrink-0" />
            <div className="text-sm">
              <p className="font-bold mb-1">Procedimiento de Seguridad</p>
              <p>Se enviará un enlace seguro al correo institucional del usuario para que pueda definir una nueva contraseña. Por seguridad, el administrador no tiene acceso a las credenciales.</p>
            </div>
          </div>

          <div className="py-2">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Usuario a restablecer:</p>
            <p className="font-bold text-slate-800">{selectedUser?.name}</p>
            <p className="text-sm text-slate-400 font-mono">{selectedUser?.email}</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              onClick={() => setIsResetModalOpen(false)}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
            >
              Cerrar
            </button>
            <button 
              onClick={handleResetPassword}
              disabled={isSubmitting}
              className="flex-1 bg-amber-600 text-white px-4 py-3 rounded-xl hover:bg-amber-700 transition-all font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Key className="h-5 w-5" />
              <span>{isSubmitting ? 'Enviando...' : 'Enviar Enlace'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
