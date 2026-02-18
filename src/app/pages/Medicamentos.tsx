import { useState, useEffect } from 'react';
import { storage } from '../data/storage';
import { Medicamento } from '../types';
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
import { Plus, Edit, MapPin, Package, Pill } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '../components/ui/switch';

export function Medicamentos() {
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [filteredMedicamentos, setFilteredMedicamentos] = useState<Medicamento[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMedicamento, setEditingMedicamento] = useState<Medicamento | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  
  const [formData, setFormData] = useState({
    tipo_medicamento: '',
    nombre: '',
    concentracion: '',
    stock_minimo: '',
    ubicacion: '',
    activo: true,
  });
  
  useEffect(() => {
    loadMedicamentos();
  }, []);
  
  useEffect(() => {
    filterMedicamentos();
  }, [medicamentos, searchTerm, filterTipo]);
  
  const loadMedicamentos = () => {
    const data = storage.getMedicamentos();
    setMedicamentos(data);
  };
  
  const filterMedicamentos = () => {
    let filtered = [...medicamentos];
    
    if (searchTerm) {
      filtered = filtered.filter(m =>
        m.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.tipo_medicamento.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterTipo !== 'todos') {
      filtered = filtered.filter(m => m.tipo_medicamento === filterTipo);
    }
    
    setFilteredMedicamentos(filtered);
  };
  
  const tiposMedicamento = Array.from(new Set(medicamentos.map(m => m.tipo_medicamento)));
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre || !formData.tipo_medicamento || !formData.concentracion || !formData.ubicacion) {
      toast.error('Por favor complete todos los campos requeridos');
      return;
    }
    
    if (editingMedicamento) {
      // Actualizar
      const updated: Medicamento = {
        ...editingMedicamento,
        ...formData,
        stock_minimo: parseInt(formData.stock_minimo) || 0,
      };
      storage.updateMedicamento(updated);
      toast.success('Medicamento actualizado correctamente');
    } else {
      // Crear nuevo
      storage.saveMedicamento({
        ...formData,
        stock_minimo: parseInt(formData.stock_minimo) || 0,
      });
      toast.success('Medicamento registrado correctamente');
    }
    
    loadMedicamentos();
    closeDialog();
  };
  
  const openDialog = (medicamento?: Medicamento) => {
    if (medicamento) {
      setEditingMedicamento(medicamento);
      setFormData({
        tipo_medicamento: medicamento.tipo_medicamento,
        nombre: medicamento.nombre,
        concentracion: medicamento.concentracion,
        stock_minimo: medicamento.stock_minimo.toString(),
        ubicacion: medicamento.ubicacion,
        activo: medicamento.activo,
      });
    } else {
      setEditingMedicamento(null);
      setFormData({
        tipo_medicamento: '',
        nombre: '',
        concentracion: '',
        stock_minimo: '',
        ubicacion: '',
        activo: true,
      });
    }
    setIsDialogOpen(true);
  };
  
  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingMedicamento(null);
  };
  
  const toggleActivo = (medicamento: Medicamento) => {
    const updated = { ...medicamento, activo: !medicamento.activo };
    storage.updateMedicamento(updated);
    loadMedicamentos();
    toast.success(`Medicamento ${updated.activo ? 'activado' : 'desactivado'} correctamente`);
  };
  
  const inventario = storage.getInventarioCompleto();
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Gestión de Medicamentos</h2>
          <p className="text-gray-600 mt-1">Catálogo general de medicamentos</p>
        </div>
        <Button onClick={() => openDialog()} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Medicamento
        </Button>
      </div>
      
      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Buscar</Label>
              <Input
                placeholder="Buscar por nombre o tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label>Filtrar por Tipo</Label>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
      
      {/* Tabla de Medicamentos */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Medicamentos ({filteredMedicamentos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Concentración</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Stock Mínimo</TableHead>
                <TableHead>Existencias</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMedicamentos.length > 0 ? (
                filteredMedicamentos.map((medicamento) => {
                  const inv = inventario.find(i => i.medicamento.id_medicamento === medicamento.id_medicamento);
                  const cantidadTotal = inv?.cantidad_total || 0;
                  const bajoStock = cantidadTotal <= medicamento.stock_minimo;
                  
                  return (
                    <TableRow key={medicamento.id_medicamento}>
                      <TableCell className="font-medium">{medicamento.id_medicamento}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Pill className="w-4 h-4" style={{ color: '#6DA2B3' }} />
                          <span className="font-medium">{medicamento.nombre}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{medicamento.tipo_medicamento}</Badge>
                      </TableCell>
                      <TableCell>{medicamento.concentracion}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" style={{ color: '#A5867A' }}>
                          <MapPin className="w-3 h-3" />
                          <span className="text-sm">{medicamento.ubicacion}</span>
                        </div>
                      </TableCell>
                      <TableCell>{medicamento.stock_minimo}</TableCell>
                      <TableCell>
                        <span className={`font-semibold`} style={{ color: bajoStock ? '#96453B' : '#6DA2B3' }}>
                          {cantidadTotal}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={medicamento.activo ? 'default' : 'secondary'}>
                          {medicamento.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDialog(medicamento)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Switch
                            checked={medicamento.activo}
                            onCheckedChange={() => toggleActivo(medicamento)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                    No se encontraron medicamentos
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Dialog para agregar/editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingMedicamento ? 'Editar Medicamento' : 'Nuevo Medicamento'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Paracetamol"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="tipo">Tipo de Medicamento *</Label>
              <Input
                id="tipo"
                value={formData.tipo_medicamento}
                onChange={(e) => setFormData({ ...formData, tipo_medicamento: e.target.value })}
                placeholder="Ej: Analgésico"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="concentracion">Concentración *</Label>
              <Input
                id="concentracion"
                value={formData.concentracion}
                onChange={(e) => setFormData({ ...formData, concentracion: e.target.value })}
                placeholder="Ej: 500mg"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="stock_minimo">Stock Mínimo *</Label>
              <Input
                id="stock_minimo"
                type="number"
                value={formData.stock_minimo}
                onChange={(e) => setFormData({ ...formData, stock_minimo: e.target.value })}
                placeholder="Ej: 50"
                min="0"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="ubicacion">Ubicación *</Label>
              <Input
                id="ubicacion"
                value={formData.ubicacion}
                onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                placeholder="Ej: Estante A1"
                required
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                id="activo"
                checked={formData.activo}
                onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
              />
              <Label htmlFor="activo">Medicamento activo</Label>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingMedicamento ? 'Actualizar' : 'Registrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}