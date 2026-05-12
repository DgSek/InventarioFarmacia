// Tipos del sistema de inventario de medicamentos

export interface Medicamento {
  id_medicamento: number;
  tipo_medicamento: string;
  nombre: string;
  codigo_barras: string;
  stock_minimo: number;
  activo: boolean;
  ubicacion: string;
  estante?: string;
  folio?: string;
}

export interface Existencia {
  id_existencia: number;
  id_medicamento: number;
  concentracion: string;
  cantidad_actual: number;
  fecha_registro: string;
  sede: string;
}

export type TipoMovimiento = 'entrada' | 'salida' | 'caducado';

export interface Movimiento {
  id_movimiento: number;
  id_existencia: number;
  tipo_movimiento: TipoMovimiento;
  cantidad: number;
  fecha: string;
  id_usuario: number;
  observaciones?: string;
  folio?: string;
  sede: string;
}

export interface Usuario {
  id_usuario: number;
  nombre_usuario: string; // Cambiado para coincidir con el comando SQL que usamos
}

export interface Alerta {
  id_medicamento: number;
  nombre_medicamento: string;
  cantidad_total: number;
  stock_minimo: number;
  tipo_medicamento: string;
  ubicacion: string;
  estante?: string;
  sede: string;
}

export interface ReporteConsumo {
  nombre_medicamento: string;
  tipo_medicamento: string;
  cantidad_total: number;
  num_movimientos: number;
  sede: string;
}

// Tipos para Insumos
export interface Insumo {
  id_insumo: number;
  nombre_insumo: string;
  tipo_insumo: string; // Esta es la columna real de tu DB
  cantidad_actual: number;
  observaciones?: string; // Para el desglose de cajas
  folio?: number;
}

export interface EntradaInsumo {
  id_entrada: number;
  id_insumo: number;
  cantidad: number;
  folio: number; 
  fecha: string;
  observaciones?: string;
}

export interface SalidaInsumo {
  id_salida: number;
  id_insumo: number;
  cantidad: number;
  fecha: string;
  observacion?: string;
  folio: number;
}

// Tipos para Equipo Médico
export interface EquipoMedico {
  id_equipo: number;
  nombre_equipo: string;
  descripcion: string;
  estado: string;
}