import {
  Medicamento,
  Existencia,
  Movimiento,
  Usuario,
  TipoMovimiento,
  Alerta,
  ReporteConsumo,
  Insumo,
  SalidaInsumo,
  EquipoMedico,
} from '../types';

const API_URL = 'http://localhost:5000/api';

export const storage = {
  // --- MEDICAMENTOS ---
  async getMedicamentos(): Promise<Medicamento[]> {
    const response = await fetch(`${API_URL}/medicamentos`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },

  async saveMedicamento(medicamento: Omit<Medicamento, 'id_medicamento'>): Promise<Medicamento> {
    const response = await fetch(`${API_URL}/medicamentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(medicamento),
    });
    return await response.json();
  },

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
    const data = await response.json();
    return Array.isArray(data) ? data : [];
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
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },

  async registrarMovimiento(
    id_existencia: number,
    tipo_movimiento: TipoMovimiento,
    cantidad: number,
    id_usuario: number,
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

  // --- INSUMOS ---
  async getInsumos(): Promise<Insumo[]> {
    const response = await fetch(`${API_URL}/insumos`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },

  async saveInsumo(insumo: Omit<Insumo, 'id_insumo'>): Promise<Insumo> {
    const response = await fetch(`${API_URL}/insumos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(insumo),
    });
    return await response.json();
  },

  // CORRECCIÓN: Función para actualizar insumos (resuelve error de tipos)
  async updateInsumo(insumo: Insumo): Promise<Insumo> {
    const response = await fetch(`${API_URL}/insumos/${insumo.id_insumo}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(insumo),
    });
    return await response.json();
  },

  // NUEVO: Función para eliminar insumos físicamente de la DB
  async deleteInsumo(id_insumo: number): Promise<boolean> {
    const response = await fetch(`${API_URL}/insumos/${id_insumo}`, {
      method: 'DELETE',
    });
    return response.ok;
  },

  async registrarSalidaInsumo(id_insumo: number, cantidad: number, observacion?: string): Promise<boolean> {
    const response = await fetch(`${API_URL}/insumos/salida`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_insumo, cantidad, observacion }),
    });
    return response.ok;
  },

  async getSalidasInsumos(): Promise<SalidaInsumo[]> {
    const response = await fetch(`${API_URL}/insumos/salidas`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },

  // --- EQUIPO MÉDICO ---
  async getEquipoMedico(): Promise<EquipoMedico[]> {
    const response = await fetch(`${API_URL}/equipo-medico`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },

  async saveEquipoMedico(equipo: Omit<EquipoMedico, 'id_equipo'>): Promise<EquipoMedico> {
    const response = await fetch(`${API_URL}/equipo-medico`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(equipo),
    });
    return await response.json();
  },

  async updateEquipoMedico(equipo: EquipoMedico): Promise<EquipoMedico> {
    const response = await fetch(`${API_URL}/equipo-medico/${equipo.id_equipo}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(equipo),
    });
    return await response.json();
  },

  // NUEVO: Función para eliminar equipo médico
  async deleteEquipoMedico(id_equipo: number): Promise<boolean> {
    const response = await fetch(`${API_URL}/equipo-medico/${id_equipo}`, {
      method: 'DELETE',
    });
    return response.ok;
  },

  // --- UTILIDADES E INVENTARIO ---
  async getUsuarios(): Promise<Usuario[]> {
    const response = await fetch(`${API_URL}/usuarios`);
    return await response.json();
  },

  async getInventarioCompleto() {
    const [medicamentos, existencias] = await Promise.all([
      this.getMedicamentos(),
      this.getExistencias()
    ]);

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
    return usuarios.find((u: any) => u.id_usuario === 1) || usuarios[0] || { id_usuario: 1, nombre_usuario: 'Admin' };
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
        sm: item.medicamento.stock_minimo,
        ubicacion: item.medicamento.ubicacion,
        estante: item.medicamento.estante,
        sede: item.medicamento.sede
      }));
  }
};