import { AdminApp } from './admin/AdminApp';
import { DisplayApp } from './display/DisplayApp';

export default function App() {
  return window.location.pathname.startsWith('/admin') ? <AdminApp /> : <DisplayApp />;
}
