import { renderToString } from 'react-dom/server';
import { MaintenancePage } from './MaintenancePage';

export function render() {
  return renderToString(<MaintenancePage />);
}
