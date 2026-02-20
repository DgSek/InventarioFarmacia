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
import { Plus, Package, Calendar, Barcode, Loader2, AlertCircle, Hash } from 'lucide-react';
import { toast } from 'sonner';

export function Existencias() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [scanData, setScanData] = useState({
    codigo_barras: '',
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

  // --- LÓGICA DE ESCANEO ---
  const handleScan = (code: string) => {
    const medEncontrado = medicamentos.find(m => m.codigo_barras === code);
    if (medEncontrado) {
      setScanData({
        ...scanData,
        codigo_barras: code,
        id_medicamento: medEncontrado.id_medicamento,
        nombre_medicamento: medEncontrado.nombre
      });
    } else {
      setScanData({ ...scanData, codigo_barras: code, id_medicamento: null, nombre_medicamento: '' });
    }
  };

  const mutation = useMutation({
    mutationFn: async (newData: any) => {
      const existencia = await storage.saveExistencia({
        id_medicamento: newData.id_medicamento,
        codigo_barras: newData.codigo_barras, // IMPORTANTE: codigo_referencia para la DB
        cantidad_actual: parseInt(newData.cantidad_actual),
        fecha_registro: new Date().toISOString().split('T')[0]
      });
      
      await storage.registrarMovimiento(existencia.id_existencia, 'entrada', parseInt(newData.cantidad_actual), 1, 'Carga por escaneo');
      return existencia;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['existencias'] });
      queryClient.invalidateQueries({ queryKey: ['inventario-completo'] });
      toast.success('Inventario actualizado');
      closeDialog();
    },
    onError: () => toast.error('Error de comunicación con Ubuntu')
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanData.id_medicamento || !scanData.cantidad_actual) return;
    mutation.mutate(scanData);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setScanData({ codigo_barras: '', cantidad_actual: '', id_medicamento: null, nombre_medicamento: '' });
  };

  // --- LÓGICA DE VISUALIZACIÓN (Lo que faltaba) ---
  const getMedicamentoInfo = (id: number) => medicamentos.find(m => m.id_medicamento === id);

  const filteredExistencias = existencias.filter(e => {
    const med = getMedicamentoInfo(e.id_medicamento);
    const term = searchTerm.toLowerCase();
    return (
      med?.nombre.toLowerCase().includes(term) ||
      e.codigo_barras?.toLowerCase().includes(term)
    );
  });

  const existenciasPorMedicamento = filteredExistencias.reduce((acc, existencia) => {
    const medId = existencia.id_medicamento;
    if (!acc[medId]) acc[medId] = [];
    acc[medId].push(existencia);
    return acc;
  }, {} as Record<number, Existencia[]>);

  if (loadingEx) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Control de Existencias</h2>
          <p className="text-gray-600 mt-1">Gestión de lotes activos en el sistema</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Barcode className="w-4 h-4 mr-2" /> Escaneo Rápido
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Input 
            placeholder="Filtrar por nombre o código de lote..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </CardContent>
      </Card>

      {/* RENDERIZADO DE LA LISTA DE EXISTENCIAS */}
      <div className="grid gap-6">
        {Object.entries(existenciasPorMedicamento).map(([medId, exs]) => {
          const medicamento = getMedicamentoInfo(parseInt(medId));
          if (!medicamento) return null;
          
          const cantidadTotal = exs.reduce((sum, e) => sum + e.cantidad_actual, 0);
          const bajoStock = cantidadTotal <= medicamento.stock_minimo;
          
          return (
            <Card key={medId} className={bajoStock ? "border-red-200 shadow-sm" : "shadow-sm"}>
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
                    <p className={`text-2xl font-bold ${bajoStock ? 'text-red-600' : 'text-emerald-600'}`}>
                      {cantidadTotal}
                    </p>
                    {bajoStock && <Badge variant="destructive" className="text-[10px]">Stock Crítico</Badge>}
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
                        <TableCell className="font-mono text-xs"><Hash className="inline w-3 h-3 mr-1"/>{e.codigo_barras}</TableCell>
                        <TableCell className="font-semibold">{e.cantidad_actual}</TableCell>
                        <TableCell className="text-slate-500 text-xs">
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

      {/* MODAL DE ESCANEO RÁPIDO */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Entrada por Escáner</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Código de Barras</Label>
              <Input 
                autoFocus 
                placeholder="Dispare el lector aquí..."
                value={scanData.codigo_barras}
                onChange={(e) => handleScan(e.target.value)}
              />
            </div>

            {scanData.id_medicamento ? (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-sm text-green-700 font-bold flex items-center gap-2">
                  <Package className="w-4 h-4" /> Producto: {scanData.nombre_medicamento}
                </p>
              </div>
            ) : scanData.codigo_barras && (
              <div className="bg-red-50 p-4 rounded-lg border border-red-200 flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4" /> Código no registrado.
              </div>
            )}

            <div className="space-y-2">
              <Label>Cantidad que ingresa</Label>
              <Input 
                type="number" 
                placeholder="0" 
                value={scanData.cantidad_actual}
                onChange={e => setScanData({...scanData, cantidad_actual: e.target.value})}
                disabled={!scanData.id_medicamento}
              />
            </div>

            <DialogFooter>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={!scanData.id_medicamento || mutation.isPending}>
                {mutation.isPending ? 'Sincronizando...' : 'Cargar al Inventario'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}