import { useState, useEffect } from 'react';
import { storage } from '../data/storage';
import { ReporteConsumo } from '../types';
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
import { BarChart3, TrendingUp, Calendar, AlertTriangle, Package, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export function Reportes() {
  const [mes, setMes] = useState(new Date().getMonth().toString());
  const [anio, setAnio] = useState(new Date().getFullYear().toString());
  const [reporteConsumo, setReporteConsumo] = useState<ReporteConsumo[]>([]);
  
  useEffect(() => {
    loadReporte();
  }, [mes, anio]);
  
  const loadReporte = () => {
    const reporte = storage.getReporteConsumo(parseInt(mes), parseInt(anio));
    setReporteConsumo(reporte);
  };
  
  const inventario = storage.getInventarioCompleto();
  const movimientos = storage.getMovimientos();
  const alertas = storage.getAlertas();
  
  // Datos para gráficos
  const topConsumo = reporteConsumo.slice(0, 10);
  const dataBarChart = topConsumo.map(item => ({
    name: item.nombre_medicamento,
    cantidad: item.cantidad_total,
  }));
  
  // Movimientos por tipo
  const movimientosPorTipo = [
    { name: 'Entradas', value: movimientos.filter(m => m.tipo_movimiento === 'entrada').length },
    { name: 'Salidas', value: movimientos.filter(m => m.tipo_movimiento === 'salida').length },
    { name: 'Caducados', value: movimientos.filter(m => m.tipo_movimiento === 'caducado').length },
  ];
  
  const COLORS = ['#6DA2B3', '#96453B', '#A37D5A'];
  
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  const anios = [2024, 2025, 2026];
  
  const totalEntradas = movimientos
    .filter(m => m.tipo_movimiento === 'entrada')
    .reduce((sum, m) => sum + m.cantidad, 0);
    
  const totalSalidas = movimientos
    .filter(m => m.tipo_movimiento === 'salida')
    .reduce((sum, m) => sum + m.cantidad, 0);
    
  const totalCaducados = movimientos
    .filter(m => m.tipo_movimiento === 'caducado')
    .reduce((sum, m) => sum + m.cantidad, 0);
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Reportes y Estadísticas</h2>
        <p className="text-gray-600 mt-1">Análisis de consumo y estado del inventario</p>
      </div>
      
      {/* Filtros de periodo */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-gray-500" />
            <div className="grid grid-cols-2 gap-4 flex-1 max-w-md">
              <div>
                <Label>Mes</Label>
                <Select value={mes} onValueChange={setMes}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {meses.map((m, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Año</Label>
                <Select value={anio} onValueChange={setAnio}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {anios.map(a => (
                      <SelectItem key={a} value={a.toString()}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Resumen general */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Entradas</p>
                <p className="text-2xl font-semibold text-green-600 mt-1">+{totalEntradas}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Salidas</p>
                <p className="text-2xl font-semibold text-blue-600 mt-1">-{totalSalidas}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Caducados</p>
                <p className="text-2xl font-semibold text-red-600 mt-1">-{totalCaducados}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Movimientos</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{movimientos.length}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de barras - Consumo */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <CardTitle>Top 10 Medicamentos Consumidos</CardTitle>
            </div>
            <CardDescription>
              Periodo: {meses[parseInt(mes)]} {anio}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dataBarChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dataBarChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={12} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="cantidad" fill="#6DA2B3" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No hay datos de consumo para este periodo
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Gráfico circular - Movimientos por tipo */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Movimientos</CardTitle>
            <CardDescription>
              Todos los movimientos registrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={movimientosPorTipo}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {movimientosPorTipo.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabla de consumo mensual */}
      <Card>
        <CardHeader>
          <CardTitle>Reporte Detallado de Consumo</CardTitle>
          <CardDescription>
            Medicamentos dispensados en {meses[parseInt(mes)]} {anio}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Medicamento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cantidad Dispensada</TableHead>
                <TableHead>Número de Movimientos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reporteConsumo.length > 0 ? (
                reporteConsumo.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-medium">{item.nombre_medicamento}</TableCell>
                    <TableCell>{item.tipo_medicamento}</TableCell>
                    <TableCell>
                      <span className="font-semibold text-blue-600">{item.cantidad_total}</span>
                    </TableCell>
                    <TableCell>{item.num_movimientos}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                    No hay datos de consumo para este periodo
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Estado actual del inventario */}
      <Card>
        <CardHeader>
          <CardTitle>Estado Actual del Inventario</CardTitle>
          <CardDescription>
            Existencias totales por medicamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicamento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Concentración</TableHead>
                <TableHead>Stock Mínimo</TableHead>
                <TableHead>Cantidad Total</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventario.map((item) => {
                const bajoStock = item.cantidad_total <= item.medicamento.stock_minimo;
                
                return (
                  <TableRow key={item.medicamento.id_medicamento}>
                    <TableCell className="font-medium">{item.medicamento.nombre}</TableCell>
                    <TableCell>{item.medicamento.tipo_medicamento}</TableCell>
                    <TableCell>{item.medicamento.concentracion}</TableCell>
                    <TableCell>{item.medicamento.stock_minimo}</TableCell>
                    <TableCell>
                      <span className={`font-semibold ${bajoStock ? 'text-red-600' : 'text-green-600'}`}>
                        {item.cantidad_total}
                      </span>
                    </TableCell>
                    <TableCell>
                      {bajoStock ? (
                        <div className="flex items-center gap-1 text-red-600">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-sm">Bajo stock</span>
                        </div>
                      ) : (
                        <span className="text-sm text-green-600">Óptimo</span>
                      )}
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