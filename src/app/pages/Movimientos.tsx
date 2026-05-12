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
  MessageSquare
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
  const { data: existencias = [] } = useQuery({ queryKey: ['existencias'], queryFn: () => storage.getExistencias() });
  const { data: medicamentos = [] } = useQuery({ queryKey: ['medicamentos'], queryFn: () => storage.getMedicamentos() });
  const { data: usuarioActual } = useQuery({ queryKey: ['usuario-actual'], queryFn: () => storage.getCurrentUser() });

  // Efecto para actualizar el mensaje predeterminado dinámicamente según las sedes seleccionadas
  useEffect(() => {
    if (activeTab === 'traspaso') {
      const sedeOrigen = existencias.find(ex => ex.id_existencia.toString() === formData.id_existencia)?.sede || '...';
      const sedeDestino = existencias.find(ex => ex.id_existencia.toString() === formData.id_existencia_destino)?.sede || '...';
      
      setFormData(prev => ({ 
        ...prev, 
        observaciones: `Traspaso: ${sedeOrigen} -> ${sedeDestino}` 
      }));
    } else {
      setFormData(prev => ({ ...prev, observaciones: '' }));
    }
  }, [activeTab, formData.id_existencia, formData.id_existencia_destino, existencias]);

  useEffect(() => {
    if (isDialogOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isDialogOpen]);

  const mutation = useMutation({
    mutationFn: async (newData: any) => {
      const userId = usuarioActual?.id_usuario || 1;
      
      if (activeTab === 'traspaso') {
        const sedeOrigen = existencias.find(ex => ex.id_existencia.toString() === newData.id_existencia)?.sede;
        const sedeDestino = existencias.find(ex => ex.id_existencia.toString() === newData.id_existencia_destino)?.sede;

        // Registro para la sede que ENTREGA (Salida)
        await storage.registrarMovimiento(
          newData.id_existencia, 
          'salida', 
          newData.cantidad, 
          userId, 
          `Traspaso enviado a: ${sedeDestino}. (${newData.observaciones})`, 
          newData.folio
        );

        // Registro para la sede que RECIBE (Entrada)
        return storage.registrarMovimiento(
          newData.id_existencia_destino, 
          'entrada', 
          newData.cantidad, 
          userId, 
          `Traspaso recibido desde: ${sedeOrigen}. (${newData.observaciones})`, 
          newData.folio
        );
      }

      return storage.registrarMovimiento(newData.id_existencia, newData.tipo_movimiento, newData.cantidad, userId, newData.observaciones, newData.folio);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      queryClient.invalidateQueries({ queryKey: ['existencias'] });
      toast.success('Operación exitosa');
      closeDialog();
    },
    onError: () => toast.error('Error al procesar'),
  });

  const handleBusquedaProducto = (value: string) => {
    setScanBuffer(value);
    const cleanValue = value.trim().toLowerCase();
    if (!cleanValue) { setSelectedMedId(null); return; }
    const porCodigo = medicamentos.find(m => m.codigo_barras?.toLowerCase() === cleanValue);
    if (porCodigo) {
      setSelectedMedId(porCodigo.id_medicamento);
      const conStock = existencias.find(ex => ex.id_medicamento === porCodigo.id_medicamento && ex.cantidad_actual > 0);
      if (conStock) setFormData(prev => ({ ...prev, id_existencia: conStock.id_existencia.toString() }));
    }
  };

  const seleccionarMedicamentoManual = (med: any) => {
    setSelectedMedId(med.id_medicamento);
    setScanBuffer(med.nombre);
    setFormData(prev => ({ ...prev, id_existencia: '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cant = parseInt(formData.cantidad);
    if (!formData.id_existencia || isNaN(cant)) return toast.error('Faltan datos');
    if (activeTab === 'traspaso' && !formData.id_existencia_destino) return toast.error('Seleccione destino');
    mutation.mutate({ ...formData, cantidad: cant });
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setFormData({ id_existencia: '', id_existencia_destino: '', tipo_movimiento: 'salida', cantidad: '', observaciones: '', folio: '' });
    setScanBuffer('');
    setSelectedMedId(null);
  };

  const existenciasFiltradas = selectedMedId ? existencias.filter(ex => ex.id_medicamento === selectedMedId) : [];
  const sugerenciasMed = scanBuffer.trim() && !selectedMedId ? medicamentos.filter(m => m.activo && m.nombre.toLowerCase().includes(scanBuffer.toLowerCase())).slice(0, 3) : [];

  if (loadingMovs) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-[#4796B7]" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Historial de Movimientos</h2>
          <p className="text-gray-600 mt-1">Auditoría de inventario y traspasos</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-[#4796B7] hover:bg-[#3a7da1]">
          <Plus className="w-4 h-4 mr-2" /> Nueva Operación
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table className="relative">
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Folio</TableHead>
                <TableHead>Medicamento</TableHead>
                <TableHead>Operación</TableHead>
                <TableHead>Cant.</TableHead>
                <TableHead className="text-center w-20">Nota</TableHead>
                <TableHead>Responsable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimientos
                .sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                .map((m) => {
                  const ex = existencias.find(e => e.id_existencia === m.id_existencia);
                  const med = medicamentos.find(med => med.id_medicamento === ex?.id_medicamento);
                  return (
                    <TableRow key={m.id_movimiento} className="group">
                      <TableCell className="text-xs font-mono">{new Date(m.fecha).toLocaleString()}</TableCell>
                      <TableCell>{m.folio ? <Badge variant="secondary" className="bg-blue-50 text-blue-700">Fol-{m.folio}</Badge> : '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">{med?.nombre}</span>
                          <span className="text-[10px] text-slate-500">Sede: {ex?.sede}</span>
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
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-[#4796B7] hover:bg-blue-50 relative z-10" onClick={(e) => e.stopPropagation()}>
                                <MessageSquare className="w-4 h-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent side="top" align="center" className="z-[9999] w-64 p-3 bg-white border-slate-200 shadow-xl">
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Observación:</p>
                              <p className="text-xs text-slate-700 italic">"{m.observaciones}"</p>
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
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[480px] border-slate-200">
          <DialogHeader><DialogTitle className="text-slate-900 font-bold">Nueva Operación</DialogTitle></DialogHeader>

          <Tabs value={activeTab} onValueChange={(v:any) => setActiveTab(v)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1">
              <TabsTrigger value="simple">Movimiento Simple</TabsTrigger>
              <TabsTrigger value="traspaso" className="flex gap-2"><ArrowRightLeft className="w-4 h-4" /> Traspaso</TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-slate-700 font-bold"><Search className="w-4 h-4 text-[#4796B7]" /> 1. Producto</Label>
                <Input ref={inputRef} placeholder="Buscar..." value={scanBuffer} onChange={(e) => handleBusquedaProducto(e.target.value)} className="bg-slate-50" />
                {sugerenciasMed.length > 0 && (
                  <div className="bg-white border rounded shadow-md divide-y overflow-hidden">
                    {sugerenciasMed.map(m => (
                      <div key={m.id_medicamento} onClick={() => seleccionarMedicamentoManual(m)} className="p-2 hover:bg-slate-50 cursor-pointer text-sm">{m.nombre}</div>
                    ))}
                  </div>
                )}
                {selectedMedId && <div className="bg-emerald-50 p-2 rounded border border-emerald-100 flex items-center gap-2 text-emerald-800 text-xs font-bold"><Check className="w-4 h-4" /> {medicamentos.find(m=>m.id_medicamento===selectedMedId)?.nombre}</div>}
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-slate-700">{activeTab === 'traspaso' ? '2. Sede Origen' : '2. Sede / Presentación'}</Label>
                <Select value={formData.id_existencia} onValueChange={(v) => setFormData({ ...formData, id_existencia: v })}>
                  <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 focus:ring-[#4796B7]"><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                  <SelectContent className="bg-white">
                    {existenciasFiltradas.map(ex => (
                      <SelectItem key={ex.id_existencia} value={ex.id_existencia.toString()} className="focus:bg-blue-50 focus:text-slate-900">
                        <span className="font-bold text-xs">{ex.sede} - {ex.concentracion} (Stock: {ex.cantidad_actual})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {activeTab === 'traspaso' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <Label className="font-bold text-slate-700">3. Sede Destino</Label>
                  <Select value={formData.id_existencia_destino} onValueChange={(v) => setFormData({ ...formData, id_existencia_destino: v })}>
                    <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 focus:ring-[#4796B7]"><SelectValue placeholder="Destino..." /></SelectTrigger>
                    <SelectContent className="bg-white">
                      {existenciasFiltradas.filter(ex => ex.id_existencia.toString() !== formData.id_existencia).map(ex => (
                        <SelectItem key={ex.id_existencia} value={ex.id_existencia.toString()} className="focus:bg-emerald-50 focus:text-slate-900">
                          <span className="font-bold text-xs">{ex.sede} - {ex.concentracion}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className={activeTab === 'traspaso' ? "hidden" : "space-y-2"}>
                  <Label className="font-bold text-slate-700">Operación</Label>
                  <Select value={formData.tipo_movimiento} onValueChange={(v: any) => setFormData({ ...formData, tipo_movimiento: v })}>
                    <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="entrada">Entrada (+)</SelectItem>
                      <SelectItem value="salida">Salida (-)</SelectItem>
                      <SelectItem value="caducado">Baja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className={activeTab === 'traspaso' ? "col-span-2 space-y-2" : "space-y-2"}>
                  <Label className="font-bold text-slate-700">Cantidad</Label>
                  <Input type="number" min="1" value={formData.cantidad} onChange={e => setFormData({ ...formData, cantidad: e.target.value })} className="bg-slate-50" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Folio</Label>
                  <Select value={formData.folio} onValueChange={(v) => setFormData({...formData, folio: v})}>
                    <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue placeholder="Folio" /></SelectTrigger>
                    <SelectContent className="bg-white">
                      {foliosActivos.map((f:any) => (
                        <SelectItem key={f.id_folio} value={f.id_folio.toString()} className="focus:bg-blue-50 focus:text-slate-900">
                          <span className="text-xs font-bold">Fol-{f.id_folio}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label className="font-bold text-slate-700">Observaciones</Label>
                  <Textarea 
                    placeholder="Notas..." 
                    value={formData.observaciones} 
                    onChange={e => setFormData({ ...formData, observaciones: e.target.value })} 
                    className="bg-slate-50 border-slate-200 text-slate-900 min-h-[80px]" 
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="submit" className="w-full bg-[#4796B7] hover:bg-[#3a7da1] text-white font-bold h-11" disabled={mutation.isPending}>
                  {mutation.isPending ? <Loader2 className="animate-spin mr-2" /> : activeTab === 'traspaso' ? "Confirmar Traspaso" : "Registrar Movimiento"}
                </Button>
              </DialogFooter>
            </form>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}