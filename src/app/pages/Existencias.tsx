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
import { Plus, Package, Calendar, Loader2, AlertCircle, Beaker, Layers, Search, Check, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export function Existencias() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [scanData, setScanData] = useState({
    input_busqueda: '',
    concentracion: '',      
    cantidad_actual: '',
    sede: '', // Nuevo campo para la sede
    id_medicamento: null as number | null,
    nombre_medicamento: ''
  });

  // --- CARGA DE DATOS ---
  const { data: existencias = [], isLoading: loadingEx } = useQuery({
    queryKey: ['existencias'],
    queryFn: () => storage.getExistencias(),
  });

  const { data: medicamentos = [] } = useQuery({
    queryKey: ['medicamentos'],
    queryFn: () => storage.getMedicamentos(),
  });

  // --- BÚSQUEDA ---
  const handleBusquedaProducto = (value: string) => {
    setScanData(prev => ({ ...prev, input_busqueda: value }));
    const cleanValue = value.trim().toLowerCase();

    if (!cleanValue) {
      setScanData(prev => ({ ...prev, id_medicamento: null, nombre_medicamento: '' }));
      return;
    }

    const porCodigo = medicamentos.find(m => m.codigo_barras && m.codigo_barras.trim().toLowerCase() === cleanValue);

    if (porCodigo) {
      setScanData(prev => ({
        ...prev,
        id_medicamento: porCodigo.id_medicamento,
        nombre_medicamento: porCodigo.nombre
      }));
      toast.success(`Producto detectado: ${porCodigo.nombre}`);
    }
  };

  const seleccionarMedicamento = (med: Medicamento) => {
    setScanData(prev => ({
      ...prev,
      input_busqueda: med.nombre,
      id_medicamento: med.id_medicamento,
      nombre_medicamento: med.nombre
    }));
    toast.success(`Seleccionado: ${med.nombre}`);
  };

  const sugerencias = scanData.input_busqueda.trim() && !scanData.id_medicamento
    ? medicamentos
        .filter(m => m.activo && m.nombre.toLowerCase().includes(scanData.input_busqueda.toLowerCase()))
        .slice(0, 3) 
    : [];

  // --- MUTACIÓN ---
  const mutation = useMutation({
    mutationFn: async (newData: any) => {
      const existencia = await storage.saveExistencia({
        id_medicamento: newData.id_medicamento,
        concentracion: newData.concentracion.trim(), 
        cantidad_actual: parseInt(newData.cantidad_actual),
        sede: newData.sede, // Enviamos la sede al backend
        fecha_registro: new Date().toISOString().split('T')[0]
      });
      
      await storage.registrarMovimiento(
        existencia.id_existencia, 
        'entrada', 
        parseInt(newData.cantidad_actual), 
        1, 
        `Ingreso en ${newData.sede}: ${newData.concentracion}`
      );
      return existencia;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['medicamentos'] }),
        queryClient.invalidateQueries({ queryKey: ['existencias'] }),
        queryClient.invalidateQueries({ queryKey: ['inventario-completo'] }),
        queryClient.invalidateQueries({ queryKey: ['movimientos'] })
      ]);

      toast.success('Existencias actualizadas correctamente');
      closeDialog();
    },
    onError: () => toast.error('Error al guardar existencias')
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanData.id_medicamento || !scanData.cantidad_actual || !scanData.concentracion || !scanData.sede) {
      toast.error('Complete todos los campos, incluyendo la sede');
      return;
    }
    mutation.mutate(scanData);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setScanData({ 
      input_busqueda: '', 
      concentracion: '', 
      cantidad_actual: '', 
      sede: '',
      id_medicamento: null, 
      nombre_medicamento: '' 
    });
  };

  const getMedicamentoInfo = (id: number) => medicamentos.find(m => m.id_medicamento === id);

  // --- FILTRADO ---
  const filteredExistencias = existencias.filter(e => {
    const med = getMedicamentoInfo(e.id_medicamento);
    if (!med || !med.activo) return false;
    const term = searchTerm.toLowerCase();
    return (
      med.nombre.toLowerCase().includes(term) ||
      e.concentracion.toLowerCase().includes(term) ||
      e.sede.toLowerCase().includes(term)
    );
  });

  const existenciasPorMedicamento = filteredExistencias.reduce((acc, existencia) => {
    const medId = existencia.id_medicamento;
    if (!acc[medId]) acc[medId] = [];
    acc[medId].push(existencia);
    return acc;
  }, {} as Record<number, Existencia[]>);

  if (loadingEx) return <div className="flex flex-col items-center justify-center p-20"><Loader2 className="animate-spin w-10 h-10 text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Existencias por Sede</h2>
          <p className="text-gray-600 mt-1">Control de inventario por ubicación y presentación</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 shadow-md">
          <Plus className="w-4 h-4 mr-2" /> Nueva Entrada
        </Button>
      </div>

      <Card className="border-none shadow-sm bg-slate-50/50">
        <CardContent className="pt-6">
          <Input 
            placeholder="Buscar por nombre, concentración o sede..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="bg-white"
          />
        </CardContent>
      </Card>

      <div className="grid gap-6">
        {Object.entries(existenciasPorMedicamento).map(([medId, exs]) => {
          const medicamento = getMedicamentoInfo(parseInt(medId));
          if (!medicamento) return null;
          
          const cantidadTotal = exs.reduce((sum, e) => sum + e.cantidad_actual, 0);
          const bajoStock = cantidadTotal <= medicamento.stock_minimo;
          
          return (
            <Card key={medId} className={bajoStock ? "border-red-200 shadow-md" : "shadow-sm border-slate-200"}>
              <CardHeader className="pb-2 bg-slate-50/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white border">
                      <Package className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold">{medicamento.nombre}</CardTitle>
                      <Badge variant="secondary" className="mt-1 text-[10px] uppercase">{medicamento.tipo_medicamento}</Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-black ${bajoStock ? 'text-red-600' : 'text-emerald-600'}`}>{cantidadTotal}</p>
                    {bajoStock && <Badge variant="destructive" className="text-[10px]">Stock Crítico Global</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6 w-[35%]">Presentación</TableHead>
                      <TableHead className="w-[30%]">Sede / Ubicación</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead className="text-right pr-6">Registro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exs.map((e) => (
                      <TableRow key={e.id_existencia}>
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-2">
                            <Beaker className="w-3 h-3 text-slate-400" />
                            <span className="font-medium text-slate-700">{e.concentracion}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3 h-3 text-blue-400" />
                            <span className="text-xs font-bold text-slate-600">{e.sede}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-slate-900">{e.cantidad_actual}</TableCell>
                        <TableCell className="text-slate-500 text-[10px] text-right pr-6 uppercase">
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
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Registrar Ingreso de Stock</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            
            <div className="space-y-2">
              <Label className="font-bold text-slate-700">1. Buscar Producto</Label>
              <Input 
                autoFocus 
                placeholder="Escanee código o escriba nombre..."
                value={scanData.input_busqueda}
                onChange={(e) => handleBusquedaProducto(e.target.value)}
                className="bg-slate-50"
              />
            </div>

            {sugerencias.length > 0 && (
              <div className="bg-slate-50 p-2 rounded-lg border divide-y">
                {sugerencias.map((m) => (
                  <div key={m.id_medicamento} onClick={() => seleccionarMedicamento(m)} className="flex justify-between items-center py-2 px-1 cursor-pointer hover:bg-blue-50 rounded">
                    <span className="text-xs font-bold">{m.nombre}</span>
                    <span className="text-[10px] bg-slate-200 px-2 rounded uppercase">{m.tipo_medicamento}</span>
                  </div>
                ))}
              </div>
            )}

            {scanData.id_medicamento && (
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <p className="text-xs text-emerald-800 font-bold">Seleccionado: {scanData.nombre_medicamento}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="font-bold text-slate-700">2. Sede de Almacenamiento</Label>
              <Select 
                value={scanData.sede} 
                onValueChange={(v) => setScanData({...scanData, sede: v})}
                disabled={!scanData.id_medicamento}
              >
                <SelectTrigger className="bg-slate-50"><SelectValue placeholder="¿En qué sede ingresa?" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Centro Comunitario">Centro Comunitario</SelectItem>
                  <SelectItem value="Nueva Esperanza">Nueva Esperanza</SelectItem>
                  <SelectItem value="Sonoyta">Sonoyta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">3. Concentración</Label>
                <Input 
                  placeholder="Ej: 500mg"
                  value={scanData.concentracion}
                  onChange={e => setScanData({...scanData, concentracion: e.target.value})}
                  disabled={!scanData.id_medicamento}
                  className="bg-slate-50"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">4. Cantidad</Label>
                <Input 
                  type="number" 
                  placeholder="0" 
                  value={scanData.cantidad_actual}
                  onChange={e => setScanData({...scanData, cantidad_actual: e.target.value})}
                  disabled={!scanData.id_medicamento}
                  className="bg-slate-50"
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 h-12 shadow-lg" 
                disabled={!scanData.id_medicamento || !scanData.concentracion || !scanData.sede || mutation.isPending}
              >
                {mutation.isPending ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2 w-5 h-5" />}
                Confirmar Ingreso
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}