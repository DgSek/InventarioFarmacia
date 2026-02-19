import { useState } from 'react';
import { storage } from '../data/storage';
import { Existencia, Medicamento } from '../types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
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
import { Plus, Package, Calendar, Hash, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function Existencias() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    id_medicamento: '',
    codigo_referencia: '',
    cantidad_actual: '',
    fecha_registro: new Date().toISOString().split('T')[0],
  });

  // --- CARGA DE DATOS ASÍNCRONA ---
  const { data: existencias = [], isLoading: loadingEx } = useQuery({
    queryKey: ['existencias'],
    queryFn: () => storage.getExistencias(),
  });

  const { data: medicamentos = [], isLoading: loadingMeds } = useQuery({
    queryKey: ['medicamentos'],
    queryFn: () => storage.getMedicamentos(),
  });

  // --- MUTACIÓN PARA REGISTRAR EXISTENCIA ---
  const mutation = useMutation({
    mutationFn: async (newData: any) => {
      // 1. Guardar la existencia
      const existencia = await storage.saveExistencia(newData);
      
      // 2. Registrar el movimiento de entrada inicial (con el id_usuario 1 por defecto para el prototipo)
      await storage.registrarMovimiento(
        existencia.id_existencia,
        'entrada',
        newData.cantidad_actual,
        1, 
        'Registro inicial de existencia'
      );
      return existencia;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['existencias'] });
      queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      queryClient.invalidateQueries({ queryKey: ['inventario'] });
      toast.success('Existencia y movimiento inicial registrados');
      closeDialog();
    },
    onError: () => toast.error('Error al conectar con el servidor central'),
  });

  const getMedicamentoInfo = (id: number) => {
    return medicamentos.find(m => m.id_medicamento === id);
  };

  const filteredExistencias = existencias.filter(e => {
    const med = getMedicamentoInfo(e.id_medicamento);
    const term = searchTerm.toLowerCase();
    return (
      med?.nombre.toLowerCase().includes(term) ||
      e.codigo_referencia.toLowerCase().includes(term) ||
      med?.tipo_medicamento.toLowerCase().includes(term)
    );
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id_medicamento || !formData.codigo_referencia || !formData.cantidad_actual) {
      toast.error('Complete los campos obligatorios');
      return;
    }

    mutation.mutate({
      id_medicamento: parseInt(formData.id_medicamento),
      codigo_referencia: formData.codigo_referencia,
      cantidad_actual: parseInt(formData.cantidad_actual),
      fecha_registro: formData.fecha_registro,
    });
  };

  const openDialog = () => {
    setFormData({
      id_medicamento: '',
      codigo_referencia: '',
      cantidad_actual: '',
      fecha_registro: new Date().toISOString().split('T')[0],
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => setIsDialogOpen(false);

  // Agrupar existencias por medicamento
  const existenciasPorMedicamento = filteredExistencias.reduce((acc, existencia) => {
    const medId = existencia.id_medicamento;
    if (!acc[medId]) acc[medId] = [];
    acc[medId].push(existencia);
    return acc;
  }, {} as Record<number, Existencia[]>);

  if (loadingEx || loadingMeds) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-gray-500">Sincronizando lotes con PostgreSQL...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Control de Existencias</h2>
          <p className="text-gray-600 mt-1">Gestión de lotes en tilinescraft.serveminecraft.net</p>
        </div>
        <Button onClick={openDialog} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nueva Existencia
        </Button>
      </div>
      
      <Card>
        <CardContent className="pt-6">
          <Label>Buscar lote o medicina</Label>
          <Input
            placeholder="Ej: LOTE-2026 o Paracetamol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </CardContent>
      </Card>
      
      {Object.entries(existenciasPorMedicamento).map(([medId, exs]) => {
        const medicamento = getMedicamentoInfo(parseInt(medId));
        if (!medicamento) return null;
        
        const cantidadTotal = exs.reduce((sum, e) => sum + e.cantidad_actual, 0);
        const bajoStock = cantidadTotal <= medicamento.stock_minimo;
        
        return (
          <Card key={medId} className={bajoStock ? "border-red-200" : ""}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-100">
                    <Package className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{medicamento.nombre}</CardTitle>
                    <Badge variant="outline" className="mt-1">{medicamento.tipo_medicamento}</Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold" style={{ color: bajoStock ? '#96453B' : '#22c55e' }}>
                    {cantidadTotal}
                  </p>
                  {bajoStock && <Badge variant="destructive">Stock Crítico</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lote / Referencia</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Fecha Registro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exs.map((e) => (
                    <TableRow key={e.id_existencia}>
                      <TableCell className="font-mono text-sm"><Hash className="inline w-3 h-3 mr-1"/>{e.codigo_referencia}</TableCell>
                      <TableCell className="font-semibold">{e.cantidad_actual}</TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        <Calendar className="inline w-3 h-3 mr-1"/>
                        {new Date(e.fecha_registro).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo Lote de Existencia</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Medicamento</Label>
              <Select onValueChange={(v) => setFormData({...formData, id_medicamento: v})}>
                <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                <SelectContent>
                  {medicamentos.filter(m => m.activo).map(med => (
                    <SelectItem key={med.id_medicamento} value={med.id_medicamento.toString()}>
                      {med.nombre} ({med.concentracion})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código Lote</Label>
                <Input value={formData.codigo_referencia} onChange={e => setFormData({...formData, codigo_referencia: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Cantidad</Label>
                <Input type="number" value={formData.cantidad_actual} onChange={e => setFormData({...formData, cantidad_actual: e.target.value})} required />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Procesando...' : 'Registrar Lote'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}