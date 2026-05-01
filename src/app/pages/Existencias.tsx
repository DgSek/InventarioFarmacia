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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Package, Calendar, Barcode, Loader2, AlertCircle, Beaker, Layers, Search, Check } from 'lucide-react';
import { toast } from 'sonner';

export function Existencias() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [scanData, setScanData] = useState({
    input_busqueda: '',
    concentracion: '',      
    cantidad_actual: '',
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

  // --- BÚSQUEDA SEGURA ---
  const handleBusquedaProducto = (value: string) => {
    // Actualizamos el texto escrito sin borrar la selección previa de inmediato
    setScanData(prev => ({ ...prev, input_busqueda: value }));
    const cleanValue = value.trim().toLowerCase();

    if (!cleanValue) {
      setScanData(prev => ({ ...prev, id_medicamento: null, nombre_medicamento: '' }));
      return;
    }

    // Coincidencia EXACTA por código de barras (único caso donde se autoselecciona)
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

  // Función para cuando el usuario hace clic manualmente en la sugerencia correcta
  const seleccionarMedicamento = (med: Medicamento) => {
    setScanData(prev => ({
      ...prev,
      input_busqueda: med.nombre,
      id_medicamento: med.id_medicamento,
      nombre_medicamento: med.nombre
    }));
    toast.success(`Seleccionado: ${med.nombre}`);
  };

  // Filtrar sugerencias en tiempo real basadas en lo que se escribe
  const sugerencias = scanData.input_busqueda.trim() && !scanData.id_medicamento
    ? medicamentos
        .filter(m => m.activo && m.nombre.toLowerCase().includes(scanData.input_busqueda.toLowerCase()))
        .slice(0, 3) // Mostramos máximo 3 para no saturar la vista
    : [];

  // --- MUTACIÓN ---
  const mutation = useMutation({
    mutationFn: async (newData: any) => {
      const existencia = await storage.saveExistencia({
        id_medicamento: newData.id_medicamento,
        concentracion: newData.concentracion.trim(), 
        cantidad_actual: parseInt(newData.cantidad_actual),
        fecha_registro: new Date().toISOString().split('T')[0]
      });
      
      await storage.registrarMovimiento(
        existencia.id_existencia, 
        'entrada', 
        parseInt(newData.cantidad_actual), 
        1, 
        `Ingreso de presentación: ${newData.concentracion}`
      );
      return existencia;
    },
    onSuccess: async () => {
      await new Promise(resolve => setTimeout(resolve, 500)); 

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['medicamentos'] }),
        queryClient.invalidateQueries({ queryKey: ['existencias'] }),
        queryClient.invalidateQueries({ queryKey: ['inventario-completo'] }),
        queryClient.invalidateQueries({ queryKey: ['movimientos'] })
      ]);

      toast.success('Existencias actualizadas');
      closeDialog();
    },
    onError: (error: any) => {
      console.error(error);
      toast.error('Error al guardar en el servidor');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanData.id_medicamento || !scanData.cantidad_actual || !scanData.concentracion) {
      toast.error('Complete todos los campos antes de confirmar');
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
      id_medicamento: null, 
      nombre_medicamento: '' 
    });
  };

  const getMedicamentoInfo = (id: number) => medicamentos.find(m => m.id_medicamento === id);

  // --- FILTRADO DE TABLA ---
  const filteredExistencias = existencias.filter(e => {
    const med = getMedicamentoInfo(e.id_medicamento);
    if (!med || !med.activo) return false;
    const term = searchTerm.toLowerCase();
    return (
      med.nombre.toLowerCase().includes(term) ||
      (e.concentracion && e.concentracion.toLowerCase().includes(term))
    );
  });

  const existenciasPorMedicamento = filteredExistencias.reduce((acc, existencia) => {
    const medId = existencia.id_medicamento;
    if (!acc[medId]) acc[medId] = [];
    acc[medId].push(existencia);
    return acc;
  }, {} as Record<number, Existencia[]>);

  if (loadingEx) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
      <p className="text-slate-500 font-medium">Sincronizando inventario...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Existencias por Presentación</h2>
          <p className="text-gray-600 mt-1">Gestión de stock basada en concentración</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 shadow-md">
          <Plus className="w-4 h-4 mr-2" /> Nueva Presentación
        </Button>
      </div>

      <Card className="border-none shadow-sm bg-slate-50/50">
        <CardContent className="pt-6">
          <Input 
            placeholder="Buscar por medicamento o concentración..." 
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
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white border shadow-xs">
                      <Package className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold">{medicamento.nombre}</CardTitle>
                      <Badge variant="secondary" className="mt-1 text-[10px] uppercase">{medicamento.tipo_medicamento}</Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-black ${bajoStock ? 'text-red-600' : 'text-emerald-600'}`}>
                      {cantidadTotal}
                    </p>
                    {bajoStock && <Badge variant="destructive" className="text-[10px] animate-pulse">Stock Crítico</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6 w-[40%]">Concentración / Presentación</TableHead>
                      <TableHead>Stock Actual</TableHead>
                      <TableHead className="text-right pr-6">Último Ingreso</TableHead>
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
                        <TableCell className="font-bold text-slate-900">{e.cantidad_actual}</TableCell>
                        <TableCell className="text-slate-500 text-xs text-right pr-6">
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
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Registro de Entrada de Stock</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-600" /> 1. Código o Nombre del Producto
              </Label>
              <Input 
                autoFocus 
                placeholder="Escanee código o escriba nombre..."
                value={scanData.input_busqueda}
                onChange={(e) => handleBusquedaProducto(e.target.value)}
                className="bg-slate-50 border-slate-300"
              />
            </div>

            {/* Panel de selección si hay coincidencias por texto */}
            {sugerencias.length > 0 && (
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 divide-y divide-slate-200">
                <p className="text-[10px] text-slate-400 font-bold mb-1 px-1">¿Quiso decir alguno de estos?</p>
                {sugerencias.map((m) => (
                  <div 
                    key={m.id_medicamento} 
                    onClick={() => seleccionarMedicamento(m)}
                    className="flex justify-between items-center py-2 px-1 cursor-pointer hover:bg-blue-50 rounded transition-colors"
                  >
                    <span className="text-xs font-bold text-slate-700">{m.nombre}</span>
                    <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded text-slate-600 uppercase">{m.tipo_medicamento}</span>
                  </div>
                ))}
              </div>
            )}

            {scanData.id_medicamento ? (
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 flex items-center gap-3">
                <div className="bg-emerald-500 p-2 rounded-full text-white"><Check className="w-4 h-4" /></div>
                <p className="text-xs text-emerald-800 font-bold">Medicamento: {scanData.nombre_medicamento}</p>
              </div>
            ) : scanData.input_busqueda && sugerencias.length === 0 && (
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 flex items-center gap-2 text-amber-700 text-xs font-medium">
                <AlertCircle className="w-4 h-4" /> No encontrado en catálogo.
              </div>
            )}

            <div className="space-y-2">
              <Label className="font-bold text-slate-700 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" /> 2. Concentración / Variante
              </Label>
              <Input 
                className="bg-slate-50 border-slate-300" 
                placeholder="Ej: 500mg, 1g, 10ml..."
                value={scanData.concentracion}
                onChange={e => setScanData({...scanData, concentracion: e.target.value})}
                disabled={!scanData.id_medicamento}
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-slate-700">3. Cantidad a Ingresar</Label>
              <Input 
                type="number" 
                placeholder="0" 
                value={scanData.cantidad_actual}
                onChange={e => setScanData({...scanData, cantidad_actual: e.target.value})}
                disabled={!scanData.id_medicamento}
                className="bg-slate-50 border-slate-300"
              />
            </div>

            <DialogFooter className="pt-4">
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 shadow-lg transition-all" 
                disabled={!scanData.id_medicamento || !scanData.concentracion || mutation.isPending}
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