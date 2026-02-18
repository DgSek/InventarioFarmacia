import { useEffect, useState } from 'react';
import { storage } from '../data/storage';
import { Alerta } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  AlertTriangle, 
  Package, 
  TrendingUp, 
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';

export function Dashboard() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [stats, setStats] = useState({
    totalMedicamentos: 0,
    medicamentosActivos: 0,
    totalExistencias: 0,
    movimientosHoy: 0,
  });
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = () => {
    const medicamentos = storage.getMedicamentos();
    const existencias = storage.getExistencias();
    const movimientos = storage.getMovimientos();
    const alertasData = storage.getAlertas();
    
    // Calcular estadísticas
    const hoy = new Date().toISOString().split('T')[0];
    const movimientosHoy = movimientos.filter(m => 
      m.fecha.startsWith(hoy)
    ).length;
    
    const totalExistencias = existencias.reduce((sum, e) => sum + e.cantidad_actual, 0);
    
    setStats({
      totalMedicamentos: medicamentos.length,
      medicamentosActivos: medicamentos.filter(m => m.activo).length,
      totalExistencias,
      movimientosHoy,
    });
    
    setAlertas(alertasData);
  };
  
  const reporteConsumo = storage.getReporteConsumo().slice(0, 5);
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Dashboard</h2>
        <p className="text-gray-600 mt-1">Resumen general del inventario de medicamentos</p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: '#A5867A' }}>Medicamentos</p>
                <p className="text-2xl font-semibold mt-1" style={{ color: '#3A3533' }}>{stats.medicamentosActivos}</p>
                <p className="text-xs mt-1" style={{ color: '#A5867A' }}>Activos</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#ECD2D1' }}>
                <Package className="w-6 h-6" style={{ color: '#6DA2B3' }} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: '#A5867A' }}>Existencias Totales</p>
                <p className="text-2xl font-semibold mt-1" style={{ color: '#3A3533' }}>{stats.totalExistencias}</p>
                <p className="text-xs mt-1" style={{ color: '#A5867A' }}>Unidades</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#ECD2D1' }}>
                <TrendingUp className="w-6 h-6" style={{ color: '#6DA2B3' }} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: '#A5867A' }}>Movimientos Hoy</p>
                <p className="text-2xl font-semibold mt-1" style={{ color: '#3A3533' }}>{stats.movimientosHoy}</p>
                <p className="text-xs mt-1" style={{ color: '#A5867A' }}>Registros</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#ECD2D1' }}>
                <Activity className="w-6 h-6" style={{ color: '#A37D5A' }} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: '#A5867A' }}>Alertas de Stock</p>
                <p className="text-2xl font-semibold mt-1" style={{ color: '#3A3533' }}>{alertas.length}</p>
                <p className="text-xs mt-1" style={{ color: '#A5867A' }}>Requieren atención</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#96453B', opacity: 0.1 }}>
                <AlertTriangle className="w-6 h-6" style={{ color: '#96453B', opacity: 1 }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Alertas de Stock Mínimo */}
      {alertas.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" style={{ color: '#96453B' }} />
              <CardTitle>Alertas de Stock Mínimo</CardTitle>
            </div>
            <CardDescription>
              Medicamentos que requieren reposición urgente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicamento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Cantidad Actual</TableHead>
                  <TableHead>Stock Mínimo</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alertas.map((alerta) => (
                  <TableRow key={alerta.id_medicamento}>
                    <TableCell className="font-medium">{alerta.nombre_medicamento}</TableCell>
                    <TableCell>{alerta.tipo_medicamento}</TableCell>
                    <TableCell>{alerta.ubicacion}</TableCell>
                    <TableCell>
                      <span className="font-semibold" style={{ color: '#96453B' }}>{alerta.cantidad_total}</span>
                    </TableCell>
                    <TableCell>{alerta.stock_minimo}</TableCell>
                    <TableCell>
                      <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                        <ArrowDownRight className="w-3 h-3" />
                        Bajo stock
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      
      {/* Medicamentos Más Consumidos */}
      <Card>
        <CardHeader>
          <CardTitle>Medicamentos Más Consumidos</CardTitle>
          <CardDescription>Top 5 de medicamentos con mayor salida</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicamento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cantidad Total Dispensada</TableHead>
                <TableHead>Movimientos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reporteConsumo.length > 0 ? (
                reporteConsumo.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.nombre_medicamento}</TableCell>
                    <TableCell>{item.tipo_medicamento}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ArrowUpRight className="w-4 h-4" style={{ color: '#6DA2B3' }} />
                        <span className="font-semibold">{item.cantidad_total}</span>
                      </div>
                    </TableCell>
                    <TableCell>{item.num_movimientos}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8" style={{ color: '#A5867A' }}>
                    No hay datos de consumo disponibles
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