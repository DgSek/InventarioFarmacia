import { useState } from 'react';
import { storage } from '../data/storage';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { BarChart3, TrendingUp, Calendar, AlertTriangle, Package, FileText, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Badge } from '../components/ui/badge';

export function Reportes() {
  const [mes, setMes] = useState(new Date().getMonth().toString());
  const [anio, setAnio] = useState(new Date().getFullYear().toString());

  // --- CARGA DE DATOS ASÍNCRONA ---
  const { data: reporteConsumo = [], isLoading: loadingReporte } = useQuery({
    queryKey: ['reporte-consumo', mes, anio],
    queryFn: () => storage.getReporteConsumo(), // En producción, pasar mes/anio al API
  });

  const { data: inventario = [], isLoading: loadingInv } = useQuery({
    queryKey: ['inventario-completo'],
    queryFn: () => storage.getInventarioCompleto(),
  });

  const { data: movimientos = [], isLoading: loadingMovs } = useQuery({
    queryKey: ['movimientos'],
    queryFn: () => storage.getMovimientos(),
  });

  // --- PROCESAMIENTO DE DATOS PARA GRÁFICOS ---
  const topConsumo = reporteConsumo.slice(0, 10);
  const dataBarChart = topConsumo.map(item => ({
    name: item.nombre_medicamento,
    cantidad: item.cantidad_total,
  }));

  const movimientosPorTipo = [
    { name: 'Entradas', value: movimientos.filter(m => m.tipo_movimiento === 'entrada').length },
    { name: 'Salidas', value: movimientos.filter(m => m.tipo_movimiento === 'salida').length },
    { name: 'Caducados', value: movimientos.filter(m => m.tipo_movimiento === 'caducado').length },
  ];

  const COLORS = ['#6DA2B3', '#96453B', '#A37D5A'];
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const anios = [2024, 2025, 2026];

  const stats = {
    totalEntradas: movimientos.filter(m => m.tipo_movimiento === 'entrada').reduce((sum, m) => sum + m.cantidad, 0),
    totalSalidas: movimientos.filter(m => m.tipo_movimiento === 'salida').reduce((sum, m) => sum + m.cantidad, 0),
    totalCaducados: movimientos.filter(m => m.tipo_movimiento === 'caducado').reduce((sum, m) => sum + m.cantidad, 0),
  };

  if (loadingReporte || loadingInv || loadingMovs) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <p className="text-slate-500 font-medium">Generando análisis estadístico desde la base de datos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Reportes y Estadísticas</h2>
          <p className="text-gray-600 mt-1">Análisis histórico en tilinescraft.serveminecraft.net</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-gray-500" />
            <div className="grid grid-cols-2 gap-4 flex-1 max-w-md">
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
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 font-medium">Entradas Totales</p>
            <p className="text-2xl font-bold text-emerald-600">+{stats.totalEntradas}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 font-medium">Salidas Totales</p>
            <p className="text-2xl font-bold text-blue-600">-{stats.totalSalidas}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 font-medium">Mermas/Caducados</p>
            <p className="text-2xl font-bold text-red-600">-{stats.totalCaducados}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 font-medium">Operaciones Históricas</p>
            <p className="text-2xl font-bold text-slate-800">{movimientos.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5"/> Consumo por Medicamento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dataBarChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={10} interval={0} angle={-30} textAnchor="end" height={60} />
                <YAxis fontSize={12} />
                <Tooltip cursor={{fill: '#f1f5f9'}} />
                <Bar dataKey="cantidad" fill="#6DA2B3" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5"/> Mix de Movimientos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={movimientosPorTipo} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {movimientosPorTipo.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Estado Crítico de Inventario</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicamento</TableHead>
                <TableHead>Stock Actual</TableHead>
                <TableHead>Mínimo</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventario.map((item) => {
                const bajoStock = item.cantidad_total <= item.medicamento.stock_minimo;
                return (
                  <TableRow key={item.medicamento.id_medicamento}>
                    <TableCell className="font-medium">{item.medicamento.nombre}</TableCell>
                    <TableCell className={`font-bold ${bajoStock ? 'text-red-600' : 'text-emerald-600'}`}>{item.cantidad_total}</TableCell>
                    <TableCell className="text-slate-500">{item.medicamento.stock_minimo}</TableCell>
                    <TableCell>
                      {bajoStock ? <Badge variant="destructive">Reabastecer</Badge> : <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">Suficiente</Badge>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}