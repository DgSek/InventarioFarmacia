// src/data/storage.ts
import {
  Medicamento,
  Existencia,
  Movimiento,
  Usuario,
  TipoMovimiento,
  Alerta,
  ReporteConsumo,
} from '../types';

// URL base de tu API (Node.js/Express)
const API_URL = 'http://localhost:5000/api';

export const storage = {
  // --- MEDICAMENTOS ---
  async getMedicamentos(): Promise<Medicamento[]> {
    const response = await fetch(`${API_URL}/medicamentos`);
    const data = await response.json();
    // Forzamos que retorne un arreglo para evitar el error .filter de la pantalla blanca
    return Array.isArray(data) ? data : [];
  },

  async saveMedicamento(medicamento: Omit<Medicamento, 'id_medicamento'>): Promise<Medicamento> {
    const response = await fetch(`${API_URL}/medicamentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // El objeto 'medicamento' ya debe traer codigo_barras desde el formulario
      body: JSON.stringify(medicamento),
    });
    return await response.json();
  },

  // En src/data/storage.ts
  async updateMedicamento(medicamento: Medicamento): Promise<Medicamento> {
    const response = await fetch(`${API_URL}/medicamentos/${medicamento.id_medicamento}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(medicamento),
    });
    return await response.json();
  },

  // --- EXISTENCIAS ---
  async getExistencias(): Promise<Existencia[]> {
    const response = await fetch(`${API_URL}/existencias`);
    return await response.json();
  },

  async saveExistencia(existencia: Omit<Existencia, 'id_existencia'>): Promise<Existencia> {
    const response = await fetch(`${API_URL}/existencias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(existencia),
    });
    return await response.json();
  },

  // --- MOVIMIENTOS ---
  async getMovimientos(): Promise<Movimiento[]> {
    const response = await fetch(`${API_URL}/movimientos`);
    return await response.json();
  },

  async registrarMovimiento(
    id_existencia: number,
    tipo_movimiento: TipoMovimiento,
    cantidad: number,
    id_usuario: number, // Añadido para que coincida con tu tabla SQL
    observaciones?: string
  ): Promise<Movimiento | null> {
    const response = await fetch(`${API_URL}/movimientos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_existencia, tipo_movimiento, cantidad, id_usuario, observaciones }),
    });

    if (!response.ok) return null;
    return await response.json();
  },

  // --- USUARIOS ---
  async getUsuarios(): Promise<Usuario[]> {
    const response = await fetch(`${API_URL}/usuarios`);
    return await response.json();
  },


  async getInventarioCompleto() {
    // Obtenemos los datos base del servidor
    const [medicamentos, existencias] = await Promise.all([
      this.getMedicamentos(),
      this.getExistencias()
    ]);

    // Procesamos la lógica en el cliente para el prototipo
    return medicamentos.filter(m => m.activo).map(medicamento => {
      const existenciasMed = existencias.filter(e => e.id_medicamento === medicamento.id_medicamento);
      const cantidad_total = existenciasMed.reduce((sum, e) => sum + e.cantidad_actual, 0);

      return {
        medicamento,
        existencias: existenciasMed,
        cantidad_total,
      };
    });
  },

  async getReporteConsumo(): Promise<ReporteConsumo[]> {
    const [movimientos, existencias, medicamentos] = await Promise.all([
      this.getMovimientos(),
      this.getExistencias(),
      this.getMedicamentos()
    ]);

    const salidas = movimientos.filter(m => m.tipo_movimiento === 'salida');
    const conteo = new Map<number, { cant: number; movs: number }>();

    salidas.forEach(mov => {
      const ex = existencias.find(e => e.id_existencia === mov.id_existencia);
      if (ex) {
        const actual = conteo.get(ex.id_medicamento) || { cant: 0, movs: 0 };
        conteo.set(ex.id_medicamento, {
          cant: actual.cant + mov.cantidad,
          movs: actual.movs + 1
        });
      }
    });

    return Array.from(conteo.entries()).map(([id, data]) => {
      const med = medicamentos.find(m => m.id_medicamento === id);
      return {
        nombre_medicamento: med?.nombre || 'Desconocido',
        tipo_medicamento: med?.tipo_medicamento || 'N/A',
        cantidad_total: data.cant,
        num_movimientos: data.movs
      };
    }).sort((a, b) => b.cantidad_total - a.cantidad_total);
  },

  async getCurrentUser(): Promise<Usuario> {
    const response = await fetch(`${API_URL}/usuarios`);
    const usuarios = await response.json();
    // Retornamos el primer usuario por defecto para el prototipo
    return usuarios.find((u: any) => u.id_usuario === 1) || usuarios[0];
  },

  async getAlertas(): Promise<Alerta[]> {
    const inventario = await this.getInventarioCompleto();

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
  }
};