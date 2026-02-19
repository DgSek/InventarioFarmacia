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
  password: String(process.env.DB_PASSWORD), // Forzamos a String
  port: process.env.DB_PORT,      // 5432
  ssl: false // Cambiar a true solo si configuras certificados SSL en tu Ubuntu
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Error de conexión SASL:', err.message);
  } else {
    console.log('✅ Conexión exitosa a PostgreSQL en tilinescraft');
  }
});
// --- RUTAS DE MEDICAMENTOS ---

// Obtener todos los medicamentos activos
app.get('/api/medicamentos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Medicamentos WHERE activo = true ORDER BY nombre ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al obtener medicamentos' });
  }
});

// Crear nuevo medicamento
app.post('/api/medicamentos', async (req, res) => {
  const { nombre, tipo_medicamento, concentracion, stock_minimo, ubicacion } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO Medicamentos (nombre, tipo_medicamento, concentracion, stock_minimo, ubicacion) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [nombre, tipo_medicamento, concentracion, stock_minimo, ubicacion]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- RUTAS DE MOVIMIENTOS Y EXISTENCIAS ---

// Registrar un movimiento (Entrada/Salida) y actualizar stock automáticamente
app.post('/api/movimientos', async (req, res) => {
  const { id_existencia, tipo_movimiento, cantidad, id_usuario, observaciones } = req.body;
  
  try {
    // Iniciamos una transacción para asegurar que el movimiento y el stock se actualicen juntos
    await pool.query('BEGIN');

    // 1. Insertar el movimiento
    const nuevoMovimiento = await pool.query(
      'INSERT INTO Movimientos (id_existencia, tipo_movimiento, cantidad, id_usuario) VALUES ($1, $2, $3, $4) RETURNING *',
      [id_existencia, tipo_movimiento, cantidad, id_usuario]
    );

    // 2. Actualizar la cantidad en la tabla Existencias
    const operador = (tipo_movimiento === 'entrada') ? '+' : '-';
    await pool.query(
      `UPDATE Existencias SET cantidad_actual = cantidad_actual ${operador} $1 WHERE id_existencia = $2`,
      [cantidad, id_existencia]
    );

    await pool.query('COMMIT');
    res.json(nuevoMovimiento.rows[0]);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err.message);
    res.status(500).json({ error: 'Error al procesar el movimiento' });
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
  console.log('Servidor corriendo en el puerto 5000');
  console.log('Conectado a la base de datos en tilinescraft.serveminecraft.net');
});