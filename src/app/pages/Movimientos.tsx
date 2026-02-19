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
import { Plus, ArrowUpCircle, ArrowDownCircle, XCircle, Calendar, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function Movimientos() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  
  const [formData, setFormData] = useState({
    id_existencia: '',
    tipo_movimiento: 'entrada' as TipoMovimiento,
    cantidad: '',
    observaciones: '',
  });

  // --- CARGA DE DATOS ASÍNCRONA ---
  const { data: movimientos = [], isLoading: loadingMovs } = useQuery({
    queryKey: ['movimientos'],
    queryFn: () => storage.getMovimientos(),
  });

  const { data: existencias = [], isLoading: loadingEx } = useQuery({
    queryKey: ['existencias'],
    queryFn: () => storage.getExistencias(),
  });

  const { data: medicamentos = [], isLoading: loadingMeds } = useQuery({
    queryKey: ['medicamentos'],
    queryFn: () => storage.getMedicamentos(),
  });

  const { data: usuarioActual } = useQuery({
    queryKey: ['usuario-actual'],
    queryFn: () => storage.getCurrentUser(),
  });

  // --- MUTACIÓN PARA REGISTRAR MOVIMIENTO ---
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
      queryClient.invalidateQueries({ queryKey: ['inventario'] });
      toast.success('Movimiento registrado y stock actualizado');
      closeDialog();
    },
    onError: () => toast.error('Error al conectar con el servidor de la farmacia'),
  });

  const getExistenciaInfo = (id: number) => existencias.find(e => e.id_existencia === id);

  const getMedicamentoNombre = (idExistencia: number) => {
    const existencia = getExistenciaInfo(idExistencia);
    if (!existencia) return 'Desconocido';
    const med = medicamentos.find(m => m.id_medicamento === existencia.id_medicamento);
    return med?.nombre || 'Desconocido';
  };

  const filteredMovimientos = movimientos
    .filter(m => filterTipo === 'todos' || m.tipo_movimiento === filterTipo)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cantidad = parseInt(formData.cantidad);
    const existencia = getExistenciaInfo(parseInt(formData.id_existencia));

    if (!existencia || isNaN(cantidad)) {
      toast.error('Datos de movimiento inválidos');
      return;
    }

    // Validar stock insuficiente para salidas
    if (formData.tipo_movimiento !== 'entrada' && existencia.cantidad_actual < cantidad) {
      toast.error(`Stock insuficiente. Disponible: ${existencia.cantidad_actual}`);
      return;
    }

    mutation.mutate({
      id_existencia: existencia.id_existencia,
      tipo_movimiento: formData.tipo_movimiento,
      cantidad,
      id_usuario: usuarioActual?.id_usuario || 1, // Usar ID del usuario actual
      observaciones: formData.observaciones,
    });
  };

  const openDialog = () => {
    setFormData({ id_existencia: '', tipo_movimiento: 'entrada', cantidad: '', observaciones: '' });
    setIsDialogOpen(true);
  };

  const closeDialog = () => setIsDialogOpen(false);

  const getTipoBadge = (tipo: TipoMovimiento) => {
    const icons = {
      entrada: <ArrowUpCircle className="w-4 h-4 text-emerald-600" />,
      salida: <ArrowDownCircle className="w-4 h-4 text-blue-600" />,
      caducado: <XCircle className="w-4 h-4 text-red-600" />,
    };
    return (
      <Badge variant="outline" className="flex items-center gap-1 w-fit bg-slate-50">
        {icons[tipo]}
        <span className="capitalize">{tipo}</span>
      </Badge>
    );
  };

  if (loadingMovs || loadingEx || loadingMeds) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-gray-500">Obteniendo historial de movimientos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Registro de Movimientos</h2>
          <p className="text-gray-600 mt-1">Historial transaccional en tiempo real</p>
        </div>
        <Button onClick={openDialog} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo Movimiento
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Filtrar Tipo</Label>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="entrada">Entradas</SelectItem>
                  <SelectItem value="salida">Salidas</SelectItem>
                  <SelectItem value="caducado">Caducados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3 flex justify-around items-center bg-slate-50 rounded-lg p-2 border">
               <div className="text-center">
                 <p className="text-xs text-emerald-600 font-bold">Entradas</p>
                 <p className="text-xl font-bold text-slate-700">{movimientos.filter(m => m.tipo_movimiento === 'entrada').length}</p>
               </div>
               <div className="text-center border-x px-8">
                 <p className="text-xs text-blue-600 font-bold">Salidas</p>
                 <p className="text-xl font-bold text-slate-700">{movimientos.filter(m => m.tipo_movimiento === 'salida').length}</p>
               </div>
               <div className="text-center">
                 <p className="text-xs text-red-600 font-bold">Caducados</p>
                 <p className="text-xl font-bold text-slate-700">{movimientos.filter(m => m.tipo_movimiento === 'caducado').length}</p>
               </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Historial Reciente</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Medicamento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Observaciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMovimientos.map((m) => (
                <TableRow key={m.id_movimiento}>
                  <TableCell className="text-xs text-slate-500">
                    <Calendar className="inline w-3 h-3 mr-1"/>
                    {new Date(m.fecha).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-medium">{getMedicamentoNombre(m.id_existencia)}</TableCell>
                  <TableCell>{getTipoBadge(m.tipo_movimiento)}</TableCell>
                  <TableCell className={`font-bold ${m.tipo_movimiento === 'entrada' ? 'text-emerald-600' : 'text-blue-600'}`}>
                    {m.tipo_movimiento === 'entrada' ? '+' : '-'}{m.cantidad}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600"><User className="inline w-3 h-3 mr-1"/>{usuarioActual?.nombre_usuario || 'Sistema'}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs italic text-slate-400">{m.observaciones || 'Sin notas'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo Movimiento de Stock</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formData.tipo_movimiento} onValueChange={(v: TipoMovimiento) => setFormData({...formData, tipo_movimiento: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="salida">Salida</SelectItem>
                    <SelectItem value="caducado">Caducado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cantidad</Label>
                <Input type="number" min="1" value={formData.cantidad} onChange={e => setFormData({...formData, cantidad: e.target.value})} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Lote / Existencia</Label>
              <Select onValueChange={(v) => setFormData({...formData, id_existencia: v})}>
                <SelectTrigger><SelectValue placeholder="Seleccione el lote..." /></SelectTrigger>
                <SelectContent>
                  {existencias.map(ex => (
                    <SelectItem key={ex.id_existencia} value={ex.id_existencia.toString()}>
                      {getMedicamentoNombre(ex.id_existencia)} - {ex.codigo_referencia} (Disp: {ex.cantidad_actual})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Textarea placeholder="Ej: Venta directa, Ajuste de inventario..." value={formData.observaciones} onChange={e => setFormData({...formData, observaciones: e.target.value})} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Procesando...' : 'Confirmar Registro'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}