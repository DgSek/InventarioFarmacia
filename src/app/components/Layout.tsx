import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import {
  Package,
  PackageOpen,
  ArrowLeftRight,
  BarChart3,
  LayoutDashboard,
  Box,
  UserCircle // Importamos el icono de usuario
} from 'lucide-react';

export function Layout() {
  const location = useLocation();
  
  // Estado para el usuario que viene de la base de datos
  const [usuario, setUsuario] = useState<string | null>(null);

  // Efecto para obtener el usuario activo desde el servidor (Puerto 5000)
  useEffect(() => {
    const fetchUsuarioActivo = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/usuario-activo');
        if (!response.ok) throw new Error('Error al obtener usuario');
        const data = await response.json();
        setUsuario(data.nombre_usuario);
      } catch (err) {
        console.error('Error de conexión con la API:', err);
      }
    };

    fetchUsuarioActivo();
  }, []);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Medicamentos', href: '/medicamentos', icon: Package },
    { name: 'Insumos', href: '/insumos', icon: Box },
    { name: 'Existencias', href: '/existencias', icon: PackageOpen },
    { name: 'Movimientos', href: '/movimientos', icon: ArrowLeftRight },
    { name: 'Reportes', href: '/reportes', icon: BarChart3 },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#FAF8F7' }}>
      {/* Sidebar */}
      <aside 
        className="w-64 border-r flex flex-col fixed h-screen" 
        style={{ backgroundColor: '#4796B7', borderColor: 'rgba(58, 53, 51, 0.1)' }}
      >
        {/* Header del Sidebar */}
        <div className="px-4 py-5 border-b" style={{ borderColor: 'rgba(58, 53, 51, 0.1)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#6DA2B3' }}>
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold text-lg truncate" style={{ color: '#FFFFFF' }}>Sistema de Inventario</h1>
              <p className="text-sm truncate" style={{ color: '#FFFFFF' }}>Gestión de Medicamentos</p>
            </div>
          </div>
        </div>

        {/* Navegación (flex-1 permite que esta parte crezca y empuje el resto hacia abajo) */}
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  active ? '' : 'hover:bg-white/10'
                }`}
                style={{
                  backgroundColor: active ? '#FFFFFF' : 'transparent',
                  color: active ? '#6DA2B3' : '#FFFFFF',
                }}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* --- Sección Inferior: Usuario Activo --- */}
        {usuario && (
          <div 
            className="p-4 border-t mt-auto" 
            style={{ 
              borderColor: 'rgba(255, 255, 255, 0.1)', 
              backgroundColor: 'rgba(0, 0, 0, 0.1)' 
            }}
          >
            <div className="flex items-center gap-3 px-2 py-1">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center border border-white/10">
                <UserCircle className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold tracking-widest text-white/50 leading-none mb-1">
                  Sesión Activa
                </p>
                <p className="text-sm font-semibold text-white truncate">
                  {usuario}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}