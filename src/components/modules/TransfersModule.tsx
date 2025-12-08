'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    ArrowRightLeft,
    ArrowUpRight,
    ArrowDownLeft,
    History,
    Search,
    Plus,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    Loader2,
    Send,
    Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Transfer {
    id: string;
    studentId: string;
    studentDni: string;
    studentName: string;
    sourceBranchId: string;
    sourceBranchName: string;
    targetBranchId: string;
    targetBranchName: string;
    status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';
    transferType: 'outgoing' | 'incoming';
    reason: string | null;
    notes: string | null;
    rejectionReason: string | null;
    expiresAt: string;
    createdAt: string;
    createdByName: string | null;
    processedByName: string | null;
    processedAt: string | null;
}

interface StudentSearchResult {
    studentId: string;
    dni: string;
    firstName: string;
    paternalLastName: string;
    maternalLastName: string | null;
    branchId: string;
    branchName: string;
    branchCode: string;
}

interface Branch {
    id: string;
    name: string;
    code: string;
}

const statusConfig = {
    pending: { label: 'Pendiente', variant: 'warning' as const, icon: Clock },
    accepted: { label: 'Aceptado', variant: 'success' as const, icon: CheckCircle },
    rejected: { label: 'Rechazado', variant: 'danger' as const, icon: XCircle },
    cancelled: { label: 'Cancelado', variant: 'secondary' as const, icon: XCircle },
    expired: { label: 'Expirado', variant: 'secondary' as const, icon: AlertCircle },
};

export default function TransfersModule({ branchId }: { branchId: string }) {
    const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing' | 'history'>('incoming');
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [loading, setLoading] = useState(true);
    const [branches, setBranches] = useState<Branch[]>([]);

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [showAcceptDialog, setShowAcceptDialog] = useState<Transfer | null>(null);
    const [showRejectDialog, setShowRejectDialog] = useState<Transfer | null>(null);

    // Form states
    const [searchDni, setSearchDni] = useState('');
    const [debouncedSearchDni, setDebouncedSearchDni] = useState('');
    const [searchResults, setSearchResults] = useState<StudentSearchResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<StudentSearchResult | null>(null);
    const [targetBranchId, setTargetBranchId] = useState('');
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Filter states for enhanced search
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [groupFilter, setGroupFilter] = useState<string>('');
    const [availableGroups, setAvailableGroups] = useState<{ id: string; name: string }[]>([]);

    // Load groups for filter
    const loadGroups = useCallback(async () => {
        try {
            const response = await api.getGroups(branchId);
            setAvailableGroups((response.data || []).map((g: any) => ({ id: g.id, name: g.name })));
        } catch (error) {
            console.error('Error loading groups:', error);
        }
    }, [branchId]);

    useEffect(() => {
        loadGroups();
    }, [loadGroups]);

    // Load transfers
    const loadTransfers = useCallback(async () => {
        try {
            setLoading(true);
            const type = activeTab === 'history' ? 'all' : activeTab;
            const status = activeTab === 'history' ? 'all' : 'pending';
            const response = await api.getTransfers(branchId, type, status);
            setTransfers(response.data || []);
        } catch (error) {
            console.error('Error loading transfers:', error);
            toast.error('Error al cargar traslados');
        } finally {
            setLoading(false);
        }
    }, [branchId, activeTab]);

    // Load branches
    const loadBranches = useCallback(async () => {
        try {
            const response = await api.getBranches();
            setBranches((response.data || []).filter((b: Branch) => b.id !== branchId));
        } catch (error) {
            console.error('Error loading branches:', error);
        }
    }, [branchId]);

    useEffect(() => {
        loadTransfers();
    }, [loadTransfers]);

    useEffect(() => {
        loadBranches();
    }, [loadBranches]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchDni(searchDni);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchDni]);

    // Search students with filters (for "Enviar Probacionista" modal - current branch)
    useEffect(() => {
        const searchStudents = async () => {
            // Only search if "Enviar" modal is open
            if (!showCreateModal) return;

            try {
                setSearchLoading(true);
                const response = await api.getStudents({
                    branchId,
                    search: debouncedSearchDni,
                    status: statusFilter || undefined,
                    groupId: groupFilter || undefined,
                    limit: 20,
                    page: 1,
                });
                // Transform to StudentSearchResult format
                const results = (response.data || []).map((s: any) => ({
                    studentId: s.id,
                    dni: s.dni,
                    firstName: s.firstName,
                    paternalLastName: s.paternalLastName,
                    maternalLastName: s.maternalLastName,
                    branchId: branchId,
                    branchName: '',
                    branchCode: '',
                }));
                setSearchResults(results);
            } catch (error) {
                console.error('Error searching students:', error);
            } finally {
                setSearchLoading(false);
            }
        };
        searchStudents();
    }, [debouncedSearchDni, branchId, statusFilter, groupFilter, showCreateModal]);

    // Search students globally (for "Solicitar Probacionista" modal - other branches)
    useEffect(() => {
        const searchStudentsGlobal = async () => {
            // Only search if "Solicitar" modal is open and has search term
            if (!showRequestModal || debouncedSearchDni.length < 3) {
                if (showRequestModal && debouncedSearchDni.length < 3) {
                    setSearchResults([]);
                }
                return;
            }

            try {
                setSearchLoading(true);
                const response = await api.searchStudentGlobal(debouncedSearchDni, branchId);
                // Filter out students from current branch (we want to request from OTHER branches)
                const results = (response.data || []).filter((s: any) => s.branchId !== branchId);
                setSearchResults(results);
            } catch (error) {
                console.error('Error searching students globally:', error);
            } finally {
                setSearchLoading(false);
            }
        };
        searchStudentsGlobal();
    }, [debouncedSearchDni, branchId, showRequestModal]);

    // Handle create transfer (outgoing - enviar estudiante)
    const handleCreateTransfer = async () => {
        if (!selectedStudent || !targetBranchId) {
            toast.error('Selecciona un estudiante y filial destino');
            return;
        }

        try {
            setSubmitting(true);
            await api.createTransfer({
                studentId: selectedStudent.studentId,
                targetBranchId,
                transferType: 'outgoing',
                reason,
                notes,
            });
            toast.success('Traslado creado exitosamente');
            setShowCreateModal(false);
            resetForm();
            loadTransfers();
        } catch (error: any) {
            const message = error.response?.data?.error || 'Error al crear traslado';
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    // Handle request transfer (incoming - solicitar estudiante)
    const handleRequestTransfer = async () => {
        if (!selectedStudent) {
            toast.error('Selecciona un estudiante');
            return;
        }

        try {
            setSubmitting(true);
            await api.createTransfer({
                studentId: selectedStudent.studentId,
                targetBranchId: branchId, // My branch is the target (receiving)
                transferType: 'incoming',
                reason,
                notes,
            });
            toast.success('Solicitud de traslado enviada');
            setShowRequestModal(false);
            resetForm();
            loadTransfers();
        } catch (error: any) {
            const message = error.response?.data?.error || 'Error al solicitar traslado';
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    // Handle accept transfer
    const handleAcceptTransfer = async () => {
        if (!showAcceptDialog) return;

        try {
            setSubmitting(true);
            const result = await api.acceptTransfer(showAcceptDialog.id);
            toast.success('Traslado aceptado. El probacionista ahora pertenece a tu filial.');
            if (result.removedGroups?.length > 0) {
                toast.info(`Se removió de ${result.removedGroups.length} grupo(s) en la filial origen`);
            }
            setShowAcceptDialog(null);
            loadTransfers();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error al aceptar traslado');
        } finally {
            setSubmitting(false);
        }
    };

    // Handle reject transfer
    const handleRejectTransfer = async () => {
        if (!showRejectDialog) return;

        try {
            setSubmitting(true);
            await api.rejectTransfer(showRejectDialog.id, rejectionReason);
            toast.success('Traslado rechazado');
            setShowRejectDialog(null);
            setRejectionReason('');
            loadTransfers();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error al rechazar traslado');
        } finally {
            setSubmitting(false);
        }
    };

    // Handle cancel transfer
    const handleCancelTransfer = async (transfer: Transfer) => {
        if (!confirm('¿Cancelar este traslado?')) return;

        try {
            await api.cancelTransfer(transfer.id);
            toast.success('Traslado cancelado');
            loadTransfers();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error al cancelar traslado');
        }
    };

    const resetForm = () => {
        setSearchDni('');
        setDebouncedSearchDni('');
        setSearchResults([]);
        setSelectedStudent(null);
        setTargetBranchId('');
        setReason('');
        setNotes('');
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('es-PE', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const getDaysUntilExpiry = (expiresAt: string) => {
        const now = new Date();
        const expiry = new Date(expiresAt);
        const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return days;
    };

    const TransferCard = ({ transfer }: { transfer: Transfer }) => {
        const config = statusConfig[transfer.status];
        const StatusIcon = config.icon;
        const daysLeft = transfer.status === 'pending' ? getDaysUntilExpiry(transfer.expiresAt) : null;
        const isIncoming = transfer.targetBranchId === branchId;
        const canAccept = transfer.status === 'pending' && isIncoming;
        const canCancel = transfer.status === 'pending' && !isIncoming;

        return (
            <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-gray-900 truncate">
                                    {transfer.studentName}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                    {transfer.studentDni}
                                </Badge>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                <span className="truncate">{transfer.sourceBranchName}</span>
                                <ArrowRightLeft className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">{transfer.targetBranchName}</span>
                            </div>

                            {transfer.reason && (
                                <p className="text-sm text-gray-500 mb-2 line-clamp-1">
                                    {transfer.reason}
                                </p>
                            )}

                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span>Creado: {formatDate(transfer.createdAt)}</span>
                                {daysLeft !== null && daysLeft > 0 && (
                                    <span className={cn(
                                        'flex items-center gap-1',
                                        daysLeft <= 2 && 'text-amber-600'
                                    )}>
                                        <Clock className="h-3 w-3" />
                                        {daysLeft} días restantes
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                            <Badge variant={config.variant} className="flex items-center gap-1">
                                <StatusIcon className="h-3 w-3" />
                                {config.label}
                            </Badge>

                            {transfer.status === 'pending' && (
                                <div className="flex gap-1">
                                    {canAccept && (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setShowAcceptDialog(transfer)}
                                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                            >
                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                Aceptar
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setShowRejectDialog(transfer)}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <XCircle className="h-4 w-4 mr-1" />
                                                Rechazar
                                            </Button>
                                        </>
                                    )}
                                    {canCancel && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleCancelTransfer(transfer)}
                                            className="text-gray-600"
                                        >
                                            Cancelar
                                        </Button>
                                    )}
                                </div>
                            )}

                            {transfer.rejectionReason && (
                                <p className="text-xs text-red-600">
                                    Razón: {transfer.rejectionReason}
                                </p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex-none pb-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">
                            Traslados entre Filiales
                        </h1>
                        <p className="text-gray-500 text-sm mt-0.5">
                            Gestiona el envío y recepción de probacionistas
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            onClick={() => setShowRequestModal(true)}
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Solicitar Probacionista
                        </Button>
                        <Button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-accent-9 hover:bg-accent-10 text-white"
                        >
                            <Send className="mr-2 h-4 w-4" />
                            Enviar Probacionista
                        </Button>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                    <TabsList>
                        <TabsTrigger value="incoming" className="flex items-center gap-2">
                            <ArrowDownLeft className="h-4 w-4" />
                            Entrantes
                        </TabsTrigger>
                        <TabsTrigger value="outgoing" className="flex items-center gap-2">
                            <ArrowUpRight className="h-4 w-4" />
                            Salientes
                        </TabsTrigger>
                        <TabsTrigger value="history" className="flex items-center gap-2">
                            <History className="h-4 w-4" />
                            Historial
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-accent-9" />
                    </div>
                ) : transfers.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <ArrowRightLeft className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>No hay traslados {activeTab === 'incoming' ? 'entrantes' : activeTab === 'outgoing' ? 'salientes' : ''}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {transfers.map((transfer) => (
                            <TransferCard key={transfer.id} transfer={transfer} />
                        ))}
                    </div>
                )}
            </div>

            {/* Create Transfer Modal (Outgoing - Enviar) */}
            <ResponsiveDialog
                open={showCreateModal}
                onOpenChange={setShowCreateModal}
                title="Enviar Probacionista a otra Filial"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Selecciona un probacionista de tu filial y la filial destino.
                    </p>

                    {/* Enhanced Student Search Bar */}
                    <div className="space-y-3">
                        <Label>Buscar Probacionista</Label>
                        <div className="flex flex-wrap gap-2">
                            {/* Search Input */}
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    value={searchDni}
                                    onChange={(e) => setSearchDni(e.target.value)}
                                    placeholder="Buscar por nombre o DNI..."
                                    className="pl-9"
                                />
                                {searchLoading && (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                                )}
                            </div>

                            {/* Status Filter */}
                            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val === 'all' ? '' : val)}>
                                <SelectTrigger className="w-[120px]">
                                    <SelectValue placeholder="Estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="Alta">Alta</SelectItem>
                                    <SelectItem value="Baja">Baja</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Group Filter */}
                            <Select value={groupFilter} onValueChange={(val) => setGroupFilter(val === 'all' ? '' : val)}>
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="Grupo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los grupos</SelectItem>
                                    {availableGroups.map((g) => (
                                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Search Results */}
                    {searchResults.length > 0 && !selectedStudent && (
                        <div className="border rounded-lg divide-y max-h-48 overflow-auto">
                            {searchResults.map((student) => (
                                <button
                                    key={student.studentId}
                                    onClick={() => setSelectedStudent(student)}
                                    className="w-full p-3 text-left hover:bg-gray-50 transition-colors"
                                >
                                    <div className="font-medium">
                                        {student.firstName} {student.paternalLastName} {student.maternalLastName}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        DNI: {student.dni}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* No results message */}
                    {searchResults.length === 0 && !selectedStudent && debouncedSearchDni && !searchLoading && (
                        <div className="p-3 text-sm text-gray-500 text-center border rounded-lg">
                            No se encontraron probacionistas con los criterios de búsqueda
                        </div>
                    )}

                    {/* Selected Student */}
                    {selectedStudent && (
                        <div className="p-3 bg-accent-2 rounded-lg border border-accent-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-medium text-accent-11">
                                        {selectedStudent.firstName} {selectedStudent.paternalLastName} {selectedStudent.maternalLastName || ''}
                                    </div>
                                    <div className="text-sm text-accent-10">
                                        DNI: {selectedStudent.dni}
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { setSelectedStudent(null); setSearchDni(''); }}
                                >
                                    Cambiar
                                </Button>
                            </div>
                        </div>
                    )}

                    <div>
                        <Label>Filial Destino *</Label>
                        <Select value={targetBranchId} onValueChange={setTargetBranchId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar filial..." />
                            </SelectTrigger>
                            <SelectContent>
                                {branches.map((branch) => (
                                    <SelectItem key={branch.id} value={branch.id}>
                                        {branch.name} ({branch.code})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label>Motivo del Traslado</Label>
                        <Input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Ej: Cambio de domicilio"
                        />
                    </div>

                    <div>
                        <Label>Notas Adicionales</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Información adicional..."
                            rows={2}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="secondary" onClick={() => { setShowCreateModal(false); resetForm(); }}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleCreateTransfer}
                            disabled={submitting || !targetBranchId || !selectedStudent}
                            className="bg-accent-9 hover:bg-accent-10 text-white"
                        >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                            Enviar Traslado
                        </Button>
                    </div>
                </div>
            </ResponsiveDialog>

            {/* Request Transfer Modal (Incoming - Solicitar) */}
            <ResponsiveDialog
                open={showRequestModal}
                onOpenChange={setShowRequestModal}
                title="Solicitar Probacionista de otra Filial"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Busca un probacionista por DNI para solicitar su traslado a tu filial.
                    </p>

                    {/* Enhanced Search Bar */}
                    <div className="space-y-2">
                        <Label>Buscar Probacionista</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                value={searchDni}
                                onChange={(e) => setSearchDni(e.target.value)}
                                placeholder="Buscar por nombre o DNI..."
                                className="pl-9"
                            />
                            {searchLoading && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                            )}
                        </div>
                        <p className="text-xs text-gray-500">Ingresa al menos 3 caracteres para buscar</p>
                    </div>

                    {/* Search Results */}
                    {searchResults.length > 0 && !selectedStudent && (
                        <div className="border rounded-lg divide-y max-h-48 overflow-auto">
                            {searchResults.map((student) => (
                                <button
                                    key={student.studentId}
                                    onClick={() => setSelectedStudent(student)}
                                    className="w-full p-3 text-left hover:bg-gray-50 transition-colors"
                                >
                                    <div className="font-medium">
                                        {student.firstName} {student.paternalLastName} {student.maternalLastName}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        DNI: {student.dni} • {student.branchName}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Selected Student */}
                    {selectedStudent && (
                        <div className="p-3 bg-accent-2 rounded-lg border border-accent-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-medium text-accent-11">
                                        {selectedStudent.firstName} {selectedStudent.paternalLastName}
                                    </div>
                                    <div className="text-sm text-accent-10">
                                        DNI: {selectedStudent.dni} • {selectedStudent.branchName}
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedStudent(null)}
                                >
                                    Cambiar
                                </Button>
                            </div>
                        </div>
                    )}

                    <div>
                        <Label>Motivo de la Solicitud</Label>
                        <Input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Ej: Traslado por cercanía"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="secondary" onClick={() => { setShowRequestModal(false); resetForm(); }}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleRequestTransfer}
                            disabled={submitting || !selectedStudent}
                            className="bg-accent-9 hover:bg-accent-10 text-white"
                        >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                            Solicitar Traslado
                        </Button>
                    </div>
                </div>
            </ResponsiveDialog>

            {/* Accept Confirmation Dialog */}
            <AlertDialog open={!!showAcceptDialog} onOpenChange={() => setShowAcceptDialog(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Aceptar traslado?</AlertDialogTitle>
                        <AlertDialogDescription>
                            El probacionista <strong>{showAcceptDialog?.studentName}</strong> será transferido
                            desde <strong>{showAcceptDialog?.sourceBranchName}</strong> a tu filial.
                            <br /><br />
                            <span className="text-amber-600">
                                ⚠️ El probacionista será dado de baja automáticamente de la filial origen
                                y removido de todos sus grupos activos.
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleAcceptTransfer}
                            disabled={submitting}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {submitting ? 'Procesando...' : 'Aceptar Traslado'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Reject Confirmation Dialog */}
            <AlertDialog open={!!showRejectDialog} onOpenChange={() => setShowRejectDialog(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Rechazar traslado?</AlertDialogTitle>
                        <AlertDialogDescription>
                            El traslado de <strong>{showRejectDialog?.studentName}</strong> será rechazado.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                        <Label>Razón del rechazo (opcional)</Label>
                        <Textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Explica por qué rechazas el traslado..."
                            rows={2}
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setRejectionReason('')}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRejectTransfer}
                            disabled={submitting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {submitting ? 'Procesando...' : 'Rechazar Traslado'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
