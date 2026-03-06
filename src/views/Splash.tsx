import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { db } from '../services/db';
import './Splash.css';

export default function Splash() {
    const navigate = useNavigate();
    const activeBlockId = useAppStore(state => state.activeBlockId);

    useEffect(() => {
        async function checkConfig() {
            let hasConfig = !!activeBlockId;

            if (!hasConfig) {
                // Also check Dexie as fallback just in case
                const recentBlock = await db.blockConfigs.orderBy('id').last();
                if (recentBlock && recentBlock.id) {
                    hasConfig = true;
                    useAppStore.getState().setActiveBlockId(recentBlock.id);
                }
            }

            const timer = setTimeout(() => {
                if (hasConfig) {
                    navigate('/dashboard', { replace: true });
                } else {
                    navigate('/config', { replace: true });
                }
            }, 3000); // Changed to 3000 to match animation duration of 2.8s better

            return () => clearTimeout(timer);
        }

        checkConfig();
    }, [navigate, activeBlockId]);

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
