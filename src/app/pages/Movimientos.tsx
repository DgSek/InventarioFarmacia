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
import { Plus, ArrowUpCircle, ArrowDownCircle, XCircle, User, Loader2, Barcode, Package, Box, ClipboardList } from 'lucide-react';
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

  // --- AUTO-FOCUS ---
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

  // --- MUTACIÓN ---
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

  // --- HELPERS ---
  const getMedicamentoNombre = (idExistencia: number) => {
    const ex = existencias.find(e => e.id_existencia === idExistencia);
    if (!ex) return '---';
    const med = medicamentos.find(m => m.id_medicamento === ex.id_medicamento);
    return med ? `${med.nombre} (${med.concentracion})` : 'No encontrado';
  };

  const getInsumoNombre = (idInsumo: number) => {
    const ins = insumos.find(i => i.id_insumo === idInsumo);
    return ins ? ins.nombre_insumo : 'Insumo no identificado';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const barcode = scanBuffer.trim();
      const medEncontrado = medicamentos.find(m => m.codigo_barras === barcode);
      if (medEncontrado) {
        setSelectedMedId(medEncontrado.id_medicamento);
        const lote = existencias.find(ex => ex.id_medicamento === medEncontrado.id_medicamento && ex.cantidad_actual > 0);
        if (lote) setFormData(prev => ({ ...prev, id_existencia: lote.id_existencia.toString() }));
      }
      setScanBuffer('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cant = parseInt(formData.cantidad);
    const exId = parseInt(formData.id_existencia);
    if (!exId || isNaN(cant)) {
      toast.error('Datos incompletos');
      return;
    }

    // MODIFICACIÓN: Limpieza del folio para guardar solo el ID en la BD
    const folioID = formData.folio.includes('Fol-2026-') 
      ? formData.folio.replace('Fol-2026-', '') 
      : formData.folio;

    mutation.mutate({
      id_existencia: exId,
      tipo_movimiento: formData.tipo_movimiento,
      cantidad: cant,
      id_usuario: usuarioActual?.id_usuario || 1,
      observaciones: formData.observaciones,
      folio: folioID // Mandamos solo el número (ej: "12")
    });
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setFormData({ id_existencia: '', tipo_movimiento: 'salida', cantidad: '', observaciones: '', folio: '' });
    setScanBuffer('');
    setSelectedMedId(null);
  };

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
            <TabsTrigger
              value="medicamentos"
              className="flex items-center gap-2 px-1 pb-3 pt-0 rounded-none bg-transparent border-b-2 text-slate-400 data-[state=active]:border-b-[#4796B7] data-[state=active]:text-[#4796B7] data-[state=active]:shadow-none focus-visible:ring-0"
            >
              <Package className="w-4 h-4" />
              <span>Medicamentos</span>
            </TabsTrigger>
            <TabsTrigger
              value="insumos"
              className="flex items-center gap-2 px-1 pb-3 pt-0 rounded-none bg-transparent border-b-2 text-slate-400 data-[state=active]:border-b-[#4796B7] data-[state=active]:text-[#4796B7] data-[state=active]:shadow-none focus-visible:ring-0"
            >
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
                                {/* MODIFICACIÓN: Mostrar con etiqueta visual en la tabla */}
                                Fol-2026-{m.folio}
                              </Badge>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-900">{getMedicamentoNombre(m.id_existencia)}</span>
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

          <TabsContent value="insumos" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-[#4796B7]" />
                    Historial de Egresos - Suministros
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="pl-6">Fecha</TableHead>
                      <TableHead>Insumo</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Motivo / Observación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salidasInsumos.length > 0 ? (
                      salidasInsumos
                        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                        .map((s: any) => (
                        <TableRow key={s.id_salida}>
                          <TableCell className="pl-6 text-xs font-mono">{new Date(s.fecha).toLocaleString()}</TableCell>
                          <TableCell className="font-medium text-slate-900">{getInsumoNombre(s.id_insumo)}</TableCell>
                          <TableCell className="text-red-600 font-bold">-{s.cantidad}</TableCell>
                          <TableCell className="text-sm text-slate-500 italic">{s.observacion || 'Sin observaciones'}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10 text-slate-400">No hay registros.</TableCell>
                      </TableRow>
                    )}
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
            
            <div className="bg-blue-50 p-3 rounded-lg border-2 border-dashed border-blue-300 space-y-2">
               <Label className="flex items-center gap-2 text-blue-800 font-bold"><Barcode className="w-4 h-4" /> Escanee el producto</Label>
               <Input
                 ref={inputRef}
                 placeholder="Escanee el código de barras..."
                 value={scanBuffer}
                 onChange={(e) => setScanBuffer(e.target.value)}
                 onKeyDown={handleKeyDown}
                 className="bg-white"
               />
             </div>

             <div className="space-y-2">
                <Label htmlFor="folio-input">Folio de Referencia</Label>
                <Input 
                  id="folio-input"
                  list="folios-list" 
                  placeholder="Seleccione Fol-2026-ID..." 
                  value={formData.folio}
                  onChange={(e) => setFormData({...formData, folio: e.target.value})}
                />
                <datalist id="folios-list">
                  {foliosActivos.map((f: any) => (
                    // MODIFICACIÓN: Solo visual para el usuario en el dropdown
                    <option key={f.id_folio} value={`Fol-2026-${f.id_folio}`} />
                  ))}
                </datalist>
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
               <Label>Lote / Existencia {selectedMedId && "(Filtrado)"}</Label>
               <Select value={formData.id_existencia} onValueChange={(v) => setFormData({ ...formData, id_existencia: v })}>
                 <SelectTrigger className={selectedMedId ? "bg-blue-50 border-blue-400" : ""}><SelectValue placeholder="Seleccione lote..." /></SelectTrigger>
                 <SelectContent>
                   {(selectedMedId ? existencias.filter(ex => ex.id_medicamento === selectedMedId) : existencias).map(ex => (
                     <SelectItem key={ex.id_existencia} value={ex.id_existencia.toString()}>
                       {getMedicamentoNombre(ex.id_existencia)} - [{ex.codigo_referencia}] (Stock: {ex.cantidad_actual})
                     </SelectItem>
                   ))}
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