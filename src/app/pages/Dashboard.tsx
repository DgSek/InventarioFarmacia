import { storage } from '../data/storage';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  AlertTriangle, 
  Package, 
  TrendingUp, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Loader2
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { ReporteConsumo } from '../types';

export function Dashboard() {
  // --- CARGA DE DATOS ASÍNCRONA ---
  const { data: medicamentos = [], isLoading: loadingMeds } = useQuery({
    queryKey: ['medicamentos'],
    queryFn: () => storage.getMedicamentos(),
  });

  const { data: existencias = [], isLoading: loadingEx } = useQuery({
    queryKey: ['existencias'],
    queryFn: () => storage.getExistencias(),
  });

  const { data: movimientos = [], isLoading: loadingMovs } = useQuery({
    queryKey: ['movimientos'],
    queryFn: () => storage.getMovimientos(),
  });

  const { data: alertas = [], isLoading: loadingAlerts } = useQuery({
    queryKey: ['alertas'],
    queryFn: () => storage.getAlertas(),
  });

  // El reporte de consumo se calcula a partir de los datos cargados
  // Nota: En un sistema real, esto lo debería devolver el backend procesado
const { data: reporteConsumo = [] } = useQuery<ReporteConsumo[]>({
  queryKey: ['reporte-consumo'],
  queryFn: () => storage.getReporteConsumo(),
  enabled: !!medicamentos.length
});

  // --- CÁLCULO DE ESTADÍSTICAS ---
  const hoy = new Date().toISOString().split('T')[0];
  const movimientosHoy = movimientos.filter(m => m.fecha.startsWith(hoy)).length;
  const totalExistencias = existencias.reduce((sum, e) => sum + e.cantidad_actual, 0);
  const medicamentosActivos = medicamentos.filter(m => m.activo).length;

  if (loadingMeds || loadingEx || loadingMovs || loadingAlerts) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <p className="text-gray-500 font-medium">Sincronizando con el servidor central...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Dashboard</h2>
        <p className="text-gray-600 mt-1">Resumen en tiempo real desde tilinescraft.serveminecraft.net</p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Medicamentos</p>
                <p className="text-2xl font-bold mt-1 text-slate-800">{medicamentosActivos}</p>
                <p className="text-xs text-green-600 mt-1">Sincronizados</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Existencias Totales</p>
                <p className="text-2xl font-bold mt-1 text-slate-800">{totalExistencias}</p>
                <p className="text-xs text-slate-500 mt-1">Unidades en stock</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-teal-100">
                <TrendingUp className="w-6 h-6 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Movimientos Hoy</p>
                <p className="text-2xl font-bold mt-1 text-slate-800">{movimientosHoy}</p>
                <p className="text-xs text-slate-500 mt-1">Operaciones diarias</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-amber-100">
                <Activity className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={alertas.length > 0 ? "border-red-200 bg-red-50/30" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Alertas de Stock</p>
                <p className={`text-2xl font-bold mt-1 ${alertas.length > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                  {alertas.length}
                </p>
                <p className="text-xs text-slate-500 mt-1">Requieren atención</p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${alertas.length > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                <AlertTriangle className={`w-6 h-6 ${alertas.length > 0 ? 'text-red-600' : 'text-gray-400'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas Críticas */}
      {alertas.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="bg-red-50/50">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <CardTitle className="text-red-900">Alertas de Stock Mínimo</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicamento</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Actual</TableHead>
                  <TableHead>Mínimo</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alertas.map((alerta) => (
                  <TableRow key={alerta.id_medicamento}>
                    <TableCell className="font-medium text-red-700">{alerta.nombre_medicamento}</TableCell>
                    <TableCell className="text-slate-600">{alerta.ubicacion}</TableCell>
                    <TableCell className="font-bold text-red-600">{alerta.cantidad_total}</TableCell>
                    <TableCell>{alerta.stock_minimo}</TableCell>
                    <TableCell>
                      <Badge variant="destructive" className="animate-pulse">Reposición Urgente</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tabla de Consumo */}
      <Card>
        <CardHeader>
          <CardTitle>Análisis de Salidas</CardTitle>
          <CardDescription>Principales medicamentos dispensados recientemente</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicamento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Total Dispensado</TableHead>
                <TableHead>Frecuencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reporteConsumo.length > 0 ? (
                reporteConsumo.slice(0, 5).map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.nombre_medicamento}</TableCell>
                    <TableCell><Badge variant="outline">{item.tipo_medicamento}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-blue-600 font-semibold">
                        <ArrowUpRight className="w-4 h-4" />
                        {item.cantidad_total}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500">{item.num_movimientos} veces</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No se registran movimientos de salida todavía.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}