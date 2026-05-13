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
  DialogDescription,
} from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import {
  Plus,
  Edit,
  Trash2,
  ArrowDownCircle,
  Box,
  Stethoscope,
  Loader2,
  Package
} from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIAS_INSUMOS = [
  "Material de curación",
  "Equipo médico menor",
  "Equipo médico-quirúrgico",
  "Material de protección personal",
  "Insumos de higiene",
  "Varios"
];

export function Insumos() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('insumos');

  const [isInsumoDialogOpen, setIsInsumoDialogOpen] = useState(false);
  const [isSalidaDialogOpen, setIsSalidaDialogOpen] = useState(false);
  const [isEquipoDialogOpen, setIsEquipoDialogOpen] = useState(false);
  const [editingEquipo, setEditingEquipo] = useState<EquipoMedico | null>(null);

  // --- FORMULARIOS ---
  const [insumoFormData, setInsumoFormData] = useState({
    nombre_insumo: '',
    tipo_insumo: '', 
    cantidad_unidades: '', 
    cantidad_cajas: '',    
    unidades_por_caja: '', 
    folio: '',
    observaciones: ''
  });

  const [salidaFormData, setSalidaFormData] = useState({
    id_insumo: '',
    cantidad: '',
    observacion: ''
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
    mutationFn: (data: any) => {
      const cajas = parseInt(data.cantidad_cajas || '0');
      const uPorCaja = parseInt(data.unidades_por_caja || '0');
      const sueltas = parseInt(data.cantidad_unidades || '0');
      const total = (cajas * uPorCaja) + sueltas;
      const desgloseStr = cajas > 0 ? `[DESGLOSE:${cajas}|${uPorCaja}|${sueltas}]` : '';

      return storage.registrarEntradaDonacion(
        data.nombre_insumo,
        total,
        parseInt(data.folio),
        `${desgloseStr} ${data.observaciones}`,
        data.tipo_insumo
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      toast.success('Donación registrada correctamente');
      setIsInsumoDialogOpen(false);
    },
    onError: () => toast.error('Error al registrar la donación')
  });

  const mutationSalida = useMutation({
    mutationFn: (data: any) => storage.registrarSalidaInsumo(
      parseInt(data.id_insumo),
      parseInt(data.cantidad),
      data.observacion
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      queryClient.invalidateQueries({ queryKey: ['salidas-insumos'] });
      toast.success('Salida registrada correctamente');
      setIsSalidaDialogOpen(false);
      setSalidaFormData({ id_insumo: '', cantidad: '', observacion: '' });
    },
    onError: () => toast.error('Error al registrar la salida. Verifique stock.')
  });

  const mutationEquipo = useMutation({
    mutationFn: (data: any) => editingEquipo ? storage.updateEquipoMedico(data) : storage.saveEquipoMedico(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipo-medico'] });
      toast.success('Equipo actualizado');
      setIsEquipoDialogOpen(false);
      setEditingEquipo(null);
    }
  });

  const renderStockConDesglose = (insumo: any) => {
    const obs = insumo.ultima_observacion || '';
    const match = obs.match(/\[DESGLOSE:(\d+)\|(\d+)\|(\d+)\]/);

    if (match) {
      const [_, cajas, uPorCaja, sueltas] = match;
      if (parseInt(cajas) === 0) return <span className="font-black text-blue-600 text-lg">{insumo.cantidad_actual}</span>;

      return (
        <div className="flex flex-col">
          <span className="font-black text-blue-600 text-lg">{insumo.cantidad_actual}</span>
          <span className="text-[11px] text-slate-500 font-medium leading-tight">
            ({cajas} {parseInt(cajas) === 1 ? 'caja' : 'cajas'} de {uPorCaja} y {sueltas} sueltas)
          </span>
        </div>
      );
    }
    return <span className="font-black text-blue-600 text-lg">{insumo.cantidad_actual}</span>;
  };

  if (loadingIns) return <div className="flex justify-center p-20"><Loader2 className="animate-spin w-10 h-10 text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Suministros y Equipo Médico</h2>
        <p className="text-slate-500">Gestión de inventario por folio y categoría</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2 bg-slate-100">
          <TabsTrigger value="insumos" className="gap-2"><Box className="w-4 h-4" /> Insumos</TabsTrigger>
          <TabsTrigger value="equipo" className="gap-2"><Stethoscope className="w-4 h-4" /> Equipo Médico</TabsTrigger>
        </TabsList>

        <TabsContent value="insumos" className="space-y-6 pt-4">
          <div className="flex gap-3">
            <Button onClick={() => setIsInsumoDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="w-4 h-4 mr-2" /> Nueva Donación
            </Button>
            <Button onClick={() => setIsSalidaDialogOpen(true)} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
              <ArrowDownCircle className="w-4 h-4 mr-2" /> Registrar Salida
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="pl-6">Nombre del Insumo</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Stock Actual</TableHead>
                    <TableHead className="text-right pr-6">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {insumos.map((i) => (
                    <TableRow key={i.id_insumo}>
                      <TableCell className="font-bold text-slate-700 pl-6">{i.nombre_insumo}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal bg-slate-50 text-slate-600">
                          {i.tipo_insumo || 'Sin categoría'}
                        </Badge>
                      </TableCell>
                      <TableCell>{renderStockConDesglose(i)}</TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="icon" className="text-red-400" onClick={() => storage.deleteInsumo(i.id_insumo).then(() => queryClient.invalidateQueries())}>
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
          <Button onClick={() => { setEditingEquipo(null); setEquipoFormData({nombre_equipo: '', descripcion: '', estado: 'Disponible'}); setIsEquipoDialogOpen(true); }} className="bg-[#4796B7] text-white">
            <Plus className="w-4 h-4 mr-2" /> Registrar Equipo
          </Button>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="pl-6">ID</TableHead>
                    <TableHead>Nombre / Descripción</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right pr-6">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipos.map((eq) => (
                    <TableRow key={eq.id_equipo}>
                      <TableCell className="pl-6 text-slate-400 font-mono">#{eq.id_equipo}</TableCell>
                      <TableCell>
                        <div className="font-bold text-slate-800">{eq.nombre_equipo}</div>
                        <div className="text-xs text-slate-500 line-clamp-1">{eq.descripcion}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={eq.estado === 'Disponible' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                          {eq.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingEquipo(eq); setEquipoFormData({nombre_equipo: eq.nombre_equipo, descripcion: eq.descripcion, estado: eq.estado}); setIsEquipoDialogOpen(true); }}><Edit className="w-4 h-4 text-slate-400" /></Button>
                        <Button variant="ghost" size="icon" className="text-red-400" onClick={() => storage.deleteEquipoMedico(eq.id_equipo).then(() => queryClient.invalidateQueries())}><Trash2 className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIÁLOGO ENTRADA (DONACIÓN) */}
      <Dialog open={isInsumoDialogOpen} onOpenChange={setIsInsumoDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-emerald-600">Nueva Donación de Insumo</DialogTitle>
            <DialogDescription>Rellene los datos para registrar la entrada de material al almacén.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); mutationEntrada.mutate(insumoFormData); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Folio de Referencia</Label>
                <Select value={insumoFormData.folio} onValueChange={(v) => setInsumoFormData({...insumoFormData, folio: v})}>
                  <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {foliosActivos.map((f: any) => (
                      <SelectItem key={f.id_folio} value={f.id_folio.toString()}>Fol-2026-{f.id_folio}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Categoría</Label>
                <Select value={insumoFormData.tipo_insumo} onValueChange={(v) => setInsumoFormData({...insumoFormData, tipo_insumo: v})}>
                  <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Categoría..." /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS_INSUMOS.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">Nombre del Insumo</Label>
              <Input placeholder="Ej. Gasa estéril" value={insumoFormData.nombre_insumo} onChange={(e) => setInsumoFormData({ ...insumoFormData, nombre_insumo: e.target.value })} required />
            </div>

            <div className="p-4 border border-emerald-100 rounded-xl bg-emerald-50/30 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-slate-400">Cajas</Label>
                  <Input type="number" value={insumoFormData.cantidad_cajas} onChange={(e) => setInsumoFormData({...insumoFormData, cantidad_cajas: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-slate-400">U. por Caja</Label>
                  <Input type="number" value={insumoFormData.unidades_por_caja} onChange={(e) => setInsumoFormData({...insumoFormData, unidades_por_caja: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-slate-400">Unidades Sueltas</Label>
                <Input type="number" value={insumoFormData.cantidad_unidades} onChange={(e) => setInsumoFormData({...insumoFormData, cantidad_unidades: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">Observaciones</Label>
              <Textarea placeholder="Detalles de la donación..." className="h-20" value={insumoFormData.observaciones} onChange={(e) => setInsumoFormData({ ...insumoFormData, observaciones: e.target.value })} />
            </div>

            <DialogFooter>
              <Button type="submit" className="w-full bg-emerald-600 text-white" disabled={mutationEntrada.isPending}>
                {mutationEntrada.isPending ? <Loader2 className="animate-spin" /> : "Confirmar Entrada"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO SALIDA (SIN FOLIO, SEGÚN DB) */}
      <Dialog open={isSalidaDialogOpen} onOpenChange={setIsSalidaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Registrar Salida de Insumo</DialogTitle>
            <DialogDescription>Seleccione el insumo y la cantidad a egresar.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); mutationSalida.mutate(salidaFormData); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Seleccionar Insumo</Label>
              <Select value={salidaFormData.id_insumo} onValueChange={(v) => setSalidaFormData({...salidaFormData, id_insumo: v})}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="Insumo..." /></SelectTrigger>
                <SelectContent>
                  {insumos.map(i => <SelectItem key={i.id_insumo} value={i.id_insumo.toString()}>{i.nombre_insumo} ({i.cantidad_actual} disp.)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cantidad a Egresar (Unidades)</Label>
              <Input type="number" min="1" value={salidaFormData.cantidad} onChange={(e) => setSalidaFormData({ ...salidaFormData, cantidad: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Nota / Observación</Label>
              <Input placeholder="Ej. Solicitado por enfermería" value={salidaFormData.observacion} onChange={(e) => setSalidaFormData({ ...salidaFormData, observacion: e.target.value })} />
            </div>
            <DialogFooter>
                <Button type="submit" className="w-full bg-red-600 text-white" disabled={mutationSalida.isPending}>
                    {mutationSalida.isPending ? <Loader2 className="animate-spin" /> : "Confirmar Egreso"}
                </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO EQUIPO */}
      <Dialog open={isEquipoDialogOpen} onOpenChange={setIsEquipoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEquipo ? 'Editar' : 'Nuevo'} Equipo Médico</DialogTitle>
            <DialogDescription>Actualice la información o el estado del equipo médico.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); mutationEquipo.mutate({ ...equipoFormData, id_equipo: editingEquipo?.id_equipo }); }} className="space-y-4">
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
                </SelectContent>
              </Select>
            </div>
            <DialogFooter><Button type="submit" className="bg-[#4796B7] text-white">Guardar Equipo</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}