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
import { Plus, Package, Calendar, Barcode, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function Existencias() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado simplificado para escaneo rápido
  const [scanData, setScanData] = useState({
    codigo_barras: '',
    cantidad_actual: '',
    id_medicamento: null as number | null,
    nombre_medicamento: ''
  });

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
      toast.success(`Medicamento detectado: ${medEncontrado.nombre}`);
    } else {
      setScanData({ ...scanData, codigo_barras: code, id_medicamento: null, nombre_medicamento: '' });
      toast.error('Código no registrado en el catálogo');
    }
  };

  const mutation = useMutation({
    mutationFn: async (newData: any) => {
      // Usamos el campo codigo_referencia para el lote/barras según tu DB
      const existencia = await storage.saveExistencia({
        id_medicamento: newData.id_medicamento,
        codigo_barras: newData.codigo_barras, 
        cantidad_actual: newData.cantidad_actual,
        fecha_registro: new Date().toISOString().split('T')[0]
      });
      
      await storage.registrarMovimiento(existencia.id_existencia, 'entrada', newData.cantidad_actual, 1, 'Carga por escaneo');
      return existencia;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['existencias'] });
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

  if (loadingEx) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Control de Inventario Real</h2>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-blue-600">
          <Barcode className="w-4 h-4 mr-2" /> Escaneo Rápido
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Input 
            placeholder="Filtrar inventario por nombre o código..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </CardContent>
      </Card>

      {/* Visualización de Lotes (Igual a tu diseño previo) */}
      {/* ... (aquí va el mapeo de existenciasPorMedicamento que ya tenías) */}

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
                <AlertCircle className="w-4 h-4" /> Código no encontrado en el sistema.
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
              <Button type="submit" className="w-full" disabled={!scanData.id_medicamento || mutation.isPending}>
                {mutation.isPending ? 'Sincronizando...' : 'Cargar al Inventario'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}