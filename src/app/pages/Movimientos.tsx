import { useState, useEffect } from 'react';
import { storage } from '../data/storage';
import { Movimiento, Existencia, Medicamento, TipoMovimiento } from '../types';
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
import { Plus, ArrowUpCircle, ArrowDownCircle, XCircle, Calendar, User } from 'lucide-react';
import { toast } from 'sonner';

export function Movimientos() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [existencias, setExistencias] = useState<Existencia[]>([]);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  
  const [formData, setFormData] = useState({
    id_existencia: '',
    tipo_movimiento: 'entrada' as TipoMovimiento,
    cantidad: '',
    observaciones: '',
  });
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = () => {
    const movs = storage.getMovimientos().sort((a, b) => 
      new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
    setMovimientos(movs);
    setExistencias(storage.getExistencias());
    setMedicamentos(storage.getMedicamentos());
  };
  
  const getExistenciaInfo = (id: number) => {
    return existencias.find(e => e.id_existencia === id);
  };
  
  const getMedicamentoNombre = (idExistencia: number) => {
    const existencia = getExistenciaInfo(idExistencia);
    if (!existencia) return 'Desconocido';
    const med = medicamentos.find(m => m.id_medicamento === existencia.id_medicamento);
    return med?.nombre || 'Desconocido';
  };
  
  const filteredMovimientos = movimientos.filter(m => {
    if (filterTipo === 'todos') return true;
    return m.tipo_movimiento === filterTipo;
  });
  
  const existenciasDisponibles = existencias.filter(e => e.cantidad_actual > 0);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.id_existencia || !formData.cantidad) {
      toast.error('Por favor complete todos los campos requeridos');
      return;
    }
    
    const cantidad = parseInt(formData.cantidad);
    const existencia = getExistenciaInfo(parseInt(formData.id_existencia));
    
    if (!existencia) {
      toast.error('Existencia no encontrada');
      return;
    }
    
    // Validar stock negativo
    if ((formData.tipo_movimiento === 'salida' || formData.tipo_movimiento === 'caducado') &&
        existencia.cantidad_actual < cantidad) {
      toast.error(`Stock insuficiente. Cantidad disponible: ${existencia.cantidad_actual}`);
      return;
    }
    
    const movimiento = storage.registrarMovimiento(
      parseInt(formData.id_existencia),
      formData.tipo_movimiento,
      cantidad,
      formData.observaciones
    );
    
    if (movimiento) {
      toast.success('Movimiento registrado correctamente');
      loadData();
      closeDialog();
    } else {
      toast.error('Error al registrar el movimiento');
    }
  };
  
  const openDialog = () => {
    setFormData({
      id_existencia: '',
      tipo_movimiento: 'entrada',
      cantidad: '',
      observaciones: '',
    });
    setIsDialogOpen(true);
  };
  
  const closeDialog = () => {
    setIsDialogOpen(false);
  };
  
  const getTipoIcon = (tipo: TipoMovimiento) => {
    switch (tipo) {
      case 'entrada':
        return <ArrowUpCircle className="w-4 h-4" style={{ color: '#6DA2B3' }} />;
      case 'salida':
        return <ArrowDownCircle className="w-4 h-4" style={{ color: '#A37D5A' }} />;
      case 'caducado':
        return <XCircle className="w-4 h-4" style={{ color: '#96453B' }} />;
    }
  };
  
  const getTipoBadge = (tipo: TipoMovimiento) => {
    const variants = {
      entrada: 'default',
      salida: 'secondary',
      caducado: 'destructive',
    } as const;
    
    return (
      <Badge variant={variants[tipo]} className="flex items-center gap-1 w-fit">
        {getTipoIcon(tipo)}
        {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
      </Badge>
    );
  };
  
  const usuario = storage.getCurrentUser();
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Registro de Movimientos</h2>
          <p className="text-gray-600 mt-1">Control de entradas, salidas y caducidad</p>
        </div>
        <Button onClick={openDialog} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Movimiento
        </Button>
      </div>
      
      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Filtrar por Tipo</Label>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los movimientos</SelectItem>
                  <SelectItem value="entrada">Entradas</SelectItem>
                  <SelectItem value="salida">Salidas</SelectItem>
                  <SelectItem value="caducado">Caducados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="md:col-span-3 flex items-end gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg">
                <ArrowUpCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-xs text-green-600">Entradas</p>
                  <p className="font-semibold text-green-700">
                    {movimientos.filter(m => m.tipo_movimiento === 'entrada').length}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
                <ArrowDownCircle className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-xs text-blue-600">Salidas</p>
                  <p className="font-semibold text-blue-700">
                    {movimientos.filter(m => m.tipo_movimiento === 'salida').length}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-xs text-red-600">Caducados</p>
                  <p className="font-semibold text-red-700">
                    {movimientos.filter(m => m.tipo_movimiento === 'caducado').length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Tabla de Movimientos */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Movimientos ({filteredMovimientos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Fecha y Hora</TableHead>
                <TableHead>Medicamento</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Observaciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMovimientos.length > 0 ? (
                filteredMovimientos.map((movimiento) => {
                  const existencia = getExistenciaInfo(movimiento.id_existencia);
                  
                  return (
                    <TableRow key={movimiento.id_movimiento}>
                      <TableCell className="font-medium">#{movimiento.id_movimiento}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span className="text-sm">
                            {new Date(movimiento.fecha).toLocaleString('es-ES', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {getMedicamentoNombre(movimiento.id_existencia)}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm text-gray-600">
                          {existencia?.codigo_referencia || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {getTipoBadge(movimiento.tipo_movimiento)}
                      </TableCell>
                      <TableCell>
                        <span className={`font-semibold ${
                          movimiento.tipo_movimiento === 'entrada' 
                            ? 'text-green-600' 
                            : movimiento.tipo_movimiento === 'caducado'
                            ? 'text-red-600'
                            : 'text-blue-600'
                        }`}>
                          {movimiento.tipo_movimiento === 'entrada' ? '+' : '-'}
                          {movimiento.cantidad}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-gray-600">
                          <User className="w-4 h-4" />
                          <span className="text-sm">{usuario.nombre}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {movimiento.observaciones || '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                    No se encontraron movimientos
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Dialog para nuevo movimiento */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Nuevo Movimiento</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="tipo_movimiento">Tipo de Movimiento *</Label>
              <Select
                value={formData.tipo_movimiento}
                onValueChange={(value: TipoMovimiento) => 
                  setFormData({ ...formData, tipo_movimiento: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">
                    <div className="flex items-center gap-2">
                      <ArrowUpCircle className="w-4 h-4 text-green-600" />
                      Entrada
                    </div>
                  </SelectItem>
                  <SelectItem value="salida">
                    <div className="flex items-center gap-2">
                      <ArrowDownCircle className="w-4 h-4 text-blue-600" />
                      Salida
                    </div>
                  </SelectItem>
                  <SelectItem value="caducado">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                      Caducado
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="existencia">Existencia/Lote *</Label>
              <Select
                value={formData.id_existencia}
                onValueChange={(value) => setFormData({ ...formData, id_existencia: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una existencia" />
                </SelectTrigger>
                <SelectContent>
                  {(formData.tipo_movimiento === 'entrada' ? existencias : existenciasDisponibles).map(ex => {
                    const med = medicamentos.find(m => m.id_medicamento === ex.id_medicamento);
                    return (
                      <SelectItem key={ex.id_existencia} value={ex.id_existencia.toString()}>
                        {med?.nombre} - {ex.codigo_referencia} (Disponible: {ex.cantidad_actual})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="cantidad">Cantidad *</Label>
              <Input
                id="cantidad"
                type="number"
                value={formData.cantidad}
                onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                placeholder="Ej: 50"
                min="1"
                required
              />
              {formData.id_existencia && formData.tipo_movimiento !== 'entrada' && (
                <p className="text-xs text-gray-500 mt-1">
                  Disponible: {getExistenciaInfo(parseInt(formData.id_existencia))?.cantidad_actual || 0}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                placeholder="Motivo o detalles del movimiento..."
                rows={3}
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