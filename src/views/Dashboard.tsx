import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { db, type BlockConfig } from '../services/db';
import { Play, TrendingUp, Activity, Target } from 'lucide-react';
import './Dashboard.css';

interface Metrics {
    totalVolume: number;
    maxPR: string;
    workoutsCompleted: number;
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
                <button className="primary-btn w-full" onClick={() => navigate('/config')}>
                    Configurar Bloque
                </button>
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
        <div className="screen-padding dashboard-container fade-in">
            <div className="block-header card" onClick={() => navigate('/config')}>
                <div className="flex-between mb-8">
                    <div className="badge">{activeBlock?.target}</div>
                    <span className="text-secondary text-sm">Toca para ver el plan</span>
                </div>
                <h2>Semana {currentWeek} de {activeBlock?.durationWeeks}</h2>
                <p className="text-secondary">{activeBlock?.daysPerWeek} Días de Entrenamiento / Semana</p>
            </div>

            <h3 className="section-title">Métricas de Éxito</h3>
            <div className="metrics-grid">
                <div className="metric-card">
                    <TrendingUp className="text-accent mb-8" size={24} />
                    <div className="metric-value">{metrics.totalVolume.toLocaleString()} kg</div>
                    <div className="metric-label">Volumen Total (Esta Semana)</div>
                </div>
                <div className="metric-card">
                    <Activity className="text-accent mb-8" size={24} />
                    <div className="metric-value">{metrics.maxPR}</div>
                    <div className="metric-label">Máximo PR (Cualquier Ejercicio)</div>
                </div>
                <div className="metric-card full-width">
                    <div className="metric-value">{metrics.workoutsCompleted} / {activeBlock?.daysPerWeek}</div>
                    <div className="metric-label">Entrenamientos Completados</div>
                    <div className="progress-bar-bg mt-8">
                        <div className="progress-bar-fill" style={{ width: `${progressPct}%` }}></div>
                    </div>
                </div>
            </div>

            <button className="primary-btn bottom-fixed action-glow main-cta" onClick={() => navigate('/workout')}>
                <Play fill="currentColor" size={20} className="mr-8" />
                Lanzar Entreno del Día
            </button>
        </div>
    );
}
