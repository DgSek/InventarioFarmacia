const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_FARMACIA_USER,       
  host: process.env.DB_FARMACIA_HOST,     
  database: process.env.DB_FARMACIA_NAME,   
  password: String(process.env.DB_FARMACIA_PASSWORD), 
  port: process.env.DB_FARMACIA_PORT || 5432,
  ssl: false,
  options: "-c search_path=farmacia"       
});

pool.query('SELECT NOW()', (err) => {
  if (err) console.error('❌ Error de conexión:', err.message);
  else console.log('✅ Conexión exitosa a PostgreSQL (Esquema principal: farmacia)');
});

// ==========================================
// --- MEDICAMENTOS ---
// ==========================================

app.get('/api/medicamentos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Medicamentos ORDER BY nombre ASC');
    res.json(result.rows || []); 
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/medicamentos', async (req, res) => {
  // MODIFICADO: Se eliminó 'sede' de aquí
  const { nombre, tipo_medicamento, stock_minimo, ubicacion, estante, codigo_barras, activo } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO Medicamentos 
      (nombre, tipo_medicamento, stock_minimo, ubicacion, estante, codigo_barras, activo) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [nombre, tipo_medicamento, stock_minimo, ubicacion, estante, codigo_barras, activo]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/medicamentos/:id', async (req, res) => {
  const { id } = req.params;
  // MODIFICADO: Se eliminó 'sede' de aquí
  const { nombre, tipo_medicamento, stock_minimo, ubicacion, estante, codigo_barras, activo } = req.body;
  try {
    const result = await pool.query(
      `UPDATE Medicamentos SET 
      nombre=$1, tipo_medicamento=$2, stock_minimo=$3, ubicacion=$4, estante=$5, codigo_barras=$6, activo=$7
      WHERE id_medicamento=$8 RETURNING *`,
      [nombre, tipo_medicamento, stock_minimo, ubicacion, estante, codigo_barras, activo, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// --- EXISTENCIAS ---
// ==========================================

app.get('/api/existencias', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, m.nombre as nombre_medicamento, m.activo 
      FROM Existencias e
      LEFT JOIN Medicamentos m ON e.id_medicamento = m.id_medicamento
      ORDER BY e.fecha_registro DESC
    `);
    res.json(result.rows || []);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener existencias' });
  }
});

app.post('/api/existencias', async (req, res) => {
  // MODIFICADO: Ahora recibe 'sede' y la incluye en la lógica de conflicto
  const { id_medicamento, concentracion, cantidad_actual, fecha_registro, sede } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO Existencias (id_medicamento, concentracion, cantidad_actual, fecha_registro, sede) 
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT (id_medicamento, concentracion, sede) 
       DO UPDATE SET 
          cantidad_actual = Existencias.cantidad_actual + EXCLUDED.cantidad_actual,
          fecha_registro = CURRENT_TIMESTAMP
       RETURNING *`, 
      [id_medicamento, concentracion, cantidad_actual, fecha_registro, sede]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// --- MOVIMIENTOS (FARMACIA) ---
// ==========================================

app.get('/api/movimientos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Movimientos ORDER BY fecha DESC'); 
    res.json(result.rows || []);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener movimientos' });
  }
});

app.post('/api/movimientos', async (req, res) => {
  const { id_existencia, tipo_movimiento, cantidad, id_usuario, observaciones, folio } = req.body;
  const operador = (tipo_movimiento.toLowerCase() === 'entrada') ? '+' : '-';

  try {
    await pool.query('BEGIN');
    const nuevoMovimiento = await pool.query(
      `INSERT INTO Movimientos (id_existencia, tipo_movimiento, cantidad, id_usuario, observaciones, folio) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id_existencia, tipo_movimiento, cantidad, id_usuario, observaciones, folio]
    );
    await pool.query(
      `UPDATE Existencias SET cantidad_actual = cantidad_actual ${operador} $1 WHERE id_existencia = $2`,
      [cantidad, id_existencia]
    );
    await pool.query('COMMIT');
    res.json(nuevoMovimiento.rows[0]);
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// --- INSUMOS Y DONACIONES ---
// ==========================================

app.get('/api/insumos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Insumos ORDER BY nombre_insumo ASC');
    res.json(result.rows || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/insumos/entrada', async (req, res) => {
  const { nombre_insumo, cantidad, folio, observaciones } = req.body;
  const folioID = parseInt(folio);

  try {
    await pool.query('BEGIN');

    let insumoRes = await pool.query('SELECT id_insumo FROM Insumos WHERE nombre_insumo = $1', [nombre_insumo]);
    let id_insumo;

    if (insumoRes.rows.length === 0) {
      const nuevo = await pool.query(
        'INSERT INTO Insumos (nombre_insumo, cantidad_actual) VALUES ($1, $2) RETURNING id_insumo',
        [nombre_insumo, cantidad]
      );
      id_insumo = nuevo.rows[0].id_insumo;
    } else {
      id_insumo = insumoRes.rows[0].id_insumo;
      await pool.query('UPDATE Insumos SET cantidad_actual = cantidad_actual + $1 WHERE id_insumo = $2', [cantidad, id_insumo]);
    }

    const entrada = await pool.query(
      'INSERT INTO entradas_insumos (id_insumo, cantidad, folio, observaciones) VALUES ($1, $2, $3, $4) RETURNING *',
      [id_insumo, cantidad, folioID, observaciones]
    );

    await pool.query('COMMIT');
    res.json(entrada.rows[0]);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error en entrada insumo:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/insumos/salida', async (req, res) => {
  const { id_insumo, cantidad, observacion, folio } = req.body;
  const folioID = parseInt(folio);

  try {
    await pool.query('BEGIN');
    await pool.query(
      'INSERT INTO Salidas_Insumos (id_insumo, cantidad, observacion, folio) VALUES ($1, $2, $3, $4)',
      [id_insumo, cantidad, observacion, folioID]
    );
    await pool.query('UPDATE Insumos SET cantidad_actual = cantidad_actual - $1 WHERE id_insumo = $2', [cantidad, id_insumo]);
    await pool.query('COMMIT');
    res.json({ message: "Salida registrada" });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/insumos/salidas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Salidas_Insumos ORDER BY fecha DESC');
    res.json(result.rows || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/insumos/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM Insumos WHERE id_insumo = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// --- EQUIPO MÉDICO ---
// ==========================================

app.get('/api/equipo-medico', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Equipo_Medico ORDER BY nombre_equipo ASC');
    res.json(result.rows || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/equipo-medico', async (req, res) => {
  const { nombre_equipo, descripcion, estado } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO Equipo_Medico (nombre_equipo, descripcion, estado) VALUES ($1, $2, $3) RETURNING *',
      [nombre_equipo, descripcion, estado]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/equipo-medico/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre_equipo, descripcion, estado } = req.body;
  try {
    const result = await pool.query(
      'UPDATE Equipo_Medico SET nombre_equipo=$1, descripcion=$2, estado=$3 WHERE id_equipo=$4 RETURNING *',
      [nombre_equipo, descripcion, estado, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/equipo-medico/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM Equipo_Medico WHERE id_equipo = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// --- FOLIOS (EXTERNAL SCHEMA: DONACIONES) ---
// ==========================================

app.get('/api/folios-activos', async (req, res) => {
  try {
    const folios = await pool.query(`
      SELECT * FROM donaciones.folios_maestros 
      WHERE estatus_folio ILIKE 'true' 
      AND area_origen = 'Farmacia'
    `);
    res.json(folios.rows);
  } catch (err) {
    console.error('Error en folios:', err.message);
    res.status(500).json({ error: 'Error al consultar folios de Farmacia' });
  }
});

// ==========================================
// --- USUARIOS ---
// ==========================================

app.get('/api/usuarios', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Usuarios');
    res.json(result.rows || []);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

app.listen(5000, () => {
  console.log('✅ Servidor sincronizado y escuchando en puerto 5000');
});