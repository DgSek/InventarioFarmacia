// Tipos del sistema de inventario de medicamentos

export interface Medicamento {
  id_medicamento: number;
  tipo_medicamento: string;
  nombre: string;
  concentracion: string;
  stock_minimo: number;
  activo: boolean;
  ubicacion: string;
}

export interface Existencia {
  id_existencia: number;
  id_medicamento: number;
  codigo_referencia: string;
  cantidad_actual: number;
  fecha_registro: string;
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
}

export interface Usuario {
  id_usuario: number;
  nombre: string;
  rol: string;
}

export interface Alerta {
  id_medicamento: number;
  nombre_medicamento: string;
  cantidad_total: number;
  stock_minimo: number;
  tipo_medicamento: string;
  ubicacion: string;
}

export interface ReporteConsumo {
  nombre_medicamento: string;
  tipo_medicamento: string;
  cantidad_total: number;
  num_movimientos: number;
}
