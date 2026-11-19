import { createRoot, hydrateRoot } from 'react-dom/client';
import { MaintenancePage } from './MaintenancePage';
import './maintenance.css';

const root = document.getElementById('root')!;
const page = <MaintenancePage />;

if (import.meta.env.DEV) {
  createRoot(root).render(page);
} else {
  hydrateRoot(root, page);
}
