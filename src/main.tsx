import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

const Root = () => {
  useSupabaseAuth();
  return <App />;
};

createRoot(document.getElementById("root")!).render(<Root />);
