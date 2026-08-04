import { useState, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../auth/AuthContext';
import { adminMenuItems } from '../../config/adminMenu';
import './AdminLayout.css';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useContext(AuthContext);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    auth?.logout();
    navigate('/login');
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle Sidebar"
          >
            ☰
          </button>
          {sidebarOpen && <span className="sidebar-logo">⚡</span>}
        </div>

        <nav className="menu">
          {adminMenuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`menu-item ${isActive(item.path) ? 'active' : ''}`}
            >
              <span className="menu-icon">{item.icon}</span>
              {sidebarOpen && <span className="menu-label">{item.label}</span>}
            </Link>
          ))}
          <hr className="menu-divider" />
          <button onClick={handleLogout} className="menu-item logout-btn">
            <span className="menu-icon">🚪</span>
            {sidebarOpen && <span className="menu-label">Logout</span>}
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="admin-content">{children}</main>
    </div>
  );
};

export default AdminLayout;
