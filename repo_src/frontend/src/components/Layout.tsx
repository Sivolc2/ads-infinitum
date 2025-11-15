import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/Layout.css';

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/products', label: 'Products', icon: '💡' },
  { path: '/experiments', label: 'Experiments', icon: '🧪' },
  { path: '/ads', label: 'Ad Variants', icon: '📢' },
  { path: '/landing-pages', label: 'Landing Pages', icon: '🚀' },
  { path: '/leads', label: 'Leads', icon: '👥' },
  { path: '/builds', label: 'Build Contracts', icon: '🔨' },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="logo">Ad Infinitum</h1>
          <p className="tagline">Self-Evolving Product Scout</p>
        </div>
        <nav className="nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <p className="footer-text">Powered by Raindrop, OpenRouter, fal.ai, Fastino</p>
        </div>
      </aside>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
