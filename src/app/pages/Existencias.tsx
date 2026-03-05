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
import { Plus, Package, Calendar, Barcode, Loader2, AlertCircle, Hash, Tag } from 'lucide-react';
import { toast } from 'sonner';

export function Existencias() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado inicial de escaneo
  const [scanData, setScanData] = useState({
    codigo_barras_producto: '', 
    codigo_referencia: '',      
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

  // --- ESCANEO DE PRODUCTO (CATÁLOGO) ---
  const handleScanProducto = (code: string) => {
    const medEncontrado = medicamentos.find(m => m.codigo_barras === code);
    if (medEncontrado) {
      setScanData({
        ...scanData,
        codigo_barras_producto: code,
        id_medicamento: medEncontrado.id_medicamento,
        nombre_medicamento: medEncontrado.nombre
      });
      toast.success(`Producto detectado: ${medEncontrado.nombre}`);
    } else {
      setScanData({ ...scanData, codigo_barras_producto: code, id_medicamento: null, nombre_medicamento: '' });
    }
  };

  // --- MUTACIÓN CON REFRESCO AUTOMÁTICO ---
  const mutation = useMutation({
    mutationFn: async (newData: any) => {
      const loteFormateado = `LOTE-${newData.codigo_referencia.trim().toUpperCase()}`;

      // 1. Guardar o actualizar existencia en PostgreSQL
      const existencia = await storage.saveExistencia({
        id_medicamento: newData.id_medicamento,
        codigo_referencia: loteFormateado, 
        cantidad_actual: parseInt(newData.cantidad_actual),
        fecha_registro: new Date().toISOString().split('T')[0]
      });
      
      // 2. Registrar movimiento en el historial
      await storage.registrarMovimiento(
        existencia.id_existencia, 
        'entrada', 
        parseInt(newData.cantidad_actual), 
        1, 
        `Sincronización de stock: ${loteFormateado}`
      );
      return existencia;
    },
    onSuccess: () => {
      // REFRESCO CRÍTICO: Obliga a React Query a traer los datos nuevos del servidor
      queryClient.invalidateQueries({ queryKey: ['existencias'] });
      queryClient.invalidateQueries({ queryKey: ['medicamentos'] });
      queryClient.invalidateQueries({ queryKey: ['inventario-completo'] });
      queryClient.invalidateQueries({ queryKey: ['movimientos'] });

      toast.success('Inventario sincronizado con éxito');
      closeDialog();
    },
    onError: (error: any) => {
      console.error(error);
      toast.error('Error al guardar: Verifique la conexión con el servidor');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanData.id_medicamento || !scanData.cantidad_actual || !scanData.codigo_referencia) {
      toast.error('Por favor complete el número de lote y la cantidad');
      return;
    }
    mutation.mutate(scanData);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setScanData({ 
      codigo_barras_producto: '', 
      codigo_referencia: '', 
      cantidad_actual: '', 
      id_medicamento: null, 
      nombre_medicamento: '' 
    });
  };

  const getMedicamentoInfo = (id: number) => medicamentos.find(m => m.id_medicamento === id);

  // --- FILTRADO DE VISTA ---
  const filteredExistencias = existencias.filter(e => {
    const med = getMedicamentoInfo(e.id_medicamento);
    if (!med || !med.activo) return false;
    const term = searchTerm.toLowerCase();
    return (
      med.nombre.toLowerCase().includes(term) ||
      (e.codigo_referencia && e.codigo_referencia.toLowerCase().includes(term))
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
      <p className="text-slate-500 font-medium">Actualizando inventario...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Control de Existencias</h2>
          <p className="text-gray-600 mt-1">Gestión de lotes y stock en tiempo real</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Barcode className="w-4 h-4 mr-2" /> Escaneo Rápido
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Input 
            placeholder="Buscar por medicamento o número de lote..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
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
            <Card key={medId} className={bajoStock ? "border-red-200 shadow-sm" : "shadow-sm border-slate-200"}>
              <CardHeader className="pb-2 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white border border-slate-200 shadow-sm">
                      <Package className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-800">{medicamento.nombre}</CardTitle>
                      <Badge variant="secondary" className="mt-1 text-[10px]">{medicamento.tipo_medicamento}</Badge>
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
                  <TableHeader className="bg-white">
                    <TableRow>
                      <TableHead className="w-[40%] pl-6">Lote / Referencia</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead className="text-right pr-6">Fecha Registro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exs.map((e) => (
                      <TableRow key={e.id_existencia}>
                        <TableCell className="font-mono text-xs pl-6">
                          <Hash className="inline w-3 h-3 mr-2 text-slate-400"/>
                          {e.codigo_referencia || 'SIN LOTE'}
                        </TableCell>
                        <TableCell className="font-bold text-slate-700">{e.cantidad_actual}</TableCell>
                        <TableCell className="text-slate-500 text-xs text-right pr-6">
                          <Calendar className="inline w-3 h-3 mr-2"/>
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
          <DialogHeader><DialogTitle>Entrada por Escáner</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2 font-bold text-slate-700"><Barcode className="w-4 h-4 text-blue-600" /> 1. Escanee Producto</Label>
              <Input 
                autoFocus 
                placeholder="Dispare el lector aquí..."
                value={scanData.codigo_barras_producto}
                onChange={(e) => handleScanProducto(e.target.value)}
                className="bg-slate-50"
              />
            </div>

            {scanData.id_medicamento ? (
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                <p className="text-xs text-emerald-700 font-bold flex items-center gap-2">
                  <Package className="w-4 h-4" /> Detectado: {scanData.nombre_medicamento}
                </p>
              </div>
            ) : scanData.codigo_barras_producto && (
              <div className="bg-red-50 p-3 rounded-lg border border-red-200 flex items-center gap-2 text-red-700 text-xs">
                <AlertCircle className="w-4 h-4" /> El producto no está en el catálogo.
              </div>
            )}

            <div className="space-y-2">
              <Label className="flex items-center gap-2 font-bold text-slate-700"><Tag className="w-4 h-4 text-blue-600" /> 2. Número de Lote</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-black text-sm select-none">LOTE-</span>
                <Input 
                  className="pl-14 bg-slate-50" 
                  placeholder="Ej: 001"
                  value={scanData.codigo_referencia}
                  onChange={e => setScanData({...scanData, codigo_referencia: e.target.value})}
                  disabled={!scanData.id_medicamento}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-slate-700">3. Cantidad que ingresa</Label>
              <Input 
                type="number" 
                placeholder="0" 
                value={scanData.cantidad_actual}
                onChange={e => setScanData({...scanData, cantidad_actual: e.target.value})}
                disabled={!scanData.id_medicamento}
                className="bg-slate-50"
              />
            </div>

            <DialogFooter className="pt-4">
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 shadow-lg transition-all" 
                disabled={!scanData.id_medicamento || !scanData.codigo_referencia || mutation.isPending}
              >
                {mutation.isPending ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2 w-5 h-5" />}
                Cargar al Inventario
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}