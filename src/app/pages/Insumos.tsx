import { useState } from 'react';
import { storage } from '../data/storage';
import { Insumo, SalidaInsumo, EquipoMedico } from '../types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
import { Plus, Edit, Trash2, ArrowDownCircle, Box, Stethoscope, Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function Insumos() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('insumos');
  
  const [isInsumoDialogOpen, setIsInsumoDialogOpen] = useState(false);
  const [isSalidaDialogOpen, setIsSalidaDialogOpen] = useState(false);
  const [isEquipoDialogOpen, setIsEquipoDialogOpen] = useState(false);
  const [editingInsumo, setEditingInsumo] = useState<Insumo | null>(null);
  const [editingEquipo, setEditingEquipo] = useState<EquipoMedico | null>(null);

  // Formulario de insumos simplificado (sin tipo)
  const [insumoFormData, setInsumoFormData] = useState({ nombre_insumo: '', cantidad_actual: '' });
  const [salidaFormData, setSalidaFormData] = useState({ id_insumo: '', cantidad: '', observacion: '' });
  const [equipoFormData, setEquipoFormData] = useState({ nombre_equipo: '', descripcion: '', estado: 'Disponible' });

  // --- CARGA DE DATOS ---
  const { data: insumos = [], isLoading: loadingIns } = useQuery({
    queryKey: ['insumos'],
    queryFn: () => storage.getInsumos(),
  });

  const { data: salidas = [] } = useQuery({
    queryKey: ['salidas-insumos'],
    queryFn: () => storage.getSalidasInsumos(),
  });

  const { data: equipos = [] } = useQuery({
    queryKey: ['equipo-medico'],
    queryFn: () => storage.getEquipoMedico(),
  });

  // --- MUTACIONES ---
  const mutationInsumo = useMutation({
    mutationFn: (data: any) => editingInsumo ? storage.updateInsumo(data) : storage.saveInsumo(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      toast.success('Insumo guardado');
      closeInsumoDialog();
    }
  });

  const deleteInsumoMutation = useMutation({
    mutationFn: (id: number) => storage.deleteInsumo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      toast.success('Insumo eliminado');
    }
  });

  const mutationSalida = useMutation({
    mutationFn: (data: any) => storage.registrarSalidaInsumo(parseInt(data.id_insumo), parseInt(data.cantidad), data.observacion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      queryClient.invalidateQueries({ queryKey: ['salidas-insumos'] });
      toast.success('Salida registrada');
      closeSalidaDialog();
    }
  });

  const mutationEquipo = useMutation({
    mutationFn: (data: any) => editingEquipo ? storage.updateEquipoMedico(data) : storage.saveEquipoMedico(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipo-medico'] });
      toast.success('Equipo actualizado');
      closeEquipoDialog();
    }
  });

  const deleteEquipoMutation = useMutation({
    mutationFn: (id: number) => storage.deleteEquipoMedico(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipo-medico'] });
      toast.success('Equipo eliminado');
    }
  });

  // Handlers
  const openInsumoDialog = (insumo?: Insumo) => {
    if (insumo) {
      setEditingInsumo(insumo);
      setInsumoFormData({ nombre_insumo: insumo.nombre_insumo, cantidad_actual: insumo.cantidad_actual.toString() });
    } else {
      setEditingInsumo(null);
      setInsumoFormData({ nombre_insumo: '', cantidad_actual: '' });
    }
    setIsInsumoDialogOpen(true);
  };

  const closeInsumoDialog = () => { setIsInsumoDialogOpen(false); setEditingInsumo(null); };
  const openSalidaDialog = () => { setSalidaFormData({ id_insumo: '', cantidad: '', observacion: '' }); setIsSalidaDialogOpen(true); };
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
        <p className="text-slate-500">Gestión de inventario simplificada</p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="insumos" className="gap-2"><Box className="w-4 h-4" /> Insumos</TabsTrigger>
          <TabsTrigger value="equipo" className="gap-2"><Stethoscope className="w-4 h-4" /> Equipo Médico</TabsTrigger>
        </TabsList>
        
        <TabsContent value="insumos" className="space-y-6 pt-4">
          <div className="flex gap-3">
            <Button onClick={() => openInsumoDialog()} className="bg-blue-600"><Plus className="w-4 h-4 mr-2" /> Nuevo Insumo</Button>
            <Button onClick={openSalidaDialog} variant="outline"><ArrowDownCircle className="w-4 h-4 mr-2" /> Registrar Salida</Button>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
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
                        <Button variant="ghost" size="icon" onClick={() => openInsumoDialog(i)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-red-400" onClick={() => deleteInsumoMutation.mutate(i.id_insumo)}><Trash2 className="w-4 h-4" /></Button>
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
                  {equipos.length > 0 ? (
                    equipos.map((eq) => (
                      <TableRow key={eq.id_equipo}>
                        <TableCell className="font-medium pl-6">#{eq.id_equipo}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Stethoscope className="w-4 h-4 text-blue-600" />
                            <span className="font-bold text-slate-900">{eq.nombre_equipo}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-500 line-clamp-1 max-w-[300px]">
                            {eq.descripcion}
                          </span>
                        </TableCell>
                        <TableCell>
                          {getEstadoBadge(eq.estado)}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button variant="ghost" size="icon" onClick={() => openEquipoDialog(eq)}>
                            <Edit className="w-4 h-4 text-slate-400" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteEquipoMutation.mutate(eq.id_equipo)}>
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                        No hay equipos registrados
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIÁLOGO INSUMO */}
      <Dialog open={isInsumoDialogOpen} onOpenChange={setIsInsumoDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingInsumo ? 'Editar' : 'Nuevo'} Insumo</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); mutationInsumo.mutate({ ...insumoFormData, id_insumo: editingInsumo?.id_insumo }); }} className="space-y-4 pt-2">
            <div><Label>Nombre del Insumo</Label><Input value={insumoFormData.nombre_insumo} onChange={(e) => setInsumoFormData({...insumoFormData, nombre_insumo: e.target.value})} required /></div>
            <div><Label>Cantidad</Label><Input type="number" value={insumoFormData.cantidad_actual} onChange={(e) => setInsumoFormData({...insumoFormData, cantidad_actual: e.target.value})} required /></div>
            <DialogFooter><Button type="submit" disabled={mutationInsumo.isPending}>Guardar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO EQUIPO MÉDICO */}
      <Dialog open={isEquipoDialogOpen} onOpenChange={setIsEquipoDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingEquipo ? 'Editar' : 'Nuevo'} Equipo Médico</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); mutationEquipo.mutate({ ...equipoFormData, id_equipo: editingEquipo?.id_equipo }); }} className="space-y-4 pt-2">
            <div><Label>Nombre del Equipo</Label><Input value={equipoFormData.nombre_equipo} onChange={(e) => setEquipoFormData({...equipoFormData, nombre_equipo: e.target.value})} required /></div>
            <div><Label>Descripción</Label><Textarea value={equipoFormData.descripcion} onChange={(e) => setEquipoFormData({...equipoFormData, descripcion: e.target.value})} required /></div>
            <div>
              <Label>Estado Actual</Label>
              <Select value={equipoFormData.estado} onValueChange={(val) => setEquipoFormData({...equipoFormData, estado: val})}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Disponible">Disponible</SelectItem>
                  <SelectItem value="En uso">En uso</SelectItem>
                  <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                  <SelectItem value="Dañado">Dañado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter><Button type="submit" disabled={mutationEquipo.isPending}>Guardar Equipo</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO EGRESO */}
      <Dialog open={isSalidaDialogOpen} onOpenChange={setIsSalidaDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Salida de Insumo</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); mutationSalida.mutate(salidaFormData); }} className="space-y-4 pt-2">
            <div>
              <Label>Insumo</Label>
              <select className="w-full border rounded-md p-2 bg-white" value={salidaFormData.id_insumo} onChange={(e) => setSalidaFormData({...salidaFormData, id_insumo: e.target.value})} required>
                <option value="">Seleccione...</option>
                {insumos.map(i => <option key={i.id_insumo} value={i.id_insumo}>{i.nombre_insumo} ({i.cantidad_actual} disp.)</option>)}
              </select>
            </div>
            <div><Label>Cantidad</Label><Input type="number" value={salidaFormData.cantidad} onChange={(e) => setSalidaFormData({...salidaFormData, cantidad: e.target.value})} required /></div>
            <div><Label>Observación / Motivo</Label><Textarea value={salidaFormData.observacion} onChange={(e) => setSalidaFormData({...salidaFormData, observacion: e.target.value})} /></div>
            <DialogFooter><Button type="submit" disabled={mutationSalida.isPending} className="bg-red-600 hover:bg-red-700 text-white">Confirmar Egreso</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}