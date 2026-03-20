import { Link, Outlet, useLocation } from 'react-router';
import {
  Package,
  PackageOpen,
  ArrowLeftRight,
  BarChart3,
  LayoutDashboard,
  Box
} from 'lucide-react';

export function Layout() {
  const location = useLocation();

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
      <aside className="w-64 border-r flex flex-col fixed h-screen" style={{ backgroundColor: '#FFFFFF', borderColor: 'rgba(58, 53, 51, 0.1)'}}
      >
        {/* Header del Sidebar */}
        <div className="px-4 py-5 border-b" style={{ borderColor: 'rgba(58, 53, 51, 0.1)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#6DA2B3' }}>
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold text-sm truncate" style={{ color: '#3A3533' }}>Sistema de Inventario</h1>
              <p className="text-xs truncate" style={{ color: '#A5867A' }}>Gestión de Medicamentos</p>
            </div>
          </div>
        </div>

        {/* Navegación */}
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${active
                    ? ''
                    : 'hover:bg-opacity-50'
                  }`}
                style={{
                  backgroundColor: active ? '#ECD2D1' : 'transparent',
                  color: active ? '#6DA2B3' : '#3A3533',
                }}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}