import { useState } from 'react';
import { storage } from '../data/storage';
import { Movimiento, Existencia, Medicamento, TipoMovimiento } from '../types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, ArrowUpCircle, ArrowDownCircle, XCircle, Calendar, User, Loader2, Barcode } from 'lucide-react';
import { toast } from 'sonner';

export function Movimientos() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  
  const [formData, setFormData] = useState({
    id_existencia: '',
    tipo_movimiento: 'salida' as TipoMovimiento, // Por defecto salida (venta/dispensación)
    cantidad: '',
    observaciones: '',
  });

  // --- CARGA DE DATOS ---
  const { data: movimientos = [], isLoading: loadingMovs } = useQuery({
    queryKey: ['movimientos'],
    queryFn: async () => {
      const res = await storage.getMovimientos();
      return Array.isArray(res) ? res : [];
    },
  });

  const { data: existencias = [] } = useQuery({
    queryKey: ['existencias'],
    queryFn: () => storage.getExistencias(),
  });

  const { data: medicamentos = [] } = useQuery({
    queryKey: ['medicamentos'],
    queryFn: () => storage.getMedicamentos(),
  });

  const { data: usuarioActual } = useQuery({
    queryKey: ['usuario-actual'],
    queryFn: () => storage.getCurrentUser(),
  });

  // --- MUTACIÓN ---
  const mutation = useMutation({
    mutationFn: (newData: any) => storage.registrarMovimiento(
      newData.id_existencia,
      newData.tipo_movimiento,
      newData.cantidad,
      newData.id_usuario,
      newData.observaciones
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      queryClient.invalidateQueries({ queryKey: ['existencias'] });
      queryClient.invalidateQueries({ queryKey: ['medicamentos'] });
      queryClient.invalidateQueries({ queryKey: ['inventario-completo'] });
      toast.success('Movimiento registrado correctamente');
      closeDialog();
    },
    onError: () => toast.error('Error al registrar en el servidor central'),
  });

  const getMedicamentoNombre = (idExistencia: number) => {
    const ex = existencias.find(e => e.id_existencia === idExistencia);
    if (!ex) return 'Cargando...';
    const med = medicamentos.find(m => m.id_medicamento === ex.id_medicamento);
    return med ? `${med.nombre} (${med.concentracion})` : 'No encontrado';
  };

  const filteredMovimientos = movimientos
    .filter(m => filterTipo === 'todos' || m.tipo_movimiento === filterTipo)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cant = parseInt(formData.cantidad);
    const exId = parseInt(formData.id_existencia);
    const exActual = existencias.find(e => e.id_existencia === exId);

    if (!exId || isNaN(cant)) {
      toast.error('Seleccione un lote y cantidad válida');
      return;
    }

    // --- NUEVA LÓGICA DE VALIDACIÓN DE STOCK CERO ---
    if (formData.tipo_movimiento !== 'entrada') {
      // 1. Bloqueo total si el stock es 0
      if (!exActual || exActual.cantidad_actual <= 0) {
        toast.error('No se puede realizar una salida: El stock actual es 0');
        return;
      }

      // 2. Bloqueo si la cantidad solicitada supera lo disponible
      if (exActual.cantidad_actual < cant) {
        toast.error(`Stock insuficiente. Disponible: ${exActual.cantidad_actual}`);
        return;
      }
    }

    mutation.mutate({
      id_existencia: exId,
      tipo_movimiento: formData.tipo_movimiento,
      cantidad: cant,
      id_usuario: usuarioActual?.id_usuario || 1,
      observaciones: formData.observaciones,
    });
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setFormData({ id_existencia: '', tipo_movimiento: 'salida', cantidad: '', observaciones: '' });
  };

  if (loadingMovs) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-gray-500 font-medium">Sincronizando transacciones...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Historial de Movimientos</h2>
          <p className="text-gray-600 mt-1">Auditoría de entradas y salidas de almacén</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-blue-600">
          <Plus className="w-4 h-4 mr-2" /> Nuevo Registro
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-1">
          <CardContent className="pt-6">
            <Label>Filtrar Operación</Label>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los registros</SelectItem>
                <SelectItem value="entrada">Entradas (+)</SelectItem>
                <SelectItem value="salida">Salidas (-)</SelectItem>
                <SelectItem value="caducado">Bajas / Caducados</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 bg-slate-50/50">
          <CardContent className="flex justify-around items-center h-full pt-6">
            <div className="text-center">
              <p className="text-[10px] uppercase font-bold text-emerald-600">Entradas</p>
              <p className="text-2xl font-bold">{movimientos.filter(m => m.tipo_movimiento === 'entrada').length}</p>
            </div>
            <div className="text-center border-x px-12">
              <p className="text-[10px] uppercase font-bold text-blue-600">Salidas</p>
              <p className="text-2xl font-bold">{movimientos.filter(m => m.tipo_movimiento === 'salida').length}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase font-bold text-red-600">Caducados</p>
              <p className="text-2xl font-bold">{movimientos.filter(m => m.tipo_movimiento === 'caducado').length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Fecha y Hora</TableHead>
                <TableHead>Insumo / Medicamento</TableHead>
                <TableHead>Operación</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Responsable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMovimientos.map((m) => (
                <TableRow key={m.id_movimiento}>
                  <TableCell className="text-xs font-mono text-slate-500">
                    <Calendar className="inline w-3 h-3 mr-1 text-slate-400" />
                    {new Date(m.fecha).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900">{getMedicamentoNombre(m.id_existencia)}</span>
                      <span className="text-[10px] text-slate-400 italic truncate max-w-[150px]">
                        {m.observaciones || 'Sin observaciones'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize bg-white shadow-sm">
                      {m.tipo_movimiento === 'entrada' ? <ArrowUpCircle className="w-3 h-3 mr-1 text-emerald-500" /> : 
                       m.tipo_movimiento === 'salida' ? <ArrowDownCircle className="w-3 h-3 mr-1 text-blue-500" /> :
                       <XCircle className="w-3 h-3 mr-1 text-red-500" />}
                      {m.tipo_movimiento}
                    </Badge>
                  </TableCell>
                  <TableCell className={`font-bold ${m.tipo_movimiento === 'entrada' ? 'text-emerald-600' : 'text-blue-600'}`}>
                    {m.tipo_movimiento === 'entrada' ? '+' : '-'}{m.cantidad}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    <User className="inline w-3 h-3 mr-1" />
                    {usuarioActual?.nombre_usuario || 'Cargando...'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader><DialogTitle>Nuevo Movimiento de Stock</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Operación</Label>
                <Select value={formData.tipo_movimiento} onValueChange={(v: TipoMovimiento) => setFormData({...formData, tipo_movimiento: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada (+)</SelectItem>
                    <SelectItem value="salida">Salida (-)</SelectItem>
                    <SelectItem value="caducado">Caducado/Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cantidad</Label>
                <Input type="number" min="1" value={formData.cantidad} onChange={e => setFormData({...formData, cantidad: e.target.value})} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Barcode className="w-4 h-4 text-blue-500" /> Seleccionar Lote / Existencia</Label>
              <Select onValueChange={(v) => setFormData({...formData, id_existencia: v})}>
                <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Busque por código o nombre..." /></SelectTrigger>
                <SelectContent>
                  {existencias.map(ex => (
                    <SelectItem key={ex.id_existencia} value={ex.id_existencia.toString()}>
                      {getMedicamentoNombre(ex.id_existencia)} - [{ex.codigo_barras}] (Disp: {ex.cantidad_actual})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notas / Observaciones</Label>
              <Textarea 
                placeholder="Motivo del movimiento..." 
                value={formData.observaciones} 
                onChange={e => setFormData({...formData, observaciones: e.target.value})} 
              />
            </div>

            <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-4 rounded-b-lg mt-4">
              <Button type="submit" className="w-full bg-blue-600" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="animate-spin mr-2" /> : null}
                Confirmar Registro
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}