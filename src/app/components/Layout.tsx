import { Link, Outlet, useLocation } from 'react-router';
import { 
  Package, 
  PackageOpen, 
  ArrowLeftRight, 
  BarChart3, 
  LayoutDashboard,
  AlertTriangle 
} from 'lucide-react';
import { storage } from '../data/storage';
import { Badge } from './ui/badge';

export function Layout() {
  const location = useLocation();
  const alertas = storage.getAlertas();
  
  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Medicamentos', href: '/medicamentos', icon: Package },
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
    <div className="min-h-screen" style={{ backgroundColor: '#FAF8F7' }}>
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10" style={{ borderColor: 'rgba(58, 53, 51, 0.1)' }}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#6DA2B3' }}>
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-semibold" style={{ color: '#3A3533' }}>Sistema de Inventario</h1>
                <p className="text-sm" style={{ color: '#A5867A' }}>Gestión de Medicamentos</p>
              </div>
            </div>
            
            {alertas.length > 0 && (
              <Link to="/" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:opacity-90 transition-opacity" style={{ backgroundColor: '#96453B', color: '#ffffff' }}>
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">{alertas.length} Alertas de stock</span>
              </Link>
            )}
          </div>
        </div>
      </header>
      
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r min-h-[calc(100vh-73px)]" style={{ borderColor: 'rgba(58, 53, 51, 0.1)' }}>
          <nav className="p-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    active
                      ? ''
                      : 'hover:bg-opacity-50'
                  }`}
                  style={{
                    backgroundColor: active ? '#ECD2D1' : 'transparent',
                    color: active ? '#6DA2B3' : '#3A3533',
                  }}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                  {item.name === 'Dashboard' && alertas.length > 0 && (
                    <Badge variant="destructive" className="ml-auto">
                      {alertas.length}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>
        </aside>
        
        {/* Main Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}