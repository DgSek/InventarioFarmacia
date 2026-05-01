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
  else console.log('✅ Conexión exitosa a PostgreSQL (Esquema: farmacia)');
});

// --- MEDICAMENTOS ---

app.get('/api/medicamentos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Medicamentos ORDER BY nombre ASC');
    res.json(result.rows || []); 
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/medicamentos', async (req, res) => {
  // MODIFICACIÓN: Se eliminó concentracion de aquí
  const { nombre, tipo_medicamento, stock_minimo, ubicacion, estante, codigo_barras, activo, sede } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO Medicamentos 
      (nombre, tipo_medicamento, stock_minimo, ubicacion, estante, codigo_barras, activo, sede) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [nombre, tipo_medicamento, stock_minimo, ubicacion, estante, codigo_barras, activo, sede]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/medicamentos/:id', async (req, res) => {
  const { id } = req.params;
  // MODIFICACIÓN: Se eliminó concentracion de aquí
  const { nombre, tipo_medicamento, stock_minimo, ubicacion, estante, codigo_barras, activo, sede } = req.body;
  try {
    const result = await pool.query(
      `UPDATE Medicamentos SET 
      nombre=$1, tipo_medicamento=$2, stock_minimo=$3, ubicacion=$4, estante=$5, codigo_barras=$6, activo=$7, sede=$8
      WHERE id_medicamento=$9 RETURNING *`,
      [nombre, tipo_medicamento, stock_minimo, ubicacion, estante, codigo_barras, activo, sede, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- EXISTENCIAS ---

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
  // MODIFICACIÓN: Se cambió codigo_referencia por concentracion
  const { id_medicamento, concentracion, cantidad_actual, fecha_registro } = req.body;
  try {
    // Si tienes un UNIQUE CONSTRAINT en (id_medicamento, concentracion), el ON CONFLICT funcionará
    const result = await pool.query(
      `INSERT INTO Existencias (id_medicamento, concentracion, cantidad_actual, fecha_registro) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (id_medicamento, concentracion) 
       DO UPDATE SET 
          cantidad_actual = Existencias.cantidad_actual + EXCLUDED.cantidad_actual,
          fecha_registro = CURRENT_TIMESTAMP
       RETURNING *`, 
      [id_medicamento, concentracion, cantidad_actual, fecha_registro]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// --- MOVIMIENTOS ---

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
  
  const tipo = (tipo_movimiento || '').toLowerCase();
  const operador = (tipo === 'entrada') ? '+' : '-';

  try {
    await pool.query('BEGIN');

    const nuevoMovimiento = await pool.query(
      `INSERT INTO Movimientos (id_existencia, tipo_movimiento, cantidad, id_usuario, observaciones, folio) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
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
    console.error('Error en transacción:', err);
    res.status(500).json({ error: 'Error en la transacción', detalle: err.message });
  }
});

app.get('/api/folios-activos', async (req, res) => {
  try {
    const folios = await pool.query('SELECT * FROM v_folios_activos');
    res.json(folios.rows);
  } catch (err) {
    console.error('Error al obtener folios:', err);
    res.status(500).json({ error: 'Error al consultar folios activos' });
  }
});

// --- INSUMOS ---

app.get('/api/insumos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Insumos ORDER BY nombre_insumo ASC');
    res.json(result.rows || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/insumos', async (req, res) => {
  const { nombre_insumo, tipo_insumo, cantidad_actual } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO Insumos (nombre_insumo, tipo_insumo, cantidad_actual) VALUES ($1, $2, $3) RETURNING *',
      [nombre_insumo, tipo_insumo, cantidad_actual]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/insumos/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre_insumo, tipo_insumo, cantidad_actual } = req.body;
  try {
    const result = await pool.query(
      'UPDATE Insumos SET nombre_insumo=$1, tipo_insumo=$2, cantidad_actual=$3 WHERE id_insumo=$4 RETURNING *',
      [nombre_insumo, tipo_insumo, cantidad_actual, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/insumos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM Insumos WHERE id_insumo = $1', [id]);
    res.json({ success: true });
  } catch (err) {
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

app.post('/api/insumos/salida', async (req, res) => {
  const { id_insumo, cantidad, observacion } = req.body;
  try {
    await pool.query('BEGIN');
    await pool.query(
      'INSERT INTO Salidas_Insumos (id_insumo, cantidad, observacion) VALUES ($1, $2, $3)',
      [id_insumo, cantidad, observacion]
    );
    await pool.query(
      'UPDATE Insumos SET cantidad_actual = cantidad_actual - $1 WHERE id_insumo = $2',
      [cantidad, id_insumo]
    );
    await pool.query('COMMIT');
    res.json({ message: "Salida registrada" });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// --- EQUIPO MÉDICO ---

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
      `UPDATE Equipo_Medico SET nombre_equipo=$1, descripcion=$2, estado=$3 WHERE id_equipo=$4 RETURNING *`,
      [nombre_equipo, descripcion, estado, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/equipo-medico/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM Equipo_Medico WHERE id_equipo = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- USUARIOS ---

app.get('/api/usuarios', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Usuarios');
    res.json(result.rows || []);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

app.listen(5000, () => {
  console.log('✅ Servidor sincronizado en puerto 5000');
});