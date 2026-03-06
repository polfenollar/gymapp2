import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { db, type BlockConfig } from '../services/db';
import { Play, TrendingUp, Activity, Target } from 'lucide-react';
import DataManagement from '../components/DataManagement';
import './Dashboard.css';

interface Metrics {
    totalVolume: number;
    maxPR: string;
    workoutsCompleted: number;
}

function AnimatedNumber({ value, formatter }: { value: number, formatter?: (v: number) => string }) {
    const [display, setDisplay] = useState(0);

    useEffect(() => {
        let startTime: number;
        const duration = 1000;
        const startValue = 0;

        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            // easeOutQuart
            const easeProgress = 1 - Math.pow(1 - progress, 4);
            const current = Math.floor(startValue + (value - startValue) * easeProgress);

            setDisplay(current);

            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                setDisplay(value); // ensure we finish exactly
            }
        };

        window.requestAnimationFrame(step);
    }, [value]);

    return <>{formatter ? formatter(display) : display}</>;
}

export default function Dashboard() {
    const navigate = useNavigate();
    const activeBlockId = useAppStore(state => state.activeBlockId);
    const [activeBlock, setActiveBlock] = useState<BlockConfig | null>(null);
    const [metrics, setMetrics] = useState<Metrics>({ totalVolume: 0, maxPR: '--', workoutsCompleted: 0 });

    useEffect(() => {
        async function load() {
            if (activeBlockId) {
                const block = await db.blockConfigs.get(activeBlockId);
                if (block) setActiveBlock(block);
            } else {
                const recentBlock = await db.blockConfigs.orderBy('id').last();
                if (recentBlock && recentBlock.id) {
                    useAppStore.getState().setActiveBlockId(recentBlock.id);
                    setActiveBlock(recentBlock);
                }
            }
        }
        load();
    }, [activeBlockId]);

    // Compute live metrics from trackedSets
    useEffect(() => {
        async function computeMetrics() {
            const allSets = await db.trackedSets.toArray();
            if (allSets.length === 0) {
                setMetrics({ totalVolume: 0, maxPR: '--', workoutsCompleted: 0 });
                return;
            }

            // Total volume = sum of (weight * reps) for all completed sets
            const totalVolume = allSets
                .filter(s => s.completed)
                .reduce((sum, s) => sum + (s.weight * s.reps), 0);

            // Max PR = heaviest single weight lifted
            let maxWeight = 0;
            let maxReps = 0;
            for (const s of allSets) {
                if (s.completed && s.weight > maxWeight) {
                    maxWeight = s.weight;
                    maxReps = s.reps;
                }
            }
            const maxPR = maxWeight > 0 ? `${maxWeight}kg x ${maxReps}` : '--';

            // Workouts completed = unique dates with at least one completed set
            const uniqueDates = new Set(allSets.filter(s => s.completed).map(s => s.date));
            const workoutsCompleted = uniqueDates.size;

            setMetrics({ totalVolume, maxPR, workoutsCompleted });
        }
        computeMetrics();
    }, [activeBlockId]);

    if (!activeBlock && !activeBlockId) {
        return (
            <div className="screen-padding flex-center empty-state">
                <Target size={48} className="text-secondary mb-16" />
                <h2>Sin Bloque Activo</h2>
                <p className="text-center text-secondary mb-24 mt-8">Configura tu bloque de entrenamiento para ver tu panel y métricas.</p>
                <div style={{ width: '100%' }}>
                    <button className="primary-btn w-full mb-24 action-glow" onClick={() => navigate('/config')}>
                        Configurar Bloque
                    </button>
                    <DataManagement />
                </div>
            </div>
        );
    }

    const progressPct = activeBlock
        ? Math.min(100, Math.round((metrics.workoutsCompleted / activeBlock.daysPerWeek) * 100))
        : 0;

    // Compute current week from start date
    const currentWeek = activeBlock
        ? Math.min(
            activeBlock.durationWeeks,
            Math.max(1, Math.ceil((Date.now() - new Date(activeBlock.startDate).getTime()) / (7 * 24 * 60 * 60 * 1000)))
        )
        : 1;

    return (
        <div className="screen-padding dashboard-container fade-in" style={{ position: 'relative', zIndex: 1 }}>
            {/* Ambient Background Glow */}
            <div style={{
                position: 'fixed',
                top: '-50px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '350px',
                height: '350px',
                background: 'radial-gradient(circle, rgba(237,179,89,0.12) 0%, rgba(0,0,0,0) 70%)',
                borderRadius: '50%',
                zIndex: -1,
                pointerEvents: 'none'
            }} />

            <div className="block-header card glass-card" onClick={() => navigate('/config')}>
                <div className="flex-between mb-8">
                    <div className="badge">{activeBlock?.target}</div>
                    <span className="text-secondary text-sm">Toca para ver el plan</span>
                </div>
                <h2>Semana <AnimatedNumber value={currentWeek} /> de {activeBlock?.durationWeeks}</h2>
                <p className="text-secondary" style={{ marginTop: '8px' }}>{activeBlock?.daysPerWeek} Días de Entrenamiento / Semana</p>
            </div>

            <h3 className="section-title">Tu Progreso</h3>
            <div className="metrics-grid">
                <div className="metric-card">
                    <TrendingUp className="text-accent mb-8" size={24} />
                    <div className="metric-value">
                        <AnimatedNumber value={metrics.totalVolume} formatter={(v) => v.toLocaleString()} /> <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>kg</span>
                    </div>
                    <div className="metric-label">Volumen Total</div>
                </div>
                <div className="metric-card">
                    <Activity className="text-accent mb-8" size={24} />
                    <div className="metric-value">{metrics.maxPR}</div>
                    <div className="metric-label">Máximo PR Global</div>
                </div>
                <div className="metric-card full-width">
                    <div className="flex-between">
                        <div className="metric-label" style={{ marginTop: 0 }}>Entrenamientos Completados</div>
                        <div className="metric-value" style={{ fontSize: '20px' }}>
                            <AnimatedNumber value={metrics.workoutsCompleted} /> / {activeBlock?.daysPerWeek}
                        </div>
                    </div>
                    <div className="progress-bar-bg mt-16">
                        <div className="progress-bar-fill" style={{ width: `${progressPct}%` }}></div>
                    </div>
                </div>
            </div>

            <button className="primary-btn bottom-fixed action-glow main-cta" onClick={() => navigate('/workout')}>
                <Play fill="currentColor" size={20} className="mr-8" />
                Lanzar Entreno del Día
            </button>

            {/* Render data management component above the bottom nav and floating CTA */}
            <div style={{ paddingBottom: '160px', marginTop: '32px' }}>
                <DataManagement />
            </div>
        </div>
    );
}
