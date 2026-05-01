import { useState, useRef, useEffect } from 'react';
import { storage } from '../data/storage';
import { Movimiento, Existencia, Medicamento, TipoMovimiento, SalidaInsumo, Insumo } from '../types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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
import { Plus, ArrowUpCircle, ArrowDownCircle, XCircle, User, Loader2, Barcode, Package, Box, ClipboardList, Search, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function Movimientos() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [scanBuffer, setScanBuffer] = useState('');
  const [selectedMedId, setSelectedMedId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    id_existencia: '',
    tipo_movimiento: 'salida' as TipoMovimiento,
    cantidad: '',
    observaciones: '',
    folio: '', 
  });

  useEffect(() => {
    if (isDialogOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isDialogOpen]);

  // --- CARGA DE DATOS ---
  const { data: foliosActivos = [] } = useQuery({
    queryKey: ['folios-activos'],
    queryFn: () => storage.getFoliosActivos(),
  });

  const { data: movimientos = [], isLoading: loadingMovs } = useQuery({
    queryKey: ['movimientos'],
    queryFn: async () => {
      const res = await storage.getMovimientos();
      return Array.isArray(res) ? res : [];
    },
  });

  const { data: salidasInsumos = [], isLoading: loadingSalidasIns } = useQuery({
    queryKey: ['salidas-insumos'],
    queryFn: () => storage.getSalidasInsumos(),
  });

  const { data: insumos = [] } = useQuery({
    queryKey: ['insumos'],
    queryFn: () => storage.getInsumos(),
  });

  const { data: existencias = [] } = useQuery({
    queryKey: ['existencias'],
    queryFn: () => storage.getExistencias(),
  });

  const { data: medicamentos = [] } = useQuery({
    queryKey: ['medicamentos'],
    queryFn: () => storage.getMedicamentos(),
  });

  const { data: usuarioActual } = useQuery({
    queryKey: ['usuario-actual'],
    queryFn: () => storage.getCurrentUser(),
  });

  const mutation = useMutation({
    mutationFn: (newData: any) => storage.registrarMovimiento(
      newData.id_existencia,
      newData.tipo_movimiento,
      newData.cantidad,
      newData.id_usuario,
      newData.observaciones,
      newData.folio 
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      queryClient.invalidateQueries({ queryKey: ['existencias'] });
      queryClient.invalidateQueries({ queryKey: ['inventario-completo'] });
      toast.success('Movimiento registrado correctamente');
      closeDialog();
    },
    onError: () => toast.error('Error al registrar movimiento'),
  });

  // --- BÚSQUEDA HÍBRIDA SEGURA ---
  const handleBusquedaProducto = (value: string) => {
    setScanBuffer(value);
    const cleanValue = value.trim().toLowerCase();

    if (!cleanValue) {
      setSelectedMedId(null);
      setFormData(prev => ({ ...prev, id_existencia: '' }));
      return;
    }

    // Buscar coincidencia exacta por código de barras
    const porCodigo = medicamentos.find(m => m.codigo_barras && m.codigo_barras.trim().toLowerCase() === cleanValue);

    if (porCodigo) {
      setSelectedMedId(porCodigo.id_medicamento);
      toast.success(`Producto detectado: ${porCodigo.nombre}`);
      
      // Auto-seleccionar el lote si tiene stock único disponible
      const loteConStock = existencias.find(ex =>
        ex.id_medicamento === porCodigo.id_medicamento && ex.cantidad_actual > 0
      );
      if (loteConStock) {
        setFormData(prev => ({ ...prev, id_existencia: loteConStock.id_existencia.toString() }));
      }
    }
  };

  const seleccionarMedicamentoManual = (med: Medicamento) => {
    setSelectedMedId(med.id_medicamento);
    setScanBuffer(med.nombre);
    setFormData(prev => ({ ...prev, id_existencia: '' }));
    toast.success(`Seleccionado: ${med.nombre}`);
  };

  // Filtrado de sugerencias de texto sin autoselección inmediata
  const sugerenciasMed = scanBuffer.trim() && !selectedMedId
    ? medicamentos
        .filter(m => m.activo && m.nombre.toLowerCase().includes(scanBuffer.toLowerCase()))
        .slice(0, 3)
    : [];

  // --- HELPERS ---
  const getMedicamentoNombre = (idExistencia: number) => {
    const ex = existencias.find(e => e.id_existencia === idExistencia);
    if (!ex) return '---';
    const med = medicamentos.find(m => m.id_medicamento === ex.id_medicamento);
    return med ? med.nombre : 'No encontrado';
  };

  const getInsumoNombre = (idInsumo: number) => {
    const ins = insumos.find(i => i.id_insumo === idInsumo);
    return ins ? ins.nombre_insumo : 'Insumo no identificado';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cant = parseInt(formData.cantidad);
    const exId = parseInt(formData.id_existencia);
    if (!exId || isNaN(cant)) {
      toast.error('Datos incompletos');
      return;
    }

    mutation.mutate({
      id_existencia: exId,
      tipo_movimiento: formData.tipo_movimiento,
      cantidad: cant,
      id_usuario: usuarioActual?.id_usuario || 1,
      observaciones: formData.observaciones,
      folio: formData.folio 
    });
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setFormData({ id_existencia: '', tipo_movimiento: 'salida', cantidad: '', observaciones: '', folio: '' });
    setScanBuffer('');
    setSelectedMedId(null);
  };

  // Filtrar las existencias por el ID del medicamento seleccionado
  const existenciasFiltradas = selectedMedId
    ? existencias.filter(ex => ex.id_medicamento === selectedMedId)
    : [];

  if (loadingMovs || loadingSalidasIns) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Historial de Movimientos</h2>
          <p className="text-gray-600 mt-1">Auditoría de inventario en tiempo real</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-[#4796B7] hover:bg-[#3a7da1]">
          <Plus className="w-4 h-4 mr-2" /> Nuevo Registro Med.
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-1">
          <CardContent className="pt-6">
            <Label>Filtrar Operación</Label>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los registros</SelectItem>
                <SelectItem value="entrada">Entradas (+)</SelectItem>
                <SelectItem value="salida">Salidas (-)</SelectItem>
                <SelectItem value="caducado">Bajas / Caducados</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 bg-slate-50/50">
          <CardContent className="flex justify-around items-center h-full pt-6">
            <div className="text-center">
              <p className="text-[10px] uppercase font-bold text-emerald-600">Entradas</p>
              <p className="text-2xl font-bold">{movimientos.filter(m => m.tipo_movimiento === 'entrada').length}</p>
            </div>
            <div className="text-center border-x px-12">
              <p className="text-[10px] uppercase font-bold text-blue-600">Salidas</p>
              <p className="text-2xl font-bold">{movimientos.filter(m => m.tipo_movimiento === 'salida').length + salidasInsumos.length}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase font-bold text-slate-500">Total Insumos</p>
              <p className="text-2xl font-bold">{insumos.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="border-b" style={{ borderColor: 'rgba(58, 53, 51, 0.1)' }}>
        <Tabs defaultValue="medicamentos" className="w-full">
          <TabsList className="h-auto bg-transparent p-0 border-0 gap-8 w-auto rounded-none">
            <TabsTrigger value="medicamentos" className="flex items-center gap-2 px-1 pb-3 pt-0 rounded-none bg-transparent border-b-2 text-slate-400 data-[state=active]:border-b-[#4796B7] data-[state=active]:text-[#4796B7] data-[state=active]:shadow-none focus-visible:ring-0">
              <Package className="w-4 h-4" />
              <span>Medicamentos</span>
            </TabsTrigger>
            <TabsTrigger value="insumos" className="flex items-center gap-2 px-1 pb-3 pt-0 rounded-none bg-transparent border-b-2 text-slate-400 data-[state=active]:border-b-[#4796B7] data-[state=active]:text-[#4796B7] data-[state=active]:shadow-none focus-visible:ring-0">
              <Box className="w-4 h-4" />
              <span>Salidas de Insumos</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="medicamentos" className="mt-6">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Folio</TableHead>
                      <TableHead>Insumo / Medicamento</TableHead>
                      <TableHead>Operación</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Responsable</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimientos
                      .filter(m => filterTipo === 'todos' || m.tipo_movimiento === filterTipo)
                      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                      .map((m) => (
                        <TableRow key={m.id_movimiento}>
                          <TableCell className="text-xs font-mono">{new Date(m.fecha).toLocaleString()}</TableCell>
                          <TableCell>
                            {m.folio ? (
                              <Badge variant="secondary" className="font-mono text-[10px] bg-slate-100">
                                Fol-2026-{m.folio}
                              </Badge>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-900">
                                {getMedicamentoNombre(m.id_existencia)}
                                <span className="ml-1 text-blue-600 font-bold">
                                  ({existencias.find(e => e.id_existencia === m.id_existencia)?.concentracion})
                                </span>
                              </span>
                              <span className="text-[10px] text-slate-400 italic truncate max-w-[150px]">{m.observaciones}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize bg-white">
                              {m.tipo_movimiento === 'entrada' ? <ArrowUpCircle className="w-3 h-3 mr-1 text-emerald-500" /> :
                                m.tipo_movimiento === 'salida' ? <ArrowDownCircle className="w-3 h-3 mr-1 text-blue-500" /> :
                                  <XCircle className="w-3 h-3 mr-1 text-red-500" />}
                              {m.tipo_movimiento}
                            </Badge>
                          </TableCell>
                          <TableCell className={m.tipo_movimiento === 'entrada' ? 'text-emerald-600 font-bold' : 'text-blue-600 font-bold'}>
                            {m.tipo_movimiento === 'entrada' ? '+' : '-'}{m.cantidad}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            <User className="inline w-3 h-3 mr-1" />
                            {usuarioActual?.nombre_usuario || 'Sistema'}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
           <DialogHeader><DialogTitle>Nuevo Movimiento de Stock</DialogTitle></DialogHeader>
           <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            
            <div className="space-y-2">
               <Label className="flex items-center gap-2 text-slate-700 font-bold"><Search className="w-4 h-4 text-blue-600" /> 1. Código o Nombre del Producto</Label>
               <Input
                 ref={inputRef}
                 placeholder="Escanee código o escriba nombre..."
                 value={scanBuffer}
                 onChange={(e) => handleBusquedaProducto(e.target.value)}
                 className="bg-slate-50 border-slate-300"
               />
             </div>

             {/* Sugerencias manuales sin autoselección prematura */}
             {sugerenciasMed.length > 0 && (
               <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 divide-y divide-slate-200">
                 <p className="text-[10px] text-slate-400 font-bold mb-1 px-1">Medicamentos sugeridos:</p>
                 {sugerenciasMed.map((m) => (
                   <div 
                     key={m.id_medicamento} 
                     onClick={() => seleccionarMedicamentoManual(m)}
                     className="flex justify-between items-center py-2 px-1 cursor-pointer hover:bg-blue-50 rounded transition-colors"
                   >
                     <span className="text-xs font-bold text-slate-700">{m.nombre}</span>
                     <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded text-slate-600 uppercase">{m.tipo_medicamento}</span>
                   </div>
                 ))}
               </div>
             )}

             {selectedMedId ? (
               <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 flex items-center gap-3">
                 <div className="bg-emerald-500 p-2 rounded-full text-white"><Check className="w-4 h-4" /></div>
                 <p className="text-xs text-emerald-800 font-bold">Medicamento: {medicamentos.find(m => m.id_medicamento === selectedMedId)?.nombre}</p>
               </div>
             ) : scanBuffer && sugerenciasMed.length === 0 && (
               <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 flex items-center gap-2 text-amber-700 text-xs font-medium">
                 <AlertCircle className="w-4 h-4" /> No encontrado en catálogo.
               </div>
             )}

             <div className="space-y-2">
                <Label>Folio de Referencia</Label>
                <Select 
                  value={formData.folio} 
                  onValueChange={(v) => setFormData({...formData, folio: v})}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccione folio..." /></SelectTrigger>
                  <SelectContent>
                    {foliosActivos.map((f: any) => (
                      <SelectItem key={f.id_folio} value={f.id_folio.toString()}>
                        Fol-2026-{f.id_folio}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>Tipo</Label>
                 <Select value={formData.tipo_movimiento} onValueChange={(v: any) => setFormData({ ...formData, tipo_movimiento: v })}>
                   <SelectTrigger><SelectValue /></SelectTrigger>
                   <SelectContent>
                     <SelectItem value="entrada">Entrada (+)</SelectItem>
                     <SelectItem value="salida">Salida (-)</SelectItem>
                     <SelectItem value="caducado">Caducado/Baja</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                 <Label>Cantidad</Label>
                 <Input type="number" min="1" value={formData.cantidad} onChange={e => setFormData({ ...formData, cantidad: e.target.value })} required />
               </div>
             </div>

             <div className="space-y-2">
               <Label>Presentación / Concentración</Label>
               <Select value={formData.id_existencia} onValueChange={(v) => setFormData({ ...formData, id_existencia: v })}>
                 <SelectTrigger className={selectedMedId ? "bg-blue-50 border-blue-400" : ""}><SelectValue placeholder="Seleccione concentración..." /></SelectTrigger>
                 <SelectContent>
                   {/* Se muestran solo las concentraciones disponibles del medicamento seleccionado */}
                   {existenciasFiltradas.map(ex => (
                     <SelectItem key={ex.id_existencia} value={ex.id_existencia.toString()}>
                       {ex.concentracion} (Stock: {ex.cantidad_actual})
                     </SelectItem>
                   ))}
                   {existenciasFiltradas.length === 0 && (
                     <SelectItem value="disabled" disabled className="text-slate-400">No hay existencias disponibles</SelectItem>
                   )}
                 </SelectContent>
               </Select>
             </div>

             <div className="space-y-2">
               <Label>Observaciones</Label>
               <Textarea placeholder="Motivo..." value={formData.observaciones} onChange={e => setFormData({ ...formData, observaciones: e.target.value })} />
             </div>

             <DialogFooter>
               <Button type="submit" className="w-full bg-[#4796B7] hover:bg-[#3a7da1]" disabled={mutation.isPending}>
                 {mutation.isPending ? <Loader2 className="animate-spin mr-2" /> : "Confirmar Registro"}
               </Button>
             </DialogFooter>
           </form>
         </DialogContent>
      </Dialog>
    </div>
  );
}