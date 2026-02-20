const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Configuración de conexión a tilinescraft.serveminecraft.net
const pool = new Pool({
  user: process.env.DB_USER,      // Hunter23
  host: process.env.DB_HOST,      // tilinescraft.serveminecraft.net
  database: process.env.DB_NAME,  // InventarioFarmacia
  password: String(process.env.DB_PASSWORD), 
  port: process.env.DB_PORT || 5432,
  ssl: false 
});

// Verificación inicial de conexión
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Error de conexión SASL:', err.message);
  } else {
    console.log('✅ Conexión exitosa a PostgreSQL en tilinescraft');
  }
});

// --- RUTAS DE MEDICAMENTOS ---

app.get('/api/medicamentos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Medicamentos ORDER BY nombre ASC');
    res.json(result.rows || []); 
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al obtener medicamentos' });
  }
});

app.post('/api/medicamentos', async (req, res) => {
  const { nombre, tipo_medicamento, concentracion, stock_minimo, ubicacion, estante, codigo_barras, activo } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO Medicamentos 
      (nombre, tipo_medicamento, concentracion, stock_minimo, ubicacion, estante, codigo_barras, activo) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [nombre, tipo_medicamento, concentracion, stock_minimo, ubicacion, estante, codigo_barras, activo]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/medicamentos/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, tipo_medicamento, concentracion, stock_minimo, ubicacion, estante, codigo_barras, activo } = req.body;
  try {
    const result = await pool.query(
      `UPDATE Medicamentos SET 
      nombre=$1, tipo_medicamento=$2, concentracion=$3, stock_minimo=$4, ubicacion=$5, estante=$6, codigo_barras=$7, activo=$8
      WHERE id_medicamento=$9 RETURNING *`,
      [nombre, tipo_medicamento, concentracion, stock_minimo, ubicacion, estante, codigo_barras, activo, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- RUTAS DE EXISTENCIAS ---

app.get('/api/existencias', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Existencias');
    res.json(result.rows || []);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener existencias' });
  }
});

app.post('/api/existencias', async (req, res) => {
  const { id_medicamento, codigo_referencia, cantidad_actual, fecha_registro } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO Existencias (id_medicamento, codigo_referencia, cantidad_actual, fecha_registro) VALUES ($1, $2, $3, $4) RETURNING *',
      [id_medicamento, codigo_referencia, cantidad_actual, fecha_registro]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al crear existencia' });
  }
});

// --- RUTAS DE MOVIMIENTOS ---

app.get('/api/movimientos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Movimientos ORDER BY fecha DESC'); 
    res.json(result.rows || []);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al obtener movimientos' });
  }
});

app.post('/api/movimientos', async (req, res) => {
  const { id_existencia, tipo_movimiento, cantidad, id_usuario, observaciones } = req.body;
  
  // NORMALIZACIÓN: Forzamos minúsculas para asegurar que el operador (+ o -) sea el correcto
  const tipoMin = tipo_movimiento ? tipo_movimiento.toLowerCase() : ''; 
  const operador = (tipoMin === 'entrada') ? '+' : '-';

  try {
    await pool.query('BEGIN');
    
    // 1. Insertar el movimiento en el historial
    const nuevoMovimiento = await pool.query(
      'INSERT INTO Movimientos (id_existencia, tipo_movimiento, cantidad, id_usuario, observaciones) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id_existencia, tipo_movimiento, cantidad, id_usuario, observaciones]
    );

    // 2. Actualizar la cantidad en la tabla de Existencias (Resta o Suma)
    await pool.query(
      `UPDATE Existencias SET cantidad_actual = cantidad_actual ${operador} $1 WHERE id_existencia = $2`,
      [cantidad, id_existencia]
    );

    await pool.query('COMMIT');
    res.json(nuevoMovimiento.rows[0]);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error("❌ Error en la transacción de movimiento:", err.message);
    res.status(500).json({ error: 'Error al procesar el movimiento y actualizar el stock' });
  }
});

// --- RUTAS DE USUARIOS ---
app.get('/api/usuarios', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Usuarios');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

app.listen(5000, () => {
  console.log('✅ Servidor corriendo en el puerto 5000');
});