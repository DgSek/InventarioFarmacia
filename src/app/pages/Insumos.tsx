import { useState } from 'react';
import { storage } from '../data/storage';
import { Insumo, EquipoMedico } from '../types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { 
  Plus, 
  Edit, 
  Trash2, 
  ArrowDownCircle, 
  ArrowUpCircle,
  Box, 
  Stethoscope, 
  Loader2, 
  ClipboardList 
} from 'lucide-react';
import { toast } from 'sonner';

export function Insumos() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('insumos');

  const [isInsumoDialogOpen, setIsInsumoDialogOpen] = useState(false);
  const [isSalidaDialogOpen, setIsSalidaDialogOpen] = useState(false);
  const [isEquipoDialogOpen, setIsEquipoDialogOpen] = useState(false);
  const [editingInsumo, setEditingInsumo] = useState<Insumo | null>(null);
  const [editingEquipo, setEditingEquipo] = useState<EquipoMedico | null>(null);

  // --- FORMULARIOS ---
  const [insumoFormData, setInsumoFormData] = useState({ 
    nombre_insumo: '', 
    cantidad: '', 
    folio: '', 
    observaciones: '' 
  });

  const [salidaFormData, setSalidaFormData] = useState({ 
    id_insumo: '', 
    cantidad: '', 
    observacion: '',
    folio: '' 
  });

  const [equipoFormData, setEquipoFormData] = useState({ 
    nombre_equipo: '', 
    descripcion: '', 
    estado: 'Disponible' 
  });

  // --- CARGA DE DATOS ---
  const { data: insumos = [], isLoading: loadingIns } = useQuery({
    queryKey: ['insumos'],
    queryFn: () => storage.getInsumos(),
  });

  const { data: foliosActivos = [] } = useQuery({
    queryKey: ['folios-activos'],
    queryFn: () => storage.getFoliosActivos(),
  });

  const { data: equipos = [] } = useQuery({
    queryKey: ['equipo-medico'],
    queryFn: () => storage.getEquipoMedico(),
  });

  // --- MUTACIONES ---
  const mutationEntrada = useMutation({
    mutationFn: (data: any) => storage.registrarEntradaDonacion(
      data.nombre_insumo,
      parseInt(data.cantidad),
      parseInt(data.folio), // Aquí ya llega solo el número gracias al Select
      data.observaciones
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      toast.success('Donación registrada correctamente');
      closeInsumoDialog();
    },
    onError: () => toast.error('Error al registrar la donación')
  });

  const mutationSalida = useMutation({
    mutationFn: (data: any) => storage.registrarSalidaInsumo(
      parseInt(data.id_insumo), 
      parseInt(data.cantidad), 
      data.observacion,
      data.folio // Aquí ya llega solo el número
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      queryClient.invalidateQueries({ queryKey: ['salidas-insumos'] });
      toast.success('Salida registrada correctamente');
      closeSalidaDialog();
    },
    onError: () => toast.error('Error al registrar la salida')
  });

  // (Otras mutaciones omitidas por brevedad, se mantienen igual)
  const mutationEquipo = useMutation({
    mutationFn: (data: any) => editingEquipo ? storage.updateEquipoMedico(data) : storage.saveEquipoMedico(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipo-medico'] });
      toast.success('Equipo actualizado');
      closeEquipoDialog();
    }
  });

  const deleteInsumoMutation = useMutation({
    mutationFn: (id: number) => storage.deleteInsumo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      toast.success('Insumo eliminado');
    }
  });

  const deleteEquipoMutation = useMutation({
    mutationFn: (id: number) => storage.deleteEquipoMedico(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipo-medico'] });
      toast.success('Equipo eliminado');
    }
  });

  // --- HANDLERS ---
  const openInsumoDialog = () => {
    setInsumoFormData({ nombre_insumo: '', cantidad: '', folio: '', observaciones: '' });
    setIsInsumoDialogOpen(true);
  };
  const closeInsumoDialog = () => setIsInsumoDialogOpen(false);
  const openSalidaDialog = () => { 
    setSalidaFormData({ id_insumo: '', cantidad: '', observacion: '', folio: '' }); 
    setIsSalidaDialogOpen(true); 
  };
  const closeSalidaDialog = () => setIsSalidaDialogOpen(false);
  const openEquipoDialog = (equipo?: EquipoMedico) => {
    if (equipo) {
      setEditingEquipo(equipo);
      setEquipoFormData({ nombre_equipo: equipo.nombre_equipo, descripcion: equipo.descripcion, estado: equipo.estado });
    } else {
      setEditingEquipo(null);
      setEquipoFormData({ nombre_equipo: '', descripcion: '', estado: 'Disponible' });
    }
    setIsEquipoDialogOpen(true);
  };
  const closeEquipoDialog = () => { setIsEquipoDialogOpen(false); setEditingEquipo(null); };

  const getEstadoBadge = (estado: string) => {
    const variants = { 'Disponible': 'default', 'En uso': 'secondary', 'Mantenimiento': 'outline', 'Dañado': 'destructive', 'Operativo': 'default' } as const;
    return <Badge variant={variants[estado as keyof typeof variants] || 'default'}>{estado}</Badge>;
  };

  if (loadingIns) return <div className="flex justify-center p-20"><Loader2 className="animate-spin w-10 h-10 text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Suministros y Equipo Médico</h2>
        <p className="text-slate-500">Gestión de inventario y trazabilidad por folio</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2" style={{ backgroundColor: 'rgba(71, 150, 183, 0.15)' }}>
          <TabsTrigger value="insumos" className="gap-2" style={{ backgroundColor: activeTab === 'insumos' ? 'rgb(255, 255, 255)' : 'transparent', color: '#313131' }}>
            <Box className="w-4 h-4" /> Insumos
          </TabsTrigger>
          <TabsTrigger value="equipo" className="gap-2" style={{ backgroundColor: activeTab === 'equipo' ? 'rgb(255, 255, 255)' : 'transparent', color: '#313131' }}>
            <Stethoscope className="w-4 h-4" /> Equipo Médico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insumos" className="space-y-6 pt-4">
          <div className="flex gap-3">
            <Button onClick={openInsumoDialog} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" /> Nueva Donación
            </Button>
            <Button onClick={openSalidaDialog} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
              <ArrowDownCircle className="w-4 h-4 mr-2" /> Registrar Salida
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-[#4796B7]/10 border-b transition-colors">
                    <TableHead className="pl-6">Nombre del Insumo</TableHead>
                    <TableHead>Stock Actual</TableHead>
                    <TableHead className="text-right pr-6">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {insumos.map((i) => (
                    <TableRow key={i.id_insumo}>
                      <TableCell className="font-bold pl-6">{i.nombre_insumo}</TableCell>
                      <TableCell className="font-black text-blue-600">{i.cantidad_actual}</TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="icon" className="text-red-400" onClick={() => deleteInsumoMutation.mutate(i.id_insumo)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipo" className="space-y-6 pt-4">
          <Button onClick={() => openEquipoDialog()}><Plus className="w-4 h-4 mr-2" /> Registrar Equipo</Button>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">ID</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right pr-6">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipos.length > 0 ? equipos.map((eq) => (
                    <TableRow key={eq.id_equipo}>
                      <TableCell className="font-medium pl-6">#{eq.id_equipo}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-blue-600" />
                          <span className="font-bold text-slate-900">{eq.nombre_equipo}</span>
                        </div>
                      </TableCell>
                      <TableCell><span className="text-sm text-slate-500 line-clamp-1 max-w-[300px]">{eq.descripcion}</span></TableCell>
                      <TableCell>{getEstadoBadge(eq.estado)}</TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="icon" onClick={() => openEquipoDialog(eq)}><Edit className="w-4 h-4 text-slate-400" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteEquipoMutation.mutate(eq.id_equipo)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">No hay equipos registrados</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIÁLOGO ENTRADA (DONACIÓN) - CORREGIDO */}
      <Dialog open={isInsumoDialogOpen} onOpenChange={setIsInsumoDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-emerald-500" />
              Nueva Donación de Insumo
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); mutationEntrada.mutate(insumoFormData); }} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><ClipboardList className="w-4 h-4 text-[#4796B7]" /> Folio de Donación</Label>
              <Select value={insumoFormData.folio} onValueChange={(v) => setInsumoFormData({...insumoFormData, folio: v})}>
                <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Seleccione folio..." /></SelectTrigger>
                <SelectContent>
                  {foliosActivos.map((f: any) => (
                    // value es solo el ID (para la base de datos)
                    // El texto dentro del Item es el diseño decorativo
                    <SelectItem key={f.id_folio} value={f.id_folio.toString()}>
                      Fol-2026-{f.id_folio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nombre del Insumo</Label>
              <Input 
                placeholder="Ej. Gasas estériles"
                value={insumoFormData.nombre_insumo} 
                onChange={(e) => setInsumoFormData({ ...insumoFormData, nombre_insumo: e.target.value })} 
                required 
              />
            </div>
            <div>
              <Label>Cantidad Recibida</Label>
              <Input 
                type="number" 
                value={insumoFormData.cantidad} 
                onChange={(e) => setInsumoFormData({ ...insumoFormData, cantidad: e.target.value })} 
                required 
              />
            </div>
            <div>
              <Label>Observaciones</Label>
              <Textarea 
                placeholder="Detalles de la procedencia..." 
                value={insumoFormData.observaciones} 
                onChange={(e) => setInsumoFormData({ ...insumoFormData, observaciones: e.target.value })} 
              />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={mutationEntrada.isPending || !insumoFormData.folio}>
                {mutationEntrada.isPending ? <Loader2 className="animate-spin mr-2" /> : "Registrar Entrada"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO EGRESO (SALIDA) - CORREGIDO */}
      <Dialog open={isSalidaDialogOpen} onOpenChange={setIsSalidaDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ArrowDownCircle className="w-5 h-5 text-red-500" /> Registrar Salida</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); mutationSalida.mutate(salidaFormData); }} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><ClipboardList className="w-4 h-4 text-[#4796B7]" /> Folio de Referencia</Label>
              <Select value={salidaFormData.folio} onValueChange={(v) => setSalidaFormData({...salidaFormData, folio: v})}>
                <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Seleccione folio..." /></SelectTrigger>
                <SelectContent>
                  {foliosActivos.map((f: any) => (
                    // Igual que arriba: value solo número
                    <SelectItem key={f.id_folio} value={f.id_folio.toString()}>
                      Fol-2026-{f.id_folio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Insumo</Label>
              <Select value={salidaFormData.id_insumo} onValueChange={(v) => setSalidaFormData({...salidaFormData, id_insumo: v})}>
                <SelectTrigger><SelectValue placeholder="Seleccione insumo..." /></SelectTrigger>
                <SelectContent>
                  {insumos.map(i => (
                    <SelectItem key={i.id_insumo} value={i.id_insumo.toString()}>{i.nombre_insumo} ({i.cantidad_actual} disp.)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input type="number" min="1" value={salidaFormData.cantidad} onChange={(e) => setSalidaFormData({ ...salidaFormData, cantidad: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Observación</Label>
              <Textarea placeholder="Motivo de la salida..." value={salidaFormData.observacion} onChange={(e) => setSalidaFormData({ ...salidaFormData, observacion: e.target.value })} />
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit" disabled={mutationSalida.isPending || !salidaFormData.folio} className="w-full bg-red-600 hover:bg-red-700">
                {mutationSalida.isPending ? <Loader2 className="animate-spin mr-2" /> : "Confirmar Egreso"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO EQUIPO MÉDICO */}
      <Dialog open={isEquipoDialogOpen} onOpenChange={setIsEquipoDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingEquipo ? 'Editar' : 'Nuevo'} Equipo</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); mutationEquipo.mutate({ ...equipoFormData, id_equipo: editingEquipo?.id_equipo }); }} className="space-y-4 pt-2">
            <div><Label>Nombre</Label><Input value={equipoFormData.nombre_equipo} onChange={(e) => setEquipoFormData({ ...equipoFormData, nombre_equipo: e.target.value })} required /></div>
            <div><Label>Descripción</Label><Textarea value={equipoFormData.descripcion} onChange={(e) => setEquipoFormData({ ...equipoFormData, descripcion: e.target.value })} required /></div>
            <div>
              <Label>Estado</Label>
              <Select value={equipoFormData.estado} onValueChange={(val) => setEquipoFormData({ ...equipoFormData, estado: val })}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Disponible">Disponible</SelectItem>
                  <SelectItem value="En uso">En uso</SelectItem>
                  <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                  <SelectItem value="Dañado">Dañado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter><Button type="submit" disabled={mutationEquipo.isPending}>Guardar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}