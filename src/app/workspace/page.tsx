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

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('selected_branch');
    toast.success('Sesión cerrada', { duration: 1500 });
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-neutral-1 via-neutral-2 to-accent-2">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-accent-3 border-t-accent-9"></div>
          <p className="text-neutral-10 animate-pulse">Cargando espacio de trabajo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-neutral-1 via-neutral-2 to-accent-2">
      {/* Sidebar */}
      <div
        className={cn(
          'bg-white/95 backdrop-blur-sm border-r border-neutral-4/50 flex flex-col shadow-xl transition-all duration-300 ease-in-out',
          sidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Header */}
        <div className={cn('p-4 border-b border-neutral-4/50 bg-gradient-to-r from-accent-2 to-accent-3', sidebarCollapsed && 'p-2')}>
          {!sidebarCollapsed && (
            <>
              <h2 className="font-bold text-lg truncate text-neutral-11">{branch?.name}</h2>
              <p className="text-sm text-neutral-9 font-medium bg-neutral-3 inline-block px-2 py-0.5 rounded mt-1">{branch?.code}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="mt-3 w-full justify-start hover:bg-accent-4 transition-all duration-200"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Dashboard
              </Button>
            </>
          )}
          {sidebarCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="w-full hover:bg-accent-4 transition-all duration-200"
              title="Volver al Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Toggle Button */}
        <div className={cn('p-2 border-b border-neutral-4/50', sidebarCollapsed && 'px-1')}>
          <Button
            variant="ghost"
            size={sidebarCollapsed ? 'icon' : 'sm'}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn('w-full transition-all duration-200 hover:bg-neutral-3', sidebarCollapsed ? 'px-0' : 'justify-start')}
            title={sidebarCollapsed ? 'Expandir menú' : 'Contraer menú'}
          >
            <Menu className={cn('h-4 w-4', !sidebarCollapsed && 'mr-2')} />
            {!sidebarCollapsed && <span>Contraer menú</span>}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto custom-scrollbar">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <button
                key={module.id}
                onClick={() => !module.disabled && setActiveModule(module.id)}
                disabled={module.disabled}
                title={sidebarCollapsed ? module.name : undefined}
                className={`
                  w-full flex items-center gap-3 rounded-xl text-left transition-all duration-200 ease-in-out
                  ${sidebarCollapsed ? 'px-2 py-3 justify-center' : 'px-4 py-3'}
                  ${
                    activeModule === module.id
                      ? 'bg-gradient-to-r from-accent-9 to-accent-10 text-white shadow-lg scale-[1.02]'
                      : 'hover:bg-accent-3/50 text-neutral-12 hover:shadow-md hover:scale-[1.01]'
                  }
                  ${module.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <Icon className={cn('h-5 w-5 flex-shrink-0 transition-transform duration-200', activeModule === module.id && 'scale-110')} />
                {!sidebarCollapsed && (
                  <>
                    <span className="font-medium flex-1">{module.name}</span>
                    {module.disabled && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full shadow-sm">
                        Próximamente
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={cn('p-2 border-t border-neutral-4/50', sidebarCollapsed && 'px-1')}>
          <Button
            variant="outline"
            size={sidebarCollapsed ? 'icon' : 'sm'}
            className={cn(
              'w-full hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-all duration-200',
              sidebarCollapsed ? 'px-0' : 'justify-start'
            )}
            onClick={handleLogout}
            title={sidebarCollapsed ? 'Cerrar Sesión' : undefined}
          >
            <LogOut className={cn('h-4 w-4', !sidebarCollapsed && 'mr-2')} />
            {!sidebarCollapsed && 'Cerrar Sesión'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto p-8 custom-scrollbar">
          {activeModule === 'home' && (
            <div className="animate-fade-in-up">
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-neutral-12 to-neutral-10 bg-clip-text text-transparent">
                Bienvenido
              </h1>
              <p className="text-neutral-9 mb-8">Selecciona un módulo para comenzar</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="animate-fade-in-up bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.02] border border-neutral-4/50 cursor-pointer group" style={{ animationDelay: '0.05s' }} onClick={() => setActiveModule('students')}>
                  <div className="bg-gradient-to-br from-accent-8 to-accent-10 p-3 rounded-xl w-fit mb-4 shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-110">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-neutral-11 group-hover:text-accent-11 transition-colors">Probacionistas</h3>
                  <p className="text-neutral-9">Gestiona estudiantes y sus datos</p>
                </div>
                <div className="animate-fade-in-up bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.02] border border-neutral-4/50 cursor-pointer group" style={{ animationDelay: '0.1s' }} onClick={() => setActiveModule('courses')}>
                  <div className="bg-gradient-to-br from-accent-8 to-accent-10 p-3 rounded-xl w-fit mb-4 shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-110">
                    <BookOpen className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-neutral-11 group-hover:text-accent-11 transition-colors">Cursos</h3>
                  <p className="text-neutral-9">Administra cursos y temas</p>
                </div>
                <div className="animate-fade-in-up bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.02] border border-neutral-4/50 cursor-pointer group" style={{ animationDelay: '0.15s' }} onClick={() => setActiveModule('instructors')}>
                  <div className="bg-gradient-to-br from-accent-8 to-accent-10 p-3 rounded-xl w-fit mb-4 shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-110">
                    <UserCheck className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-neutral-11 group-hover:text-accent-11 transition-colors">Instructores</h3>
                  <p className="text-neutral-9">Gestiona el personal docente</p>
                </div>
                <div className="animate-fade-in-up bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.02] border border-neutral-4/50 cursor-pointer group" style={{ animationDelay: '0.2s' }} onClick={() => setActiveModule('groups')}>
                  <div className="bg-gradient-to-br from-accent-8 to-accent-10 p-3 rounded-xl w-fit mb-4 shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-110">
                    <FolderKanban className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-neutral-11 group-hover:text-accent-11 transition-colors">Grupos</h3>
                  <p className="text-neutral-9">Organiza grupos de clases</p>
                </div>
                <div className="animate-fade-in-up bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.02] border border-neutral-4/50 cursor-pointer group" style={{ animationDelay: '0.25s' }} onClick={() => setActiveModule('attendance')}>
                  <div className="bg-gradient-to-br from-accent-8 to-accent-10 p-3 rounded-xl w-fit mb-4 shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-110">
                    <ClipboardCheck className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-neutral-11 group-hover:text-accent-11 transition-colors">Asistencia</h3>
                  <p className="text-neutral-9">Registra asistencia de sesiones</p>
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
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-neutral-1 via-neutral-2 to-accent-2">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-accent-3 border-t-accent-9"></div>
            <p className="text-neutral-10 animate-pulse">Cargando...</p>
          </div>
        </div>
      }
    >
      <WorkspaceContent />
    </Suspense>
  );
}
