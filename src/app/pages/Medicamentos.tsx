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
import { Plus, Edit, Pill, Loader2, LayoutGrid, Beaker, Barcode, Search, Trash2, AlertTriangle, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export function Medicamentos() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMedicamento, setEditingMedicamento] = useState<Medicamento | null>(null);
  const [medToDelete, setMedToDelete] = useState<Medicamento | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');

  // Estado inicial limpio (sin concentración)
  const [formData, setFormData] = useState({
    nombre: '',
    tipo_medicamento: '',
    codigo_barras: '',
    stock_minimo: '',
    ubicacion: '',
    estante: '',
    activo: true,
    sede: 'Centro Comunitario',
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

  // --- MUTACIONES ---
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

  const deleteMutation = useMutation({
    mutationFn: async (med: Medicamento) => {
      const inv = inventario.find(i => i.medicamento.id_medicamento === med.id_medicamento);
      if (inv?.existencias) {
        for (const ex of inv.existencias) {
          if (ex.cantidad_actual > 0) {
            await storage.registrarMovimiento(
              ex.id_existencia,
              'salida',
              ex.cantidad_actual,
              1,
              `Baja por eliminación de registro: ${med.nombre}`
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
      toast.success('Medicamento eliminado del catálogo');
      setMedToDelete(null);
    },
  });

  // --- LÓGICA ---
  const filteredMedicamentos = medicamentos.filter(m => {
    if (!m.activo) return false;
    const term = searchTerm.toLowerCase();
    return (
      m.nombre.toLowerCase().includes(term) ||
      m.tipo_medicamento.toLowerCase().includes(term) ||
      (m.codigo_barras && m.codigo_barras.toLowerCase().includes(term)) ||
      (m.sede && m.sede.toLowerCase().includes(term))
    );
  });

  const tiposMedicamento = Array.from(new Set(medicamentos.map(m => m.tipo_medicamento)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre || !formData.tipo_medicamento || !formData.codigo_barras) {
      toast.error('Nombre, Categoría y Código son obligatorios');
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
        codigo_barras: medicamento.codigo_barras || '',
        stock_minimo: medicamento.stock_minimo.toString(),
        ubicacion: medicamento.ubicacion,
        estante: medicamento.estante || '',
        activo: medicamento.activo,
        sede: medicamento.sede || 'Centro Comunitario',
      });
    } else {
      setEditingMedicamento(null);
      setFormData({
        nombre: '', tipo_medicamento: '', codigo_barras: '',
        stock_minimo: '0', ubicacion: '', estante: '', activo: true,
        sede: 'Centro Comunitario'
      });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingMedicamento(null);
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-64 space-y-4">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      <p className="text-gray-500 font-medium">Cargando catálogo...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Catálogo de Medicamentos</h2>
        <Button onClick={() => openDialog()} className="bg-[#4796B7] hover:bg-[#3a7d99] shadow-md text-white">
          <Plus className="w-4 h-4 mr-2" /> Nuevo Medicamento
        </Button>
      </div>

      <Card className="border-none shadow-sm bg-slate-50/50">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-600 font-semibold">Búsqueda Rápida</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  className="pl-10 bg-white"
                  placeholder="Nombre, código o sede..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-600 font-semibold">Categoría</Label>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
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
            <TableHeader>
              <TableRow className="hover:bg-[#4796B7]/10 border-b transition-colors">
                <TableHead className="w-[140px] pl-6">Código</TableHead>
                <TableHead>Medicamento</TableHead>
                <TableHead>Sede</TableHead>
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
                  <TableRow key={med.id_medicamento} className="hover:bg-[#4796B7]/5 transition-colors">
                    <TableCell className="font-mono text-[11px] text-blue-600 font-bold pl-6">
                      {med.codigo_barras}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{med.nombre}</span>
                        <span className="text-[10px] text-slate-400 uppercase">{med.tipo_medicamento}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-50 gap-1 border-slate-200 text-slate-600 py-1">
                        <Building2 className="w-3 h-3" /> {med.sede}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className={`text-base font-black ${bajoStock ? 'text-red-600' : 'text-emerald-600'}`}>
                          {total}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase">Mín: {med.stock_minimo}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openDialog(med)} className="text-slate-400 hover:text-blue-600">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setMedToDelete(med)} className="text-slate-400 hover:text-red-600">
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

      {/* --- MODAL ELIMINACIÓN --- */}
      <Dialog open={!!medToDelete} onOpenChange={() => setMedToDelete(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2 text-red-600">
              <div className="p-2 bg-red-50 rounded-full"><AlertTriangle className="w-6 h-6" /></div>
              <DialogTitle>¿Eliminar Medicamento?</DialogTitle>
            </div>
          </DialogHeader>
          <div className="py-2 text-slate-600 text-sm">
            Esta acción dará de baja a <strong>{medToDelete?.nombre}</strong> y registrará una salida de ajuste para todo el stock restante.
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setMedToDelete(null)} className="flex-1">Cancelar</Button>
            <Button onClick={() => deleteMutation.mutate(medToDelete!)} disabled={deleteMutation.isPending} className="bg-red-600 hover:bg-red-700 flex-1">
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- MODAL REGISTRO --- */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              {editingMedicamento ? 'Editar' : 'Nuevo'} Medicamento
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                <Label className="text-slate-700 font-bold flex items-center gap-2">
                  <Barcode className="w-4 h-4" /> Código
                </Label>
                <Input
                  className="bg-white"
                  value={formData.codigo_barras}
                  onChange={(e) => setFormData({ ...formData, codigo_barras: e.target.value })}
                />
              </div>

              <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 space-y-2">
                <Label className="text-blue-900 font-bold flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Sede
                </Label>
                <Select
                  value={formData.sede}
                  onValueChange={(val) => setFormData({ ...formData, sede: val })}
                >
                  <SelectTrigger className="bg-white border-blue-200 text-blue-900 font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Centro Comunitario">Centro Comunitario</SelectItem>
                    <SelectItem value="Nueva Esperanza">Nueva Esperanza</SelectItem>
                    <SelectItem value="Sonoyta">Sonoyta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold">Nombre del Medicamento</Label>
              <Input value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} required />
            </div>

            <div className="space-y-2">
              <Label className="font-semibold">Tipo / Categoría</Label>
              <Input value={formData.tipo_medicamento} onChange={(e) => setFormData({ ...formData, tipo_medicamento: e.target.value })} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold">Ubicación (Pasillo/Área)</Label>
                <Input value={formData.ubicacion} onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Estante / Nivel</Label>
                <Input value={formData.estante} onChange={(e) => setFormData({ ...formData, estante: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold text-red-600">Alerta de Stock Mínimo</Label>
              <Input type="number" value={formData.stock_minimo} onChange={(e) => setFormData({ ...formData, stock_minimo: e.target.value })} required />
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="ghost" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit" disabled={mutation.isPending} className="bg-[#4796B7] hover:bg-[#3a7d99] px-8 text-white">
                {mutation.isPending && <Loader2 className="animate-spin mr-2 w-4 h-4" />}
                {editingMedicamento ? 'Guardar' : 'Registrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}