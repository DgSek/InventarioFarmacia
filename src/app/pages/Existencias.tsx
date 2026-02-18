import { useState, useEffect } from 'react';
import { storage } from '../data/storage';
import { Existencia, Medicamento } from '../types';
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
import { Plus, Package, Calendar, Hash } from 'lucide-react';
import { toast } from 'sonner';

export function Existencias() {
  const [existencias, setExistencias] = useState<Existencia[]>([]);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    id_medicamento: '',
    codigo_referencia: '',
    cantidad_actual: '',
    fecha_registro: new Date().toISOString().split('T')[0],
  });
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = () => {
    setExistencias(storage.getExistencias());
    setMedicamentos(storage.getMedicamentos().filter(m => m.activo));
  };
  
  const getMedicamentoNombre = (id: number) => {
    return medicamentos.find(m => m.id_medicamento === id)?.nombre || 'Desconocido';
  };
  
  const getMedicamentoInfo = (id: number) => {
    return medicamentos.find(m => m.id_medicamento === id);
  };
  
  const filteredExistencias = existencias.filter(e => {
    if (!searchTerm) return true;
    const med = getMedicamentoInfo(e.id_medicamento);
    return (
      getMedicamentoNombre(e.id_medicamento).toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.codigo_referencia.toLowerCase().includes(searchTerm.toLowerCase()) ||
      med?.tipo_medicamento.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.id_medicamento || !formData.codigo_referencia || !formData.cantidad_actual) {
      toast.error('Por favor complete todos los campos requeridos');
      return;
    }
    
    // Verificar si ya existe el código de referencia
    const existe = existencias.find(e => e.codigo_referencia === formData.codigo_referencia);
    if (existe) {
      toast.error('El código de referencia ya existe');
      return;
    }
    
    storage.saveExistencia({
      id_medicamento: parseInt(formData.id_medicamento),
      codigo_referencia: formData.codigo_referencia,
      cantidad_actual: parseInt(formData.cantidad_actual),
      fecha_registro: formData.fecha_registro,
    });
    
    // Registrar movimiento de entrada automáticamente
    const existenciaCreada = storage.getExistencias().find(
      e => e.codigo_referencia === formData.codigo_referencia
    );
    
    if (existenciaCreada) {
      storage.registrarMovimiento(
        existenciaCreada.id_existencia,
        'entrada',
        parseInt(formData.cantidad_actual),
        'Registro inicial de existencia'
      );
    }
    
    toast.success('Existencia registrada correctamente');
    loadData();
    closeDialog();
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
  
  const closeDialog = () => {
    setIsDialogOpen(false);
  };
  
  // Agrupar existencias por medicamento
  const existenciasPorMedicamento = filteredExistencias.reduce((acc, existencia) => {
    const medId = existencia.id_medicamento;
    if (!acc[medId]) {
      acc[medId] = [];
    }
    acc[medId].push(existencia);
    return acc;
  }, {} as Record<number, Existencia[]>);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Control de Existencias</h2>
          <p className="text-gray-600 mt-1">Gestión de lotes y referencias de medicamentos</p>
        </div>
        <Button onClick={openDialog} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nueva Existencia
        </Button>
      </div>
      
      {/* Búsqueda */}
      <Card>
        <CardContent className="pt-6">
          <div>
            <Label>Buscar</Label>
            <Input
              placeholder="Buscar por medicamento, lote o tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Existencias agrupadas por medicamento */}
      {Object.entries(existenciasPorMedicamento).map(([medId, exs]) => {
        const medicamento = getMedicamentoInfo(parseInt(medId));
        if (!medicamento) return null;
        
        const cantidadTotal = exs.reduce((sum, e) => sum + e.cantidad_actual, 0);
        const bajoStock = cantidadTotal <= medicamento.stock_minimo;
        
        return (
          <Card key={medId}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#ECD2D1' }}>
                    <Package className="w-5 h-5" style={{ color: '#6DA2B3' }} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{medicamento.nombre}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{medicamento.tipo_medicamento}</Badge>
                      <span className="text-sm" style={{ color: '#A5867A' }}>{medicamento.concentracion}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm" style={{ color: '#A5867A' }}>Total en existencia</p>
                  <p className="text-2xl font-semibold" style={{ color: bajoStock ? '#96453B' : '#6DA2B3' }}>
                    {cantidadTotal}
                  </p>
                  {bajoStock && (
                    <Badge variant="destructive" className="mt-1">
                      Bajo stock mínimo
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Existencia</TableHead>
                    <TableHead>Código de Referencia</TableHead>
                    <TableHead>Cantidad Actual</TableHead>
                    <TableHead>Fecha Registro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exs.map((existencia) => (
                    <TableRow key={existencia.id_existencia}>
                      <TableCell className="font-medium">#{existencia.id_existencia}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-gray-400" />
                          <span className="font-mono text-sm">{existencia.codigo_referencia}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`font-semibold ${
                          existencia.cantidad_actual === 0 ? 'text-gray-400' : 'text-gray-900'
                        }`}>
                          {existencia.cantidad_actual}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span className="text-sm">
                            {new Date(existencia.fecha_registro).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
      
      {filteredExistencias.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No se encontraron existencias</p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Dialog para nueva existencia */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Nueva Existencia</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="medicamento">Medicamento *</Label>
              <Select
                value={formData.id_medicamento}
                onValueChange={(value) => setFormData({ ...formData, id_medicamento: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un medicamento" />
                </SelectTrigger>
                <SelectContent>
                  {medicamentos.map(med => (
                    <SelectItem key={med.id_medicamento} value={med.id_medicamento.toString()}>
                      {med.nombre} - {med.concentracion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="codigo_referencia">Código de Referencia/Lote *</Label>
              <Input
                id="codigo_referencia"
                value={formData.codigo_referencia}
                onChange={(e) => setFormData({ ...formData, codigo_referencia: e.target.value })}
                placeholder="Ej: LOTE-2026-001"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Identificador único del lote, donación o compra
              </p>
            </div>
            
            <div>
              <Label htmlFor="cantidad">Cantidad Inicial *</Label>
              <Input
                id="cantidad"
                type="number"
                value={formData.cantidad_actual}
                onChange={(e) => setFormData({ ...formData, cantidad_actual: e.target.value })}
                placeholder="Ej: 100"
                min="0"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="fecha">Fecha de Registro</Label>
              <Input
                id="fecha"
                type="date"
                value={formData.fecha_registro}
                onChange={(e) => setFormData({ ...formData, fecha_registro: e.target.value })}
                required
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button type="submit">
                Registrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}