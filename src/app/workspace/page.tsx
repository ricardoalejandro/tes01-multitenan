'use client';

import { Suspense, useEffect, useState, useCallback, useMemo } from 'react';
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
  X,
  ArrowRightLeft,
  Settings,
  ChevronDown,
  GraduationCap,
  CalendarCheck,
  FileText,
  BarChart3,
  Award,
  ClipboardList,
  User,
  Building2,
  KeyRound,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import StudentsModule from '@/components/modules/StudentsModule';
import CoursesModule from '@/components/modules/CoursesModule';
import InstructorsModule from '@/components/modules/InstructorsModule';
import GroupsModule from '@/components/modules/GroupsModule';
import AttendanceModule from '@/components/modules/AttendanceModule';
import TransfersModule from '@/components/modules/TransfersModule';

// Navigation structure with sections (as per UX Proposal)
const navigationSections = [
  {
    id: 'inicio',
    title: '',
    items: [
      { id: 'home', name: 'Inicio', icon: Home, disabled: false },
    ],
  },
  {
    id: 'gestion-academica',
    title: 'Gestión Académica',
    icon: GraduationCap,
    collapsible: true,
    items: [
      { id: 'students', name: 'Probacionistas', icon: Users, disabled: false },
      { id: 'courses', name: 'Cursos', icon: BookOpen, disabled: false },
      { id: 'instructors', name: 'Instructores', icon: UserCheck, disabled: false },
      { id: 'groups', name: 'Grupos', icon: FolderKanban, disabled: false },
    ],
  },
  {
    id: 'asistencia',
    title: 'Asistencia',
    icon: CalendarCheck,
    collapsible: true,
    items: [
      { id: 'attendance', name: 'Registro diario', icon: ClipboardCheck, disabled: false },
      { id: 'notebook', name: 'Cuaderno', icon: ClipboardList, disabled: true },
      { id: 'attendance-reports', name: 'Reportes', icon: FileText, disabled: true },
    ],
  },
  {
    id: 'operaciones',
    title: 'Operaciones',
    icon: Settings,
    collapsible: true,
    items: [
      { id: 'transfers', name: 'Traslados', icon: ArrowRightLeft, disabled: false },
      { id: 'inscriptions', name: 'Inscripciones', icon: FileText, disabled: true },
      { id: 'certificates', name: 'Certificados', icon: Award, disabled: true },
    ],
  },
  {
    id: 'reporteria',
    title: 'Reportería',
    icon: BarChart3,
    collapsible: true,
    items: [
      { id: 'report-attendance', name: 'Asistencia', icon: CalendarCheck, disabled: true },
      { id: 'report-students', name: 'Probacionistas', icon: Users, disabled: true },
      { id: 'report-performance', name: 'Desempeño', icon: BarChart3, disabled: true },
    ],
  },
];

// Flat list for module lookup
const allModules = navigationSections.flatMap(s => s.items);

function WorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchId = searchParams.get('branchId');
  const [activeModule, setActiveModule] = useState('home');
  const [branch, setBranch] = useState<any>(null);
  const [user, setUser] = useState<{ username: string; fullName: string; email: string; userType: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'gestion-academica',
    'asistencia'
  ]);

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

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu on module change
  const handleModuleChange = useCallback((moduleId: string) => {
    setActiveModule(moduleId);
    setMobileMenuOpen(false);
  }, []);

  useEffect(() => {
    if (!branchId) {
      router.push('/dashboard');
      return;
    }

    const loadBranch = async () => {
      try {
        const data = await api.me();
        // Store user info
        setUser({
          username: data.username,
          fullName: data.fullName,
          email: data.email,
          userType: data.userType,
        });
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

  // Tecla Escape = navegación progresiva
  // Si estás en un módulo -> ir a home
  // Si estás en home -> ir a dashboard
  const handleEscape = useCallback(() => {
    if (activeModule !== 'home') {
      setActiveModule('home');
    } else {
      router.push('/dashboard');
    }
  }, [activeModule, router]);

  useEscapeKey(handleEscape, true);

  // Filter navigation based on user permissions
  // Module IDs that map to permission modules
  const modulePermissionMap: Record<string, string> = {
    'students': 'students',
    'courses': 'courses',
    'instructors': 'instructors',
    'groups': 'groups',
    'attendance': 'attendance',
    'notebook': 'attendance',
    'attendance-reports': 'attendance',
    'transfers': 'enrollments', // transfers uses enrollments permission for now
    'inscriptions': 'enrollments',
    'certificates': 'enrollments',
  };

  const filteredNavigationSections = useMemo(() => {
    // If no branch or admin user, show everything
    if (!branch || user?.userType === 'admin') {
      return navigationSections;
    }

    const permissions = branch.permissions || {};

    return navigationSections.map(section => {
      const filteredItems = section.items.filter(item => {
        // Home is always visible
        if (item.id === 'home') return true;
        // Disabled items are hidden for simplicity
        if (item.disabled) return false;

        const permModule = modulePermissionMap[item.id];
        if (!permModule) return true; // No permission mapping = always show

        const modulePerm = permissions[permModule];
        if (!modulePerm) return false; // No permission defined = hide

        return modulePerm.canView === true;
      });

      return { ...section, items: filteredItems };
    }).filter(section => section.items.length > 0);
  }, [branch, user?.userType]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('selected_branch');
    toast.success('Sesión cerrada', { duration: 1500 });
    router.push('/login');
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Helper to get user initials for avatar
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
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
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top Header - Fixed */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-30 shrink-0">
        {/* Left: Logo + Branch */}
        <div className="flex items-center gap-4">
          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-accent-9 to-accent-11 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white text-sm font-bold">SA</span>
            </div>
            <span className="hidden md:block font-semibold text-gray-900">Sistema Académico</span>
          </div>

          {/* Branch Badge - Always visible */}
          <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-accent-2 rounded-full border border-accent-4">
            <Building2 className="h-3 w-3 sm:h-4 sm:w-4 text-accent-10" />
            <span className="text-xs sm:text-sm font-medium text-accent-11 truncate max-w-[100px] sm:max-w-none">{branch?.name}</span>
          </div>
        </div>

        {/* Right: User Avatar Dropdown */}
        <div className="flex items-center gap-3">
          {/* Back to dashboard - desktop only */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="hidden md:flex text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Cambiar filial
          </Button>

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:bg-gray-100 rounded-full pl-2 pr-2 md:pr-3 py-1.5 transition-colors">
                <Avatar className="h-8 w-8 border-2 border-accent-4">
                  <AvatarFallback className="bg-gradient-to-br from-accent-9 to-accent-11 text-white text-sm font-medium">
                    {user ? getInitials(user.fullName) : 'U'}
                  </AvatarFallback>
                </Avatar>
                {/* Nombre visible en móvil y desktop */}
                <div className="text-left max-w-[80px] md:max-w-none">
                  <p className="text-xs md:text-sm font-medium text-gray-900 leading-tight truncate">
                    {user?.fullName?.split(' ')[0] || user?.username || 'Usuario'}
                  </p>
                  <p className="text-[10px] md:text-xs text-gray-500 leading-tight hidden md:block">
                    {user?.userType === 'admin' ? 'Administrador' : 'Operador'}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">{user?.fullName}</span>
                  <span className="text-xs text-muted-foreground">{user?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toast.info('Próximamente: Mi Perfil')}>
                <User className="mr-2 h-4 w-4" />
                Mi Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info('Próximamente: Cambiar Contraseña')}>
                <KeyRound className="mr-2 h-4 w-4" />
                Cambiar Contraseña
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleBack}>
                <Building2 className="mr-2 h-4 w-4" />
                Cambiar Filial
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Container: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={cn(
            'bg-white border-r border-gray-200 flex flex-col transition-all duration-200 z-50',
            // Desktop: collapsible width
            sidebarCollapsed ? 'md:w-16' : 'md:w-60',
            // Mobile: fixed position, slide in/out
            'fixed md:relative inset-y-0 left-0 w-64 md:translate-x-0',
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {/* Mobile close button */}
          <div className="flex md:hidden items-center justify-between p-3 border-b border-gray-100">
            <span className="font-semibold text-gray-900">Menú</span>
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Toggle Button - Solo visible en desktop */}
          <div className={cn('p-2 border-b border-gray-100 hidden md:block', sidebarCollapsed && 'px-1')}>
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
          <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
            {filteredNavigationSections.map((section) => {
              const isExpanded = expandedSections.includes(section.id);
              const SectionIcon = section.icon;
              const hasActiveItem = section.items.some(item => activeModule === item.id);

              return (
                <div key={section.id}>
                  {/* Section Header - only show for collapsible sections */}
                  {section.collapsible && !sidebarCollapsed && (
                    <button
                      onClick={() => toggleSection(section.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors',
                        hasActiveItem ? 'text-accent-11 bg-accent-2' : 'text-gray-500 hover:bg-gray-100'
                      )}
                    >
                      {SectionIcon && <SectionIcon className="h-4 w-4" />}
                      <span className="flex-1 text-left">{section.title}</span>
                      <ChevronDown className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')} />
                    </button>
                  )}

                  {/* Non-collapsible section title */}
                  {!section.collapsible && !sidebarCollapsed && section.title !== 'Principal' && (
                    <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {section.title}
                    </div>
                  )}

                  {/* Section Items */}
                  {(section.collapsible ? isExpanded || sidebarCollapsed : true) && (
                    <div className={cn('space-y-0.5', section.collapsible && !sidebarCollapsed && 'ml-2 mt-1')}>
                      {section.items.map((module) => {
                        const Icon = module.icon;
                        return (
                          <button
                            key={module.id}
                            onClick={() => !module.disabled && handleModuleChange(module.id)}
                            disabled={module.disabled}
                            title={sidebarCollapsed ? module.name : undefined}
                            className={cn(
                              'w-full flex items-center gap-3 rounded-lg text-left transition-colors duration-150',
                              sidebarCollapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5',
                              activeModule === module.id
                                ? 'bg-accent-9 text-white'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                              module.disabled && 'opacity-50 cursor-not-allowed'
                            )}
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
                    </div>
                  )}
                </div>
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

          <div className="flex-1 overflow-auto p-4 md:p-6">
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

            {activeModule === 'transfers' && branchId && (
              <TransfersModule branchId={branchId} />
            )}
          </div>
        </div>
      </div> {/* End Main Container */}
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
