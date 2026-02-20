import { useState } from 'react';
import { storage } from '../data/storage';
import { Medicamento } from '../types';
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
import { Plus, Edit, Pill, Loader2, LayoutGrid, Beaker, Barcode, Search, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export function Medicamentos() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMedicamento, setEditingMedicamento] = useState<Medicamento | null>(null);
  
  // Nuevo estado para controlar el Dialog de eliminación
  const [medToDelete, setMedToDelete] = useState<Medicamento | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');

  const [formData, setFormData] = useState({
    nombre: '',
    tipo_medicamento: '',
    concentracion: '',
    codigo_barras: '', 
    stock_minimo: '',
    ubicacion: '',
    estante: '',
    activo: true,
  });

  // --- CARGA DE DATOS ---
  const { data: medicamentos = [], isLoading } = useQuery({
    queryKey: ['medicamentos'],
    queryFn: async () => {
      const data = await storage.getMedicamentos();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: inventario = [] } = useQuery({
    queryKey: ['inventario-completo'],
    queryFn: () => storage.getInventarioCompleto(),
  });

  // --- MUTACIÓN PARA GUARDAR/EDITAR ---
  const mutation = useMutation({
    mutationFn: (payload: any) =>
      editingMedicamento
        ? storage.updateMedicamento(payload)
        : storage.saveMedicamento(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicamentos'] });
      queryClient.invalidateQueries({ queryKey: ['inventario-completo'] });
      toast.success(editingMedicamento ? 'Actualizado correctamente' : 'Registrado correctamente');
      closeDialog();
    },
    onError: () => toast.error('Error al conectar con el servidor'),
  });

  // --- MUTACIÓN PARA ELIMINAR ---
  const deleteMutation = useMutation({
    mutationFn: async (med: Medicamento) => {
      const inv = inventario.find(i => i.medicamento.id_medicamento === med.id_medicamento);
      const stockActual = inv?.cantidad_total || 0;

      if (stockActual > 0 && inv?.existencias) {
        for (const ex of inv.existencias) {
          if (ex.cantidad_actual > 0) {
            await storage.registrarMovimiento(
              ex.id_existencia,
              'salida',
              ex.cantidad_actual,
              1, 
              `Baja por eliminación de medicamento: ${med.nombre}`
            );
          }
        }
      }
      return storage.updateMedicamento({ ...med, activo: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicamentos'] });
      queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      queryClient.invalidateQueries({ queryKey: ['inventario-completo'] });
      toast.success('Medicamento eliminado y stock ajustado');
      setMedToDelete(null);
    },
    onError: () => toast.error('No se pudo eliminar el medicamento'),
  });

  // --- FILTRADO ---
  const filteredMedicamentos = medicamentos.filter(m => {
    if (!m.activo) return false;
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      m.nombre.toLowerCase().includes(term) ||
      m.tipo_medicamento.toLowerCase().includes(term) ||
      (m.codigo_barras && m.codigo_barras.toLowerCase().includes(term));
    const matchesTipo = filterTipo === 'todos' || m.tipo_medicamento === filterTipo;
    return matchesSearch && matchesTipo;
  });

  const tiposMedicamento = Array.from(new Set(medicamentos.map(m => m.tipo_medicamento)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre || !formData.tipo_medicamento || !formData.codigo_barras) {
      toast.error('Nombre, Categoría y Código de Barras son obligatorios');
      return;
    }
    const payload = {
      ...formData,
      id_medicamento: editingMedicamento?.id_medicamento,
      stock_minimo: parseInt(formData.stock_minimo) || 0,
    };
    mutation.mutate(payload);
  };

  const openDialog = (medicamento?: Medicamento) => {
    if (medicamento) {
      setEditingMedicamento(medicamento);
      setFormData({
        nombre: medicamento.nombre,
        tipo_medicamento: medicamento.tipo_medicamento,
        concentracion: medicamento.concentracion,
        codigo_barras: medicamento.codigo_barras || '', 
        stock_minimo: medicamento.stock_minimo.toString(),
        ubicacion: medicamento.ubicacion,
        estante: medicamento.estante || '',
        activo: medicamento.activo,
      });
    } else {
      setEditingMedicamento(null);
      setFormData({
        nombre: '', tipo_medicamento: '', concentracion: '', codigo_barras: '',
        stock_minimo: '0', ubicacion: '', estante: '', activo: true
      });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingMedicamento(null);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-gray-500 font-medium">Sincronizando con tilinescraft...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Catálogo de Medicamentos</h2>
        </div>
        <Button onClick={() => openDialog()} className="bg-blue-600 hover:bg-blue-700 shadow-md">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Medicamento
        </Button>
      </div>

      <Card className="border-none shadow-sm bg-slate-50/50">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-600">Búsqueda Rápida</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  className="pl-10 bg-white"
                  placeholder="Escanee código o escriba nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-600">Filtrar por Categoría</Label>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los tipos</SelectItem>
                  {tiposMedicamento.map(tipo => (
                    <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="w-[150px]">Código (Barras)</TableHead>
                <TableHead>Medicamento</TableHead>
                <TableHead>Concentración</TableHead>
                <TableHead>Stock Total</TableHead>
                <TableHead className="text-right pr-6">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMedicamentos.map((med) => {
                const inv = inventario.find(i => i.medicamento.id_medicamento === med.id_medicamento);
                const total = inv?.cantidad_total || 0;
                const bajoStock = total <= med.stock_minimo;

                return (
                  <TableRow key={med.id_medicamento} className="hover:bg-slate-50/80 transition-colors">
                    <TableCell className="font-mono text-[11px] text-blue-600 font-medium">
                      {med.codigo_barras || 'SIN CÓDIGO'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{med.nombre}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">{med.tipo_medicamento}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-normal">
                        {med.concentracion}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className={`text-base font-bold ${bajoStock ? 'text-red-600' : 'text-emerald-600'}`}>
                          {total}
                        </span>
                        <span className="text-[9px] text-slate-400 font-medium text-xs">MIN: {med.stock_minimo}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openDialog(med)} className="hover:bg-blue-50 hover:text-blue-600">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setMedToDelete(med)} 
                          className="hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* --- DIALOG REUTILIZADO PARA CONFIRMACIÓN DE ELIMINACIÓN --- */}
      <Dialog open={!!medToDelete} onOpenChange={() => setMedToDelete(null)}>
        <DialogContent className="sm:max-w-[425px] border-red-100">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2 text-red-600">
              <div className="p-2 bg-red-50 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <DialogTitle className="text-xl">¿Confirmar eliminación?</DialogTitle>
            </div>
          </DialogHeader>
          
          <div className="py-4 text-slate-600 text-sm leading-relaxed">
            Estás a punto de eliminar <span className="font-bold text-slate-900">{medToDelete?.nombre}</span> del catálogo. 
            <br /><br />
            Esta acción registrará automáticamente una <span className="font-semibold text-red-700">SALIDA DE SISTEMA</span> de todo el stock actual en el historial de movimientos para auditoría.
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setMedToDelete(null)} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={() => deleteMutation.mutate(medToDelete!)} 
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white flex-1"
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Sí, eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- DIALOG DE REGISTRO / EDICIÓN --- */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              {editingMedicamento ? 'Modificar' : 'Registrar'} Medicamento
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
              <Label htmlFor="codigo" className="text-slate-700 font-bold flex items-center gap-2">
                <Barcode className="w-4 h-4" /> Código de Barras
              </Label>
              <Input 
                id="codigo" 
                placeholder="Escanee el producto..." 
                className="bg-white"
                value={formData.codigo_barras} 
                onChange={(e) => setFormData({ ...formData, codigo_barras: e.target.value })} 
                autoFocus 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre Comercial / Genérico</Label>
              <Input id="nombre" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Categoría (Tipo)</Label>
                <Input id="tipo" value={formData.tipo_medicamento} onChange={(e) => setFormData({ ...formData, tipo_medicamento: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="concentracion">Concentración</Label>
                <Input id="concentracion" value={formData.concentracion} onChange={(e) => setFormData({ ...formData, concentracion: e.target.value })} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ubicacion">Ubicación</Label>
                <Input id="ubicacion" value={formData.ubicacion} onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estante">Estante</Label>
                <Input id="estante" value={formData.estante} onChange={(e) => setFormData({ ...formData, estante: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock">Alerta de Stock Mínimo</Label>
              <Input id="stock" type="number" value={formData.stock_minimo} onChange={(e) => setFormData({ ...formData, stock_minimo: e.target.value })} required />
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="ghost" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit" disabled={mutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                {mutation.isPending && <Loader2 className="animate-spin mr-2 w-4 h-4"/>}
                {editingMedicamento ? 'Guardar Cambios' : 'Registrar Medicamento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}