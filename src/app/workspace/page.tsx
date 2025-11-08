'use client';

import { useEffect, useState } from 'react';
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

const modules = [
  { id: 'home', name: 'Inicio', icon: Home },
  { id: 'students', name: 'Probacionistas', icon: Users },
  { id: 'courses', name: 'Cursos', icon: BookOpen },
  { id: 'instructors', name: 'Instructores', icon: UserCheck },
  { id: 'groups', name: 'Grupos', icon: FolderKanban },
  { id: 'attendance', name: 'Asistencia', icon: ClipboardCheck, disabled: true },
];

export default function WorkspacePage() {
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
    toast.success('Sesión cerrada');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent-9"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-neutral-2">
      {/* Sidebar */}
      <div
        className={cn(
          'bg-white border-r border-neutral-6 flex flex-col shadow-lg transition-all duration-300',
          sidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Header */}
        <div className={cn('p-4 border-b border-neutral-6 bg-gradient-to-br from-accent-1 to-accent-2', sidebarCollapsed && 'p-2')}>
          {!sidebarCollapsed && (
            <>
              <h2 className="font-semibold text-lg truncate text-accent-11">{branch?.name}</h2>
              <p className="text-sm text-accent-10 font-medium">{branch?.code}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="mt-3 w-full justify-start hover:bg-accent-3"
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
              className="w-full hover:bg-accent-3"
              title="Volver al Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Toggle Button */}
        <div className={cn('p-2 border-b border-neutral-6', sidebarCollapsed && 'px-1')}>
          <Button
            variant="ghost"
            size={sidebarCollapsed ? 'icon' : 'sm'}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn('w-full', sidebarCollapsed ? 'px-0' : 'justify-start')}
            title={sidebarCollapsed ? 'Expandir menú' : 'Contraer menú'}
          >
            <Menu className={cn('h-4 w-4', !sidebarCollapsed && 'mr-2')} />
            {!sidebarCollapsed && <span>Contraer menú</span>}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <button
                key={module.id}
                onClick={() => !module.disabled && setActiveModule(module.id)}
                disabled={module.disabled}
                title={sidebarCollapsed ? module.name : undefined}
                className={`
                  w-full flex items-center gap-3 rounded-xl text-left transition-all duration-200
                  ${sidebarCollapsed ? 'px-2 py-3 justify-center' : 'px-4 py-3'}
                  ${
                    activeModule === module.id
                      ? 'bg-gradient-to-r from-accent-9 to-accent-10 text-white shadow-lg'
                      : 'hover:bg-neutral-3 text-neutral-12 hover:shadow'
                  }
                  ${module.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <>
                    <span className="font-medium flex-1">{module.name}</span>
                    {module.disabled && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
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
        <div className={cn('p-2 border-t border-neutral-6', sidebarCollapsed && 'px-1')}>
          <Button
            variant="outline"
            size={sidebarCollapsed ? 'icon' : 'sm'}
            className={cn(
              'w-full hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors',
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
      <div className="flex-1 overflow-auto bg-gradient-to-br from-neutral-1 to-neutral-2">
        <div className="p-8">
          {activeModule === 'home' && (
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-accent-9 to-accent-secondary-9 bg-clip-text text-transparent">
                Bienvenido
              </h1>
              <p className="text-neutral-10 mb-8">Selecciona un módulo para comenzar</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-neutral-6 cursor-pointer" onClick={() => setActiveModule('students')}>
                  <div className="bg-gradient-to-br from-accent-9 to-accent-10 p-3 rounded-xl w-fit mb-4">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Probacionistas</h3>
                  <p className="text-neutral-10">Gestiona estudiantes y sus datos</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-neutral-6 cursor-pointer" onClick={() => setActiveModule('courses')}>
                  <div className="bg-gradient-to-br from-accent-9 to-accent-10 p-3 rounded-xl w-fit mb-4">
                    <BookOpen className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Cursos</h3>
                  <p className="text-neutral-10">Administra cursos y temas</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-neutral-6 cursor-pointer" onClick={() => setActiveModule('instructors')}>
                  <div className="bg-gradient-to-br from-accent-9 to-accent-10 p-3 rounded-xl w-fit mb-4">
                    <UserCheck className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Instructores</h3>
                  <p className="text-neutral-10">Gestiona el personal docente</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-neutral-6 cursor-pointer" onClick={() => setActiveModule('groups')}>
                  <div className="bg-gradient-to-br from-accent-9 to-accent-10 p-3 rounded-xl w-fit mb-4">
                    <FolderKanban className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Grupos</h3>
                  <p className="text-neutral-10">Organiza grupos de clases</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-lg opacity-60 border border-neutral-6">
                  <div className="bg-neutral-5 p-3 rounded-xl w-fit mb-4">
                    <ClipboardCheck className="h-8 w-8 text-neutral-9" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Asistencia</h3>
                  <p className="text-neutral-10">Próximamente disponible</p>
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
        </div>
      </div>
    </div>
  );
}
