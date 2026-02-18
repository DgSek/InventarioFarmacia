import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Medicamentos } from './pages/Medicamentos';
import { Existencias } from './pages/Existencias';
import { Movimientos } from './pages/Movimientos';
import { Reportes } from './pages/Reportes';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: 'medicamentos', Component: Medicamentos },
      { path: 'existencias', Component: Existencias },
      { path: 'movimientos', Component: Movimientos },
      { path: 'reportes', Component: Reportes },
    ],
  },
]);
