'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Home,
  Users,
  BookOpen,
  UserCheck,
  FolderKanban,
  ClipboardCheck,
  ArrowLeft,
  LogOut,
  Menu,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import StudentsModule from '@/components/modules/StudentsModule';
import CoursesModule from '@/components/modules/CoursesModule';
import InstructorsModule from '@/components/modules/InstructorsModule';
import GroupsModule from '@/components/modules/GroupsModule';
import AttendanceModule from '@/components/modules/AttendanceModule';

const modules = [
  { id: 'home', name: 'Inicio', icon: Home, disabled: false },
  { id: 'students', name: 'Probacionistas', icon: Users, disabled: false },
  { id: 'courses', name: 'Cursos', icon: BookOpen, disabled: false },
  { id: 'instructors', name: 'Instructores', icon: UserCheck, disabled: false },
  { id: 'groups', name: 'Grupos', icon: FolderKanban, disabled: false },
  { id: 'attendance', name: 'Asistencia', icon: ClipboardCheck, disabled: false },
];

function WorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchId = searchParams.get('branchId');
  const [activeModule, setActiveModule] = useState('home');
  const [branch, setBranch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Load sidebar state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved) {
      setSidebarCollapsed(JSON.parse(saved));
    }
  }, []);

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (!branchId) {
      router.push('/dashboard');
      return;
    }

    const loadBranch = async () => {
      try {
        const data = await api.me();
        const selectedBranch = data.branches.find((b: any) => b.id === branchId);
        if (selectedBranch) {
          setBranch(selectedBranch);
        } else {
          toast.error('Sucursal no encontrada');
          router.push('/dashboard');
        }
      } catch (error) {
        toast.error('Error al cargar sucursal');
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadBranch();
  }, [branchId, router]);

  const handleBack = () => {
    router.push('/dashboard');
  };

  // Tecla Escape = botón Volver (solo si estamos en módulo home)
  useEscapeKey(handleBack, activeModule === 'home');

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('selected_branch');
    toast.success('Sesión cerrada', { duration: 1500 });
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-accent-9"></div>
          <p className="text-gray-500 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={cn(
          'bg-white border-r border-gray-200 flex flex-col transition-all duration-200',
          sidebarCollapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Header */}
        <div className={cn('p-4 border-b border-gray-100', sidebarCollapsed && 'p-2')}>
          {!sidebarCollapsed && (
            <>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-accent-9 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">SA</span>
                </div>
                <div>
                  <h2 className="font-semibold text-sm text-gray-900 truncate">{branch?.name}</h2>
                  <p className="text-xs text-gray-500">{branch?.code}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="mt-2 w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
            </>
          )}
          {sidebarCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="w-full hover:bg-gray-100"
              title="Volver al Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Toggle Button */}
        <div className={cn('p-2 border-b border-gray-100', sidebarCollapsed && 'px-1')}>
          <Button
            variant="ghost"
            size={sidebarCollapsed ? 'icon' : 'sm'}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn('w-full text-gray-500 hover:text-gray-700 hover:bg-gray-100', sidebarCollapsed ? 'px-0' : 'justify-start')}
            title={sidebarCollapsed ? 'Expandir menú' : 'Contraer menú'}
          >
            <Menu className={cn('h-4 w-4', !sidebarCollapsed && 'mr-2')} />
            {!sidebarCollapsed && <span className="text-sm">Contraer</span>}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <button
                key={module.id}
                onClick={() => !module.disabled && setActiveModule(module.id)}
                disabled={module.disabled}
                title={sidebarCollapsed ? module.name : undefined}
                className={`
                  w-full flex items-center gap-3 rounded-lg text-left transition-colors duration-150
                  ${sidebarCollapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'}
                  ${
                    activeModule === module.id
                      ? 'bg-accent-9 text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                  ${module.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <>
                    <span className="text-sm font-medium flex-1">{module.name}</span>
                    {module.disabled && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                        Pronto
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={cn('p-2 border-t border-gray-100', sidebarCollapsed && 'px-1')}>
          <Button
            variant="ghost"
            size={sidebarCollapsed ? 'icon' : 'sm'}
            className={cn(
              'w-full text-gray-500 hover:text-red-600 hover:bg-red-50',
              sidebarCollapsed ? 'px-0' : 'justify-start'
            )}
            onClick={handleLogout}
            title={sidebarCollapsed ? 'Cerrar Sesión' : undefined}
          >
            <LogOut className={cn('h-4 w-4', !sidebarCollapsed && 'mr-2')} />
            {!sidebarCollapsed && <span className="text-sm">Cerrar Sesión</span>}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col bg-gray-50">
        <div className="flex-1 overflow-auto p-6">
          {activeModule === 'home' && (
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-1">
                Bienvenido
              </h1>
              <p className="text-gray-500 text-sm mb-6">Selecciona un módulo para comenzar</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200 cursor-pointer" onClick={() => setActiveModule('students')}>
                  <div className="bg-accent-9 p-2.5 rounded-lg w-fit mb-3">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">Probacionistas</h3>
                  <p className="text-sm text-gray-500">Gestiona estudiantes y sus datos</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200 cursor-pointer" onClick={() => setActiveModule('courses')}>
                  <div className="bg-accent-9 p-2.5 rounded-lg w-fit mb-3">
                    <BookOpen className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">Cursos</h3>
                  <p className="text-sm text-gray-500">Administra cursos y temas</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200 cursor-pointer" onClick={() => setActiveModule('instructors')}>
                  <div className="bg-accent-9 p-2.5 rounded-lg w-fit mb-3">
                    <UserCheck className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">Instructores</h3>
                  <p className="text-sm text-gray-500">Gestiona el personal docente</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200 cursor-pointer" onClick={() => setActiveModule('groups')}>
                  <div className="bg-accent-9 p-2.5 rounded-lg w-fit mb-3">
                    <FolderKanban className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">Grupos</h3>
                  <p className="text-sm text-gray-500">Organiza grupos de clases</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200 cursor-pointer" onClick={() => setActiveModule('attendance')}>
                  <div className="bg-accent-9 p-2.5 rounded-lg w-fit mb-3">
                    <ClipboardCheck className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">Asistencia</h3>
                  <p className="text-sm text-gray-500">Registra asistencia de sesiones</p>
                </div>
              </div>
            </div>
          )}

          {activeModule === 'students' && branchId && (
            <StudentsModule branchId={branchId} />
          )}

          {activeModule === 'courses' && branchId && (
            <CoursesModule branchId={branchId} />
          )}

          {activeModule === 'instructors' && branchId && (
            <InstructorsModule branchId={branchId} />
          )}

          {activeModule === 'groups' && branchId && (
            <GroupsModule branchId={branchId} />
          )}

          {activeModule === 'attendance' && branchId && (
            <AttendanceModule branchId={branchId} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-accent-9"></div>
            <p className="text-gray-500 text-sm">Cargando...</p>
          </div>
        </div>
      }
    >
      <WorkspaceContent />
    </Suspense>
  );
}
