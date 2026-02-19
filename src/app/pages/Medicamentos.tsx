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
import { Plus, Edit, Pill, Loader2, LayoutGrid, Beaker, Barcode, Search } from 'lucide-react';
import { toast } from 'sonner';

export function Medicamentos() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMedicamento, setEditingMedicamento] = useState<Medicamento | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');

  // Estado del formulario unificado con codigo_barras
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

  // --- CARGA DE DATOS ASÍNCRONA ---
  const { data: medicamentos = [], isLoading } = useQuery({
    queryKey: ['medicamentos'],
    queryFn: async () => {
      const data = await storage.getMedicamentos();
      // Garantizamos que siempre sea un arreglo para evitar errores de .filter
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
    onError: () => {
      toast.error('Error al conectar con el servidor');
    },
  });

  // --- LÓGICA DE FILTRADO ---
  const filteredMedicamentos = medicamentos.filter(m => {
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
        nombre: '',
        tipo_medicamento: '',
        concentracion: '',
        codigo_barras: '',
        stock_minimo: '0',
        ubicacion: '',
        estante: '',
        activo: true
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
          <p className="text-gray-600 mt-1 text-sm font-mono">Server: tilinescraft.serveminecraft.net</p>
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
              <Label className="text-slate-600">Búsqueda Rápida (Nombre o Código)</Label>
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
        <CardHeader className="border-b bg-slate-50/30">
          <CardTitle className="text-lg text-slate-700 flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-blue-500" />
            Registros Encontrados ({filteredMedicamentos.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="w-[150px]">Código (Barras)</TableHead>
                <TableHead>Medicamento</TableHead>
                <TableHead>Concentración</TableHead>
                <TableHead>Stock Total</TableHead>
                <TableHead>Estado</TableHead>
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
                        <span className="text-[9px] text-slate-400 font-medium">MIN: {med.stock_minimo}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={med.activo ? 'default' : 'secondary'} className={med.activo ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : ''}>
                        {med.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" size="icon" onClick={() => openDialog(med)} className="hover:bg-blue-50 hover:text-blue-600">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              {editingMedicamento ? <Edit className="w-5 h-5 text-blue-500"/> : <Plus className="w-5 h-5 text-blue-500"/>}
              {editingMedicamento ? 'Modificar' : 'Registrar'} Medicamento
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
              <Label htmlFor="codigo" className="text-slate-700 font-bold flex items-center gap-2">
                <Barcode className="w-4 h-4" /> Código de Barras (Referencia)
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
              <div className="relative">
                <Pill className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input id="nombre" className="pl-10" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Categoría (Tipo)</Label>
                <Input id="tipo" placeholder="Ej: Analgésico" value={formData.tipo_medicamento} onChange={(e) => setFormData({ ...formData, tipo_medicamento: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="concentracion">Concentración</Label>
                <div className="relative">
                  <Beaker className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Input id="concentracion" className="pl-10" placeholder="Ej: 500 mg" value={formData.concentracion} onChange={(e) => setFormData({ ...formData, concentracion: e.target.value })} required />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ubicacion">Pasillo / Ubicación</Label>
                <Input id="ubicacion" placeholder="Ej: Pasillo A" value={formData.ubicacion} onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estante">Estante / Nivel</Label>
                <Input id="estante" placeholder="Ej: Estante 4" value={formData.estante} onChange={(e) => setFormData({ ...formData, estante: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock">Alerta de Stock Mínimo</Label>
              <Input id="stock" type="number" value={formData.stock_minimo} onChange={(e) => setFormData({ ...formData, stock_minimo: e.target.value })} required />
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="ghost" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit" disabled={mutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                {mutation.isPending ? <Loader2 className="animate-spin mr-2 w-4 h-4"/> : null}
                {editingMedicamento ? 'Guardar Cambios' : 'Registrar Medicamento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}