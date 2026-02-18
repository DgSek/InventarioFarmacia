// Sistema de almacenamiento local para el inventario de medicamentos
import {
  Medicamento,
  Existencia,
  Movimiento,
  Usuario,
  TipoMovimiento,
  Alerta,
  ReporteConsumo,
} from '../types';

// Usuario actual (simulado)
const CURRENT_USER_ID = 1;

// Datos iniciales
const initialMedicamentos: Medicamento[] = [
  {
    id_medicamento: 1,
    tipo_medicamento: 'Analgésico',
    nombre: 'Paracetamol',
    concentracion: '500mg',
    stock_minimo: 100,
    activo: true,
    ubicacion: 'Estante A1',
  },
  {
    id_medicamento: 2,
    tipo_medicamento: 'Antibiótico',
    nombre: 'Amoxicilina',
    concentracion: '500mg',
    stock_minimo: 50,
    activo: true,
    ubicacion: 'Estante B2',
  },
  {
    id_medicamento: 3,
    tipo_medicamento: 'Antiinflamatorio',
    nombre: 'Ibuprofeno',
    concentracion: '400mg',
    stock_minimo: 80,
    activo: true,
    ubicacion: 'Estante A2',
  },
  {
    id_medicamento: 4,
    tipo_medicamento: 'Antihipertensivo',
    nombre: 'Losartán',
    concentracion: '50mg',
    stock_minimo: 60,
    activo: true,
    ubicacion: 'Estante C1',
  },
  {
    id_medicamento: 5,
    tipo_medicamento: 'Antidiabético',
    nombre: 'Metformina',
    concentracion: '850mg',
    stock_minimo: 70,
    activo: true,
    ubicacion: 'Estante C2',
  },
];

const initialExistencias: Existencia[] = [
  {
    id_existencia: 1,
    id_medicamento: 1,
    codigo_referencia: 'LOTE-2024-001',
    cantidad_actual: 250,
    fecha_registro: '2024-01-15',
  },
  {
    id_existencia: 2,
    id_medicamento: 1,
    codigo_referencia: 'LOTE-2024-002',
    cantidad_actual: 150,
    fecha_registro: '2024-02-10',
  },
  {
    id_existencia: 3,
    id_medicamento: 2,
    codigo_referencia: 'LOTE-2024-003',
    cantidad_actual: 30,
    fecha_registro: '2024-01-20',
  },
  {
    id_existencia: 4,
    id_medicamento: 3,
    codigo_referencia: 'LOTE-2024-004',
    cantidad_actual: 45,
    fecha_registro: '2024-02-01',
  },
  {
    id_existencia: 5,
    id_medicamento: 4,
    codigo_referencia: 'LOTE-2024-005',
    cantidad_actual: 100,
    fecha_registro: '2024-01-25',
  },
  {
    id_existencia: 6,
    id_medicamento: 5,
    codigo_referencia: 'LOTE-2024-006',
    cantidad_actual: 85,
    fecha_registro: '2024-02-05',
  },
];

const initialMovimientos: Movimiento[] = [
  {
    id_movimiento: 1,
    id_existencia: 1,
    tipo_movimiento: 'entrada',
    cantidad: 300,
    fecha: '2024-01-15T10:00:00',
    id_usuario: 1,
    observaciones: 'Compra inicial',
  },
  {
    id_movimiento: 2,
    id_existencia: 1,
    tipo_movimiento: 'salida',
    cantidad: 50,
    fecha: '2024-02-10T14:30:00',
    id_usuario: 1,
    observaciones: 'Dispensación',
  },
  {
    id_movimiento: 3,
    id_existencia: 2,
    tipo_movimiento: 'entrada',
    cantidad: 200,
    fecha: '2024-02-10T09:00:00',
    id_usuario: 1,
    observaciones: 'Donación',
  },
  {
    id_movimiento: 4,
    id_existencia: 2,
    tipo_movimiento: 'salida',
    cantidad: 50,
    fecha: '2024-02-15T11:00:00',
    id_usuario: 1,
    observaciones: 'Dispensación',
  },
  {
    id_movimiento: 5,
    id_existencia: 3,
    tipo_movimiento: 'entrada',
    cantidad: 100,
    fecha: '2024-01-20T08:00:00',
    id_usuario: 1,
    observaciones: 'Compra',
  },
  {
    id_movimiento: 6,
    id_existencia: 3,
    tipo_movimiento: 'salida',
    cantidad: 70,
    fecha: '2024-02-12T16:00:00',
    id_usuario: 1,
    observaciones: 'Dispensación',
  },
];

const initialUsuarios: Usuario[] = [
  { id_usuario: 1, nombre: 'Dr. Juan Pérez', rol: 'Administrador' },
  { id_usuario: 2, nombre: 'Enf. María García', rol: 'Farmacéutico' },
  { id_usuario: 3, nombre: 'Dr. Carlos López', rol: 'Médico' },
];

// Funciones de utilidad para localStorage
function getFromStorage<T>(key: string, defaultValue: T): T {
  const stored = localStorage.getItem(key);
  if (!stored) return defaultValue;
  try {
    return JSON.parse(stored);
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// API del storage
export const storage = {
  // Medicamentos
  getMedicamentos(): Medicamento[] {
    return getFromStorage('medicamentos', initialMedicamentos);
  },
  
  saveMedicamento(medicamento: Omit<Medicamento, 'id_medicamento'>): Medicamento {
    const medicamentos = this.getMedicamentos();
    const newId = Math.max(0, ...medicamentos.map(m => m.id_medicamento)) + 1;
    const newMedicamento = { ...medicamento, id_medicamento: newId };
    medicamentos.push(newMedicamento);
    saveToStorage('medicamentos', medicamentos);
    return newMedicamento;
  },
  
  updateMedicamento(medicamento: Medicamento): void {
    const medicamentos = this.getMedicamentos();
    const index = medicamentos.findIndex(m => m.id_medicamento === medicamento.id_medicamento);
    if (index !== -1) {
      medicamentos[index] = medicamento;
      saveToStorage('medicamentos', medicamentos);
    }
  },
  
  // Existencias
  getExistencias(): Existencia[] {
    return getFromStorage('existencias', initialExistencias);
  },
  
  saveExistencia(existencia: Omit<Existencia, 'id_existencia'>): Existencia {
    const existencias = this.getExistencias();
    const newId = Math.max(0, ...existencias.map(e => e.id_existencia)) + 1;
    const newExistencia = { ...existencia, id_existencia: newId };
    existencias.push(newExistencia);
    saveToStorage('existencias', existencias);
    return newExistencia;
  },
  
  updateExistencia(id: number, cantidad: number): void {
    const existencias = this.getExistencias();
    const index = existencias.findIndex(e => e.id_existencia === id);
    if (index !== -1) {
      existencias[index].cantidad_actual = cantidad;
      saveToStorage('existencias', existencias);
    }
  },
  
  // Movimientos
  getMovimientos(): Movimiento[] {
    return getFromStorage('movimientos', initialMovimientos);
  },
  
  registrarMovimiento(
    id_existencia: number,
    tipo_movimiento: TipoMovimiento,
    cantidad: number,
    observaciones?: string
  ): Movimiento | null {
    // Validar que la existencia existe
    const existencias = this.getExistencias();
    const existencia = existencias.find(e => e.id_existencia === id_existencia);
    if (!existencia) return null;
    
    // Validar stock negativo
    if ((tipo_movimiento === 'salida' || tipo_movimiento === 'caducado') && 
        existencia.cantidad_actual < cantidad) {
      return null;
    }
    
    // Crear movimiento
    const movimientos = this.getMovimientos();
    const newId = Math.max(0, ...movimientos.map(m => m.id_movimiento)) + 1;
    const newMovimiento: Movimiento = {
      id_movimiento: newId,
      id_existencia,
      tipo_movimiento,
      cantidad,
      fecha: new Date().toISOString(),
      id_usuario: CURRENT_USER_ID,
      observaciones,
    };
    
    movimientos.push(newMovimiento);
    saveToStorage('movimientos', movimientos);
    
    // Actualizar cantidad_actual
    let nuevaCantidad = existencia.cantidad_actual;
    if (tipo_movimiento === 'entrada') {
      nuevaCantidad += cantidad;
    } else {
      nuevaCantidad -= cantidad;
    }
    this.updateExistencia(id_existencia, nuevaCantidad);
    
    return newMovimiento;
  },
  
  // Usuarios
  getUsuarios(): Usuario[] {
    return getFromStorage('usuarios', initialUsuarios);
  },
  
  getCurrentUser(): Usuario {
    return this.getUsuarios().find(u => u.id_usuario === CURRENT_USER_ID) || initialUsuarios[0];
  },
  
  // Consultas avanzadas
  getInventarioCompleto(): Array<{
    medicamento: Medicamento;
    existencias: Existencia[];
    cantidad_total: number;
  }> {
    const medicamentos = this.getMedicamentos().filter(m => m.activo);
    const existencias = this.getExistencias();
    
    return medicamentos.map(medicamento => {
      const existenciasMed = existencias.filter(e => e.id_medicamento === medicamento.id_medicamento);
      const cantidad_total = existenciasMed.reduce((sum, e) => sum + e.cantidad_actual, 0);
      
      return {
        medicamento,
        existencias: existenciasMed,
        cantidad_total,
      };
    });
  },
  
  getAlertas(): Alerta[] {
    const inventario = this.getInventarioCompleto();
    
    return inventario
      .filter(item => item.cantidad_total <= item.medicamento.stock_minimo)
      .map(item => ({
        id_medicamento: item.medicamento.id_medicamento,
        nombre_medicamento: item.medicamento.nombre,
        cantidad_total: item.cantidad_total,
        stock_minimo: item.medicamento.stock_minimo,
        tipo_medicamento: item.medicamento.tipo_medicamento,
        ubicacion: item.medicamento.ubicacion,
      }));
  },
  
  getReporteConsumo(mes?: number, anio?: number): ReporteConsumo[] {
    const movimientos = this.getMovimientos();
    const existencias = this.getExistencias();
    const medicamentos = this.getMedicamentos();
    
    // Filtrar por fecha si se especifica
    let movimientosFiltrados = movimientos.filter(m => m.tipo_movimiento === 'salida');
    if (mes !== undefined && anio !== undefined) {
      movimientosFiltrados = movimientosFiltrados.filter(m => {
        const fecha = new Date(m.fecha);
        return fecha.getMonth() === mes && fecha.getFullYear() === anio;
      });
    }
    
    // Agrupar por medicamento
    const consumoPorMedicamento = new Map<number, { cantidad: number; movimientos: number }>();
    
    movimientosFiltrados.forEach(mov => {
      const existencia = existencias.find(e => e.id_existencia === mov.id_existencia);
      if (existencia) {
        const current = consumoPorMedicamento.get(existencia.id_medicamento) || { cantidad: 0, movimientos: 0 };
        consumoPorMedicamento.set(existencia.id_medicamento, {
          cantidad: current.cantidad + mov.cantidad,
          movimientos: current.movimientos + 1,
        });
      }
    });
    
    // Construir reporte
    const reporte: ReporteConsumo[] = [];
    consumoPorMedicamento.forEach((datos, id_medicamento) => {
      const medicamento = medicamentos.find(m => m.id_medicamento === id_medicamento);
      if (medicamento) {
        reporte.push({
          nombre_medicamento: medicamento.nombre,
          tipo_medicamento: medicamento.tipo_medicamento,
          cantidad_total: datos.cantidad,
          num_movimientos: datos.movimientos,
        });
      }
    });
    
    return reporte.sort((a, b) => b.cantidad_total - a.cantidad_total);
  },
  
  // Resetear datos
  resetData(): void {
    saveToStorage('medicamentos', initialMedicamentos);
    saveToStorage('existencias', initialExistencias);
    saveToStorage('movimientos', initialMovimientos);
    saveToStorage('usuarios', initialUsuarios);
  },
};
