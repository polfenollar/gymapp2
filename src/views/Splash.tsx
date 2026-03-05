import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell } from 'lucide-react';
import './Splash.css';

export default function Splash() {
    const navigate = useNavigate();

    useEffect(() => {
        // Check if configuration exists (stubbed for now)
        const hasConfig = false; // We'll hook this to Zustand/Dexie later

        const timer = setTimeout(() => {
            if (hasConfig) {
                navigate('/dashboard');
            } else {
                navigate('/config');
            }
        }, 2500);
        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div className="splash-container">
            <div className="logo-pulse">
                <Dumbbell size={80} className="logo-icon" color="var(--accent-primary)" />
            </div>
            <h1 className="splash-title">GymApp</h1>
            <p className="splash-subtitle">Periodización de Precisión</p>
        </div>
    );
}
