import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutList, Dumbbell, History } from 'lucide-react';
import './BottomNav.css';

export default function BottomNav() {
    const location = useLocation();

    // Hide bottom nav on splash screen
    if (location.pathname === '/') return null;

    return (
        <nav className="bottom-nav">
            <Link to="/dashboard" className={`nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`}>
                <Home size={22} />
                <span>Inicio</span>
            </Link>
            <Link to="/workout" className={`nav-item ${location.pathname === '/workout' ? 'active' : ''}`}>
                <Dumbbell size={22} />
                <span>Entreno</span>
            </Link>
            <Link to="/history" className={`nav-item ${location.pathname === '/history' ? 'active' : ''}`}>
                <History size={22} />
                <span>Historial</span>
            </Link>
            <Link to="/config" className={`nav-item ${location.pathname === '/config' ? 'active' : ''}`}>
                <LayoutList size={22} />
                <span>Planificar</span>
            </Link>
        </nav>
    );
}
