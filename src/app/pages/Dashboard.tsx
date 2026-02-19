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
  Loader2
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { ReporteConsumo } from '../types';

export function Dashboard() {
  // --- CARGA DE DATOS ASÍNCRONA ---
  // Añadimos un valor por defecto [] y verificamos que sea un arreglo
  const { data: medicamentos = [], isLoading: loadingMeds } = useQuery({
    queryKey: ['medicamentos'],
    queryFn: async () => {
      const res = await storage.getMedicamentos();
      return Array.isArray(res) ? res : [];
    },
  });

  const { data: existencias = [], isLoading: loadingEx } = useQuery({
    queryKey: ['existencias'],
    queryFn: async () => {
      const res = await storage.getExistencias();
      return Array.isArray(res) ? res : [];
    },
  });

  const { data: movimientos = [], isLoading: loadingMovs } = useQuery({
    queryKey: ['movimientos'],
    queryFn: async () => {
      const res = await storage.getMovimientos();
      return Array.isArray(res) ? res : [];
    },
  });

  const { data: alertas = [], isLoading: loadingAlerts } = useQuery({
    queryKey: ['alertas'],
    queryFn: async () => {
      const res = await storage.getAlertas();
      return Array.isArray(res) ? res : [];
    },
  });

  const { data: reporteConsumo = [] } = useQuery<ReporteConsumo[]>({
    queryKey: ['reporte-consumo'],
    queryFn: () => storage.getReporteConsumo(),
    enabled: medicamentos.length > 0
  });

  // --- CÁLCULO DE ESTADÍSTICAS ---
  const hoy = new Date().toISOString().split('T')[0];
  
  // CORRECCIÓN: Usar 'fecha_movimiento' que es el nombre real en tu DB de Ubuntu
  const movimientosHoy = movimientos.filter(m => 
    m.fecha && m.fecha.toString().startsWith(hoy)
  ).length;

  const totalExistencias = existencias.reduce((sum, e) => sum + (Number(e.cantidad_actual) || 0), 0);
  const medicamentosActivos = medicamentos.filter(m => m.activo).length;

  if (loadingMeds || loadingEx || loadingMovs || loadingAlerts) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <p className="text-gray-500 font-medium">Sincronizando con tilinescraft.serveminecraft.net...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Dashboard de Control</h2>
        <p className="text-gray-600 mt-1 font-mono text-sm">Estado del servidor: Conectado</p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Catálogo</p>
                <p className="text-2xl font-bold mt-1 text-slate-800">{medicamentosActivos}</p>
                <p className="text-xs text-green-600 mt-1 font-medium">Items Activos</p>
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
                <p className="text-sm font-medium text-muted-foreground">Stock Físico</p>
                <p className="text-2xl font-bold mt-1 text-slate-800">{totalExistencias}</p>
                <p className="text-xs text-slate-500 mt-1">Total unidades</p>
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
                <p className="text-sm font-medium text-muted-foreground">Flujo Hoy</p>
                <p className="text-2xl font-bold mt-1 text-slate-800">{movimientosHoy}</p>
                <p className="text-xs text-slate-500 mt-1">E/S registradas</p>
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
                <p className="text-sm font-medium text-muted-foreground">Alertas</p>
                <p className={`text-2xl font-bold mt-1 ${alertas.length > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                  {alertas.length}
                </p>
                <p className="text-xs text-slate-500 mt-1">Por debajo del mínimo</p>
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
        <Card className="border-red-200 shadow-lg">
          <CardHeader className="bg-red-50/50">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <CardTitle className="text-red-900">Medicamentos por Agotarse</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicamento</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Actual</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alertas.map((alerta) => (
                  <TableRow key={alerta.id_medicamento}>
                    <TableCell className="font-bold text-red-700">{alerta.nombre_medicamento}</TableCell>
                    <TableCell className="text-slate-600">{alerta.ubicacion} / {alerta.estante || 'N/A'}</TableCell>
                    <TableCell className="font-bold">{alerta.cantidad_total}</TableCell>
                    <TableCell>
                      <Badge variant="destructive" className="animate-pulse">CRÍTICO (Mín: {alerta.stock_minimo})</Badge>
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
          <CardTitle>Top Salidas</CardTitle>
          <CardDescription>Medicamentos con mayor rotación en el periodo</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicamento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Movimientos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reporteConsumo.length > 0 ? (
                reporteConsumo.slice(0, 5).map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.nombre_medicamento}</TableCell>
                    <TableCell><Badge variant="outline">{item.tipo_medicamento}</Badge></TableCell>
                    <TableCell className="text-blue-600 font-bold">{item.cantidad_total} unidades</TableCell>
                    <TableCell className="text-slate-500">{item.num_movimientos} veces</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-slate-400 italic">
                    No se han registrado salidas para generar estadísticas.
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