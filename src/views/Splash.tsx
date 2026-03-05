import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
            <div className="splash-content">
                <div className="logo-bloom-wrapper">
                    <img src="/gymapp2/logo.png" alt="EVO GYM CLUB" className="splash-logo kinetic-drift-bloom" />
                </div>
            </div>
        </div>
    );
}
