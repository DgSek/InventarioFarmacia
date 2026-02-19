import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // Recomendado para datos remotos

// Creamos un cliente para manejar las peticiones a tilinescraft.serveminecraft.net
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Evita peticiones infinitas al cambiar de pestaña
      retry: 1, // Si falla la conexión al servidor, reintenta una vez
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}