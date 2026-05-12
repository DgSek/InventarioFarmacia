import { useState } from 'react';
import { storage } from '../data/storage';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Loader2, 
  Filter, 
  Search, 
  FileDown, 
  ClipboardCheck,
  Building2 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { Badge } from '../components/ui/badge';
import * as XLSX from 'xlsx';

export function Reportes() {
  const [mes, setMes] = useState(new Date().getMonth().toString());
  const [anio, setAnio] = useState(new Date().getFullYear().toString());
  const [folioInput, setFolioInput] = useState('');
  const [showFolioDropdown, setShowFolioDropdown] = useState(false);

  // --- CARGA DE DATOS ---
  const { data: inventario = [], isLoading: loadingInv } = useQuery({
    queryKey: ['inventario-completo'],
    queryFn: () => storage.getInventarioCompleto(),
  });

  const { data: movimientos = [], isLoading: loadingMovs } = useQuery({
    queryKey: ['movimientos'],
    queryFn: () => storage.getMovimientos(),
  });

  const { data: existencias = [] } = useQuery({
    queryKey: ['existencias'],
    queryFn: () => storage.getExistencias(),
  });

  const { data: medicamentos = [] } = useQuery({
    queryKey: ['medicamentos'],
    queryFn: () => storage.getMedicamentos(),
  });

  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const anios = [2024, 2025, 2026];

  // --- LÓGICA DE EXPORTACIÓN A EXCEL ---
  const exportarExcel = () => {
    const datosFiltrados = movimientos.filter(m => {
      const fechaMov = new Date(m.fecha);
      const coincideMes = fechaMov.getMonth().toString() === mes;
      const coincideAnio = fechaMov.getFullYear().toString() === anio;
      const esSalida = m.tipo_movimiento === 'salida' || m.tipo_movimiento === 'caducado';
      
      let coincideFolio = true;
      if (folioInput) {
        // En movimientos usamos el campo .folio (que es el ID o string del folio)
        coincideFolio = m.folio?.toString().includes(folioInput) ?? false;
      }

      return coincideMes && coincideAnio && esSalida && coincideFolio;
    });

    if (datosFiltrados.length === 0) {
      alert("No hay registros de salida para los filtros seleccionados.");
      return;
    }

    const reporteExcel = datosFiltrados.map(m => {
      const ex = existencias.find(e => e.id_existencia === m.id_existencia);
      const med = medicamentos.find(med => med.id_medicamento === ex?.id_medicamento);
      
      return {
        'FECHA': new Date(m.fecha).toLocaleString(),
        'MEDICAMENTO': med ? med.nombre : 'No identificado',
        'PRESENTACIÓN': ex?.concentracion || 'N/A',
        'SEDE': ex?.sede || 'N/A',
        'FOLIO / LOTE': m.folio || 'N/A',
        'OPERACIÓN': m.tipo_movimiento.toUpperCase(),
        'CANTIDAD': m.cantidad,
        'OBSERVACIONES': m.observaciones || ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(reporteExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Salidas");
    
    const nombreArchivo = `Reporte_Salidas_${meses[parseInt(mes)]}_${anio}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
  };

  // --- PROCESAMIENTO PARA GRÁFICOS ---
  // Obtenemos folios únicos de los movimientos
  const foliosDisponibles = Array.from(new Set(movimientos.map(m => m.folio).filter(Boolean)));
  const foliosFiltrados = foliosDisponibles.filter(f => f?.toString().includes(folioInput));

  const dataBarChart = medicamentos.slice(0, 8).map(med => ({
    name: med.nombre,
    cantidad: movimientos.filter(m => {
        const ex = existencias.find(e => e.id_existencia === m.id_existencia);
        return ex?.id_medicamento === med.id_medicamento && m.tipo_movimiento === 'salida';
    }).reduce((acc, curr) => acc + curr.cantidad, 0)
  }));

  const movimientosPorTipo = [
    { name: 'Entradas', value: movimientos.filter(m => m.tipo_movimiento === 'entrada').length },
    { name: 'Salidas', value: movimientos.filter(m => m.tipo_movimiento === 'salida').length },
    { name: 'Caducados', value: movimientos.filter(m => m.tipo_movimiento === 'caducado').length },
  ];

  const COLORS = ['#6DA2B3', '#ffe2af', '#f96e5b'];

  if (loadingInv || loadingMovs) return (
    <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
      <Loader2 className="w-10 h-10 animate-spin text-[#4796B7]" />
      <p className="text-slate-500 font-medium">Analizando base de datos...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Reportes y Estadísticas</h2>
          <p className="text-slate-500">Monitoreo de movimientos de farmacia</p>
        </div>
        <Button 
          onClick={exportarExcel} 
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
        >
          <FileDown className="w-4 h-4 mr-2" />
          Descargar Reporte (Excel)
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-slate-400" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
              <div>
                <Label>Mes de Análisis</Label>
                <Select value={mes} onValueChange={setMes}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {meses.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Año</Label>
                <Select value={anio} onValueChange={setAnio}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {anios.map(a => <SelectItem key={a} value={a.toString()}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="relative">
                <Label>Folio de Movimiento</Label>
                <div className="relative">
                  <Input
                    placeholder="Buscar folio..."
                    value={folioInput}
                    onChange={(e) => { setFolioInput(e.target.value); setShowFolioDropdown(true); }}
                    onFocus={() => setShowFolioDropdown(true)}
                  />
                  <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  {showFolioDropdown && foliosFiltrados.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-auto">
                      {foliosFiltrados.slice(0, 10).map((f, idx) => (
                        <div key={idx} onClick={() => { setFolioInput(f?.toString() || ''); setShowFolioDropdown(false); }} className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm">
                          {f}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-end">
                <Button className="w-full bg-[#4796B7] hover:bg-[#3a7da1]">
                  <ClipboardCheck className="w-4 h-4 mr-2" />
                  Actualizar Vista
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm font-bold uppercase text-slate-500">Consumo por Medicamento (Salidas)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dataBarChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={10} angle={-20} textAnchor="end" height={50} />
                <YAxis fontSize={12} />
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="cantidad" fill="#6DA2B3" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-bold uppercase text-slate-500">Tipos de Movimientos</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={movimientosPorTipo} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {movimientosPorTipo.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-red-500"/> Stock Crítico por Sede</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="pl-6">Medicamento</TableHead>
                <TableHead>Ubicación / Sede</TableHead>
                <TableHead>Stock Total</TableHead>
                <TableHead>Mínimo Requerido</TableHead>
                <TableHead className="pr-6">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventario
                .filter(item => item.cantidad_total <= item.medicamento.stock_minimo)
                .map((item) => (
                <TableRow key={item.medicamento.id_medicamento}>
                  <TableCell className="font-bold pl-6">{item.medicamento.nombre}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-slate-500 text-xs">
                      <Building2 className="w-3 h-3" />
                      {item.existencias[0]?.sede || 'No asignada'}
                    </div>
                  </TableCell>
                  <TableCell className="text-red-600 font-bold">{item.cantidad_total}</TableCell>
                  <TableCell>{item.medicamento.stock_minimo}</TableCell>
                  <TableCell className="pr-6">
                    <Badge variant="destructive" className="animate-pulse">Reabastecer</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}