import { useState, useRef, useEffect } from 'react';
import { storage } from '../data/storage';
import { Movimiento, Existencia, Medicamento, TipoMovimiento } from '../types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '../components/ui/card';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import {
  Plus,
  ArrowUpCircle,
  ArrowDownCircle,
  User,
  Loader2,
  Search,
  Check,
  Building2,
  ArrowRightLeft,
  MessageSquare,
  Box
} from 'lucide-react';
import { toast } from 'sonner';

export function Movimientos() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [scanBuffer, setScanBuffer] = useState('');
  const [selectedMedId, setSelectedMedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'simple' | 'traspaso'>('simple');
  const [currentPage, setCurrentPage] = useState(1);
  const MOVIMIENTOS_POR_PAGINA = 25;

  const [formData, setFormData] = useState({
    id_existencia: '',
    id_existencia_destino: '',
    tipo_movimiento: 'salida' as TipoMovimiento,
    cantidad: '',
    observaciones: '',
    folio: '',
  });

  // --- CARGA DE DATOS ---
  const { data: foliosActivos = [] } = useQuery({ queryKey: ['folios-activos'], queryFn: () => storage.getFoliosActivos() });
  const { data: movimientos = [], isLoading: loadingMovs } = useQuery({ queryKey: ['movimientos'], queryFn: async () => storage.getMovimientos() });
  const { data: salidasInsumos = [] } = useQuery({ queryKey: ['salidas-insumos'], queryFn: () => storage.getSalidasInsumos() });
  const { data: insumos = [] } = useQuery({ queryKey: ['insumos'], queryFn: () => storage.getInsumos() });
  const { data: existencias = [] } = useQuery({ queryKey: ['existencias'], queryFn: () => storage.getExistencias() });
  const { data: medicamentos = [] } = useQuery({ queryKey: ['medicamentos'], queryFn: () => storage.getMedicamentos() });
  const { data: usuarioActual } = useQuery({ queryKey: ['usuario-actual'], queryFn: () => storage.getCurrentUser() });

  // --- UNIFICACIÓN DE HISTORIAL ---
  const historialUnificado = [
    ...movimientos.map(m => ({ ...m, origen: 'medicamento' })),
    ...salidasInsumos.map(s => ({
      id_movimiento: `ins-${s.id_salida}`,
      fecha: s.fecha,
      id_existencia: s.id_insumo,
      tipo_movimiento: 'salida',
      cantidad: s.cantidad,
      observaciones: s.observacion,
      folio: s.folio || null,
      origen: 'insumo'
    }))
  ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const movimientosFiltrados = historialUnificado.filter(
    m => filterTipo === 'todos' || m.tipo_movimiento === filterTipo
  );

  const totalPages = Math.ceil(
    movimientosFiltrados.length / MOVIMIENTOS_POR_PAGINA
  );

  const movimientosPaginados = movimientosFiltrados.slice(
    (currentPage - 1) * MOVIMIENTOS_POR_PAGINA,
    currentPage * MOVIMIENTOS_POR_PAGINA
  );

  // --- EFECTO: OBSERVACIONES DINÁMICAS (CORREGIDO PARA EVITAR BUCLE INFINITO) ---
  useEffect(() => {
    if (activeTab === 'traspaso') {
      const sedeO = existencias.find(ex => ex.id_existencia.toString() === formData.id_existencia)?.sede || '...';
      const sedeD = existencias.find(ex => ex.id_existencia.toString() === formData.id_existencia_destino)?.sede || '...';
      const nuevaObs = `Traspaso: ${sedeO} -> ${sedeD}`;

      // Solo actualizamos si el valor es realmente diferente para prevenir el error de profundidad máxima
      if (formData.observaciones !== nuevaObs && (formData.id_existencia || formData.id_existencia_destino)) {
        setFormData(prev => ({ ...prev, observaciones: nuevaObs }));
      }
    } else if (activeTab === 'simple' && formData.observaciones.startsWith('Traspaso:')) {
      // Limpiar si regresamos a simple y había un texto de traspaso
      setFormData(prev => ({ ...prev, observaciones: '' }));
    }
  }, [activeTab, formData.id_existencia, formData.id_existencia_destino, existencias]);

  useEffect(() => {
    if (isDialogOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isDialogOpen]);

  const mutation = useMutation({
    mutationFn: async (newData: any) => {
      const userId = usuarioActual?.id_usuario || 1;
      if (activeTab === 'traspaso') {
        const sO = existencias.find(ex => ex.id_existencia.toString() === newData.id_existencia)?.sede;
        const sD = existencias.find(ex => ex.id_existencia.toString() === newData.id_existencia_destino)?.sede;
        await storage.registrarMovimiento(newData.id_existencia, 'salida', newData.cantidad, userId, `Traspaso enviado a: ${sD}. (${newData.observaciones})`, newData.folio);
        return storage.registrarMovimiento(newData.id_existencia_destino, 'entrada', newData.cantidad, userId, `Traspaso recibido desde: ${sO}. (${newData.observaciones})`, newData.folio);
      }
      return storage.registrarMovimiento(newData.id_existencia, newData.tipo_movimiento, newData.cantidad, userId, newData.observaciones, newData.folio);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      queryClient.invalidateQueries({ queryKey: ['existencias'] });
      queryClient.invalidateQueries({ queryKey: ['salidas-insumos'] });
      toast.success('Operación completada');
      closeDialog();
    },
    onError: () => toast.error('Error al registrar movimiento'),
  });

  const handleBusquedaProducto = (value: string) => {
    setScanBuffer(value);
    const clean = value.trim().toLowerCase();
    if (!clean) { setSelectedMedId(null); return; }
    const res = medicamentos.find(m => m.codigo_barras?.toLowerCase() === clean);
    if (res) setSelectedMedId(res.id_medicamento);
  };

  const seleccionarMed = (med: any) => {
    setSelectedMedId(med.id_medicamento);
    setScanBuffer(med.nombre);
    setFormData(prev => ({ ...prev, id_existencia: '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id_existencia || !formData.cantidad) return toast.error('Faltan campos');
    mutation.mutate({ ...formData, cantidad: parseInt(formData.cantidad) });
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setFormData({ id_existencia: '', id_existencia_destino: '', tipo_movimiento: 'salida', cantidad: '', observaciones: '', folio: '' });
    setScanBuffer('');
    setSelectedMedId(null);
  };

  const existenciasFiltradas = selectedMedId ? existencias.filter(ex => ex.id_medicamento === selectedMedId) : [];
  const sugerencias = scanBuffer.trim() && !selectedMedId ? medicamentos.filter(m => m.activo && m.nombre.toLowerCase().includes(scanBuffer.toLowerCase())).slice(0, 3) : [];

  if (loadingMovs) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-[#4796B7]" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Movimientos</h2>
          <p className="text-gray-600 mt-1">Auditoría unificada de stock</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-[#4796B7] hover:bg-[#3a7da1]">
          <Plus className="w-4 h-4 mr-2" /> Nueva Operación
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-[#4796B7]/10 border-b transition-colors">
                <TableHead>Fecha</TableHead>
                <TableHead>Folio</TableHead>
                <TableHead>Artículo</TableHead>
                <TableHead>Operación</TableHead>
                <TableHead>Cant.</TableHead>
                <TableHead className="text-center">Nota</TableHead>
                <TableHead>Responsable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimientosPaginados.map((m) => {
                const esMed = m.origen === 'medicamento';
                let nombre = "";
                let sub = "";

                if (esMed) {
                  const ex = existencias.find(e => e.id_existencia === m.id_existencia);
                  nombre = medicamentos.find(med => med.id_medicamento === ex?.id_medicamento)?.nombre || 'Medicamento';
                  sub = ex?.sede || 'Sin sede';
                } else {
                  nombre = insumos.find(i => i.id_insumo === m.id_existencia)?.nombre_insumo || 'Insumo';
                  sub = 'Insumo Médico';
                }

                return (
                  <TableRow key={m.id_movimiento}
                    className="hover:bg-[#4796B7]/5 transition-colors">
                    <TableCell className="text-xs font-mono">{new Date(m.fecha).toLocaleString()}</TableCell>
                    <TableCell>{m.folio ? <Badge variant="secondary" className="bg-blue-50 text-blue-700">Fol-{m.folio}</Badge> : '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900 flex items-center gap-1">
                          {!esMed && <Box className="w-3 h-3 text-amber-500" />}
                          {nombre}
                        </span>
                        <span className="text-[10px] text-slate-500 italic">{sub}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {m.tipo_movimiento === 'entrada' ? <ArrowUpCircle className="w-3 h-3 mr-1 text-emerald-500" /> : <ArrowDownCircle className="w-3 h-3 mr-1 text-blue-500" />}
                        {m.tipo_movimiento}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold">{m.cantidad}</TableCell>
                    <TableCell className="text-center">
                      {m.observaciones ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#4796B7]"><MessageSquare className="w-4 h-4" /></Button>
                          </PopoverTrigger>
                          <PopoverContent side="top" className="z-[9999] w-64 p-3 bg-white shadow-xl border border-slate-200">
                            <p className="text-xs italic text-slate-700">"{m.observaciones}"</p>
                          </PopoverContent>
                        </Popover>
                      ) : <span className="text-slate-300">-</span>}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600"><User className="inline w-3 h-3 mr-1" />{usuarioActual?.nombre_usuario || 'Admin'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between px-6 py-4 border-t bg-slate-50/30">
            <p className="text-sm text-slate-500">
              Página {currentPage} de {totalPages || 1}
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
              >
                Anterior
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[480px] border-slate-200">
          <DialogHeader><DialogTitle className="text-slate-900 font-bold">Nueva Operación</DialogTitle></DialogHeader>
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-slate-100">
              <TabsTrigger value="simple">Simple</TabsTrigger>
              <TabsTrigger value="traspaso">Traspaso</TabsTrigger>
            </TabsList>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">1. Producto</Label>
                <Input ref={inputRef} placeholder="Buscar..." value={scanBuffer} onChange={(e) => handleBusquedaProducto(e.target.value)} className="bg-slate-50 border-slate-200" />
                {sugerencias.length > 0 && (
                  <div className="bg-white border rounded shadow-md divide-y mt-1 overflow-hidden z-50 relative">
                    {sugerencias.map(m => (
                      <div key={m.id_medicamento} onClick={() => seleccionarMed(m)} className="p-2 hover:bg-[#4796B7]/5 transition-colors cursor-pointer text-sm font-bold">{m.nombre}</div>
                    ))}
                  </div>
                )}
                {selectedMedId && <div className="bg-emerald-50 p-2 rounded border border-emerald-100 text-emerald-800 text-xs font-bold flex gap-2"><Check className="w-4 h-4" /> {medicamentos.find(m => m.id_medicamento === selectedMedId)?.nombre}</div>}
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-slate-700">{activeTab === 'traspaso' ? '2. Sede Origen' : '2. Sede / Presentación'}</Label>
                <Select value={formData.id_existencia} onValueChange={(v) => setFormData({ ...formData, id_existencia: v })}>
                  <SelectTrigger className="bg-slate-50 border-slate-200 focus:ring-[#4796B7]"><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                  <SelectContent className="bg-white">
                    {existenciasFiltradas.map(ex => (
                      <SelectItem key={ex.id_existencia} value={ex.id_existencia.toString()} className="focus:bg-blue-50">
                        {ex.sede} - {ex.concentracion} (Stock: {ex.cantidad_actual})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {activeTab === 'traspaso' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <Label className="font-bold text-slate-700">3. Sede Destino</Label>
                  <Select value={formData.id_existencia_destino} onValueChange={(v) => setFormData({ ...formData, id_existencia_destino: v })}>
                    <SelectTrigger className="bg-slate-50 border-slate-200 focus:ring-[#4796B7]"><SelectValue placeholder="Destino..." /></SelectTrigger>
                    <SelectContent className="bg-white">
                      {existenciasFiltradas.filter(ex => ex.id_existencia.toString() !== formData.id_existencia).map(ex => (
                        <SelectItem key={ex.id_existencia} value={ex.id_existencia.toString()} className="focus:bg-emerald-50">
                          {ex.sede} - {ex.concentracion}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {activeTab === 'simple' && (
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700">Operación</Label>
                    <Select value={formData.tipo_movimiento} onValueChange={(v: any) => setFormData({ ...formData, tipo_movimiento: v })}>
                      <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="entrada" className="focus:bg-emerald-50">Entrada (+)</SelectItem>
                        <SelectItem value="salida" className="focus:bg-blue-50">Salida (-)</SelectItem>
                        <SelectItem value="caducado" className="focus:bg-red-50">Baja</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className={activeTab === 'traspaso' ? "col-span-2 space-y-2" : "space-y-2"}>
                  <Label className="font-bold text-slate-700">Cantidad</Label>
                  <Input type="number" min="1" value={formData.cantidad} onChange={e => setFormData({ ...formData, cantidad: e.target.value })} className="bg-slate-50 border-slate-200" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Folio</Label>
                  <Select value={formData.folio} onValueChange={(v) => setFormData({ ...formData, folio: v })}>
                    <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue placeholder="Folio" /></SelectTrigger>
                    <SelectContent className="bg-white">
                      {foliosActivos.map((f: any) => (
                        // Validación de seguridad: solo renderizar si f.folio existe
                        f?.folio && (
                          <SelectItem key={f.id_folio} value={f.folio.toString()} className="focus:bg-blue-50">
                            Fol-{f.folio}
                          </SelectItem>
                        )
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label className="font-bold text-slate-700">Observaciones</Label>
                  <Textarea
                    value={formData.observaciones}
                    onChange={e => setFormData({ ...formData, observaciones: e.target.value })}
                    className="min-h-[80px] bg-slate-50 border-slate-200 text-slate-900"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" className="w-full bg-[#4796B7] hover:bg-[#3a7da1] text-white font-bold h-11" disabled={mutation.isPending}>
                  {mutation.isPending ? <Loader2 className="animate-spin mr-2" /> : "Confirmar"}
                </Button>
              </DialogFooter>
            </form>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}