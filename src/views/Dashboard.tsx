import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { db, type BlockConfig } from '../services/db';
import { Play, TrendingUp, Activity, Target, Zap, Coffee, Flame } from 'lucide-react';
import './Dashboard.css';

interface Metrics {
    totalVolume: number;
    maxPR: string;
    workoutsCompletedThisWeek: number;
    streak: number;
    heatmap: { date: string, level: number }[];
    newPRThisWeek: boolean;
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
    const [metrics, setMetrics] = useState<Metrics>({ totalVolume: 0, maxPR: '--', workoutsCompletedThisWeek: 0, streak: 0, heatmap: [], newPRThisWeek: false });
    const [todayTeaser, setTodayTeaser] = useState<{ count: number, mins: number, name: string } | null>(null);

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
                setMetrics({ totalVolume: 0, maxPR: '--', workoutsCompletedThisWeek: 0, streak: 0, heatmap: [], newPRThisWeek: false });
                return;
            }

            // Date utilities
            const getWeekString = (dateObj: Date) => {
                const d = new Date(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()));
                const dayNum = d.getUTCDay() || 7;
                d.setUTCDate(d.getUTCDate() + 4 - dayNum);
                const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
                const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
                return `${d.getUTCFullYear()}-W${weekNo}`;
            };
            const currentWeekStr = getWeekString(new Date());

            // Volume and Max PR calculation
            let totalVolume = 0;
            let maxWeight = 0;
            let maxReps = 0;
            let prDate = '';

            for (const s of allSets) {
                if (!s.completed) continue;
                totalVolume += (s.weight * s.reps);
                if (s.weight > maxWeight) {
                    maxWeight = s.weight;
                    maxReps = s.reps;
                    prDate = s.date;
                }
            }
            const maxPR = maxWeight > 0 ? `${maxWeight}kg x ${maxReps}` : '--';
            const newPRThisWeek = maxWeight > 0 && getWeekString(new Date(prDate)) === currentWeekStr;

            // This week's completed workouts
            const uniqueDatesSet = new Set(allSets.filter(s => s.completed).map(s => s.date));
            const daysThisWeek = new Set(Array.from(uniqueDatesSet).filter(dStr => getWeekString(new Date(dStr)) === currentWeekStr));
            const workoutsCompletedThisWeek = daysThisWeek.size;

            // Heatmap calculation
            const heatmap = [];
            const today = new Date();
            for (let i = 27; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().split('T')[0];
                const daySets = allSets.filter(s => s.completed && s.date === dateStr);
                const dayVol = daySets.reduce((sum, s) => sum + (s.weight * s.reps), 0);
                let level = 0;
                if (daySets.length > 0) {
                    level = dayVol > 5000 ? 3 : dayVol > 2000 ? 2 : 1;
                }
                heatmap.push({ date: dateStr, level });
            }

            // Streak calculation
            const activeWeeks = new Set(Array.from(uniqueDatesSet).map(dStr => getWeekString(new Date(dStr))));
            const lastWeekDate = new Date();
            lastWeekDate.setDate(lastWeekDate.getDate() - 7);
            const lastWeekStr = getWeekString(lastWeekDate);

            let streak = 0;
            let checkDate = new Date();
            if (!activeWeeks.has(currentWeekStr) && activeWeeks.has(lastWeekStr)) {
                checkDate = lastWeekDate;
            }
            while (activeWeeks.has(getWeekString(checkDate))) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 7);
            }

            setMetrics({ totalVolume, maxPR, workoutsCompletedThisWeek, streak, heatmap, newPRThisWeek });
        }
        computeMetrics();
    }, [activeBlockId]);

    // Fetch today's workout plan
    useEffect(() => {
        async function fetchTodayPlan() {
            if (!activeBlock) return;
            const currentWeek = Math.min(
                activeBlock.durationWeeks,
                Math.max(1, Math.ceil((Date.now() - new Date(activeBlock.startDate).getTime()) / (7 * 24 * 60 * 60 * 1000)))
            );
            const todayDayNum = new Date().getDay() === 0 ? 7 : new Date().getDay();

            const days = await db.workoutDays
                .where('[blockId+weekNumber]')
                .equals([activeBlock.id!, currentWeek])
                .toArray();

            const todayDay = days.find(d => d.dayNumber === todayDayNum);

            if (todayDay && todayDay.exerciseIds && todayDay.exerciseIds.length > 0) {
                const exCount = todayDay.exerciseIds.length;
                const mins = exCount * 7;

                const library = await db.exerciseLibrary.toArray();
                const todayExs = todayDay.exerciseIds.map(id => library.find(l => l.id === id)).filter(Boolean);

                const groups = todayExs.map(ex => ex?.muscleGroup).filter(Boolean) as string[];
                let name = "Entrenamiento de Hoy";
                if (groups.length > 0) {
                    const counts = groups.reduce((acc, g) => {
                        acc[g] = (acc[g] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>);
                    const topGroup = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
                    name = `Día de ${topGroup.replace(/ y /g, ' & ')}`;
                }
                setTodayTeaser({ count: exCount, mins, name });
            } else {
                setTodayTeaser({ count: 0, mins: 0, name: "Día de Recuperación" });
            }
        }
        fetchTodayPlan();
    }, [activeBlock]);

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
                </div>
            </div>
        );
    }

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
                {/* Safari inner content wrapper to fix overflow clipping */}
                <div style={{ position: 'relative', zIndex: 2, pointerEvents: 'none' }}>
                    <div className="flex-between mb-8">
                        <div className="badge">{activeBlock?.target}</div>
                        <span className="text-secondary text-sm">Toca para ver el plan</span>
                    </div>
                    <h2>Semana <AnimatedNumber value={currentWeek} /> de {activeBlock?.durationWeeks}</h2>
                    <p className="text-secondary" style={{ marginTop: '8px' }}>{activeBlock?.daysPerWeek} Días de Entrenamiento / Semana</p>
                </div>
            </div>

            {metrics.newPRThisWeek && (
                <div className="card glass-card mb-16 action-glow" style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(237, 179, 89, 0.15) 0%, rgba(237, 179, 89, 0.05) 100%)', borderColor: 'rgba(237, 179, 89, 0.4)' }}>
                    <div className="flex-between">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ fontSize: '28px' }}>🏆</div>
                            <div>
                                <h3 style={{ margin: 0, color: 'var(--accent-primary)', fontSize: '16px' }}>¡Nuevo Récord Esta Semana!</h3>
                                <p className="text-secondary text-sm" style={{ margin: 0, marginTop: '2px' }}>Has levantado {metrics.maxPR}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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

                {/* Circular Progress Ring */}
                <div className="metric-card" style={{ gridColumn: 'span 2', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div className="metric-label" style={{ marginTop: 0, marginBottom: '8px' }}>Entrenamientos de la Semana</div>
                        <div className="metric-value" style={{ fontSize: '24px' }}>
                            <AnimatedNumber value={metrics.workoutsCompletedThisWeek} />
                            <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}> / {activeBlock?.daysPerWeek || 0}</span>
                        </div>
                    </div>
                    <div style={{ position: 'relative', width: '64px', height: '64px' }}>
                        <svg width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="32" cy="32" r="28" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                            <circle
                                cx="32" cy="32" r="28" fill="transparent"
                                stroke="var(--accent-primary)" strokeWidth="6"
                                strokeDasharray={2 * Math.PI * 28}
                                strokeDashoffset={(2 * Math.PI * 28) - (Math.min(100, (metrics.workoutsCompletedThisWeek / (activeBlock?.daysPerWeek || 1)) * 100) / 100) * (2 * Math.PI * 28)}
                                strokeLinecap="round"
                                style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}
                            />
                        </svg>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                            {Math.round(Math.min(100, (metrics.workoutsCompletedThisWeek / (activeBlock?.daysPerWeek || 1)) * 100))}%
                        </div>
                    </div>
                </div>
            </div>

            <div className="card glass-card mt-16" style={{ padding: '20px' }}>
                <div className="flex-between mb-16">
                    <h3 style={{ margin: 0, fontSize: '16px' }}>Consistencia</h3>
                    <div className="badge" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(237, 179, 89, 0.15)', borderColor: 'rgba(237, 179, 89, 0.3)', color: 'var(--accent-primary)' }}>
                        <Flame size={14} /> {metrics.streak} <span style={{ textTransform: 'none' }}>Semanas Seguidas</span>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                    {metrics.heatmap.map((day, i) => (
                        <div
                            key={i}
                            style={{
                                aspectRatio: '1/1',
                                borderRadius: '4px',
                                backgroundColor: day.level === 0 ? 'rgba(255,255,255,0.05)' :
                                    day.level === 1 ? 'rgba(237, 179, 89, 0.4)' :
                                        day.level === 2 ? 'rgba(237, 179, 89, 0.7)' :
                                            'var(--accent-primary)',
                                boxShadow: day.level > 0 ? '0 0 8px rgba(237, 179, 89, 0.2)' : 'none'
                            }}
                            title={day.date}
                        />
                    ))}
                </div>
                <div className="flex-between mt-8 text-sm text-secondary">
                    <span>Hace 4 Semanas</span>
                    <span>Hoy</span>
                </div>
            </div>

            {todayTeaser && todayTeaser.count > 0 ? (
                <div className="card glass-card today-teaser action-glow" onClick={() => navigate('/workout')} style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden', padding: '24px', marginTop: '16px' }}>
                    <div className="teaser-glow"></div>
                    <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Zap className="text-accent" size={20} />
                            {todayTeaser.name}
                        </h3>
                        <p className="text-secondary mb-8">{todayTeaser.count} ejercicios • {todayTeaser.mins} mins aprox</p>
                        <button className="primary-btn w-full" style={{ height: '48px' }}>
                            <Play fill="currentColor" size={20} className="mr-8" />
                            Empezar Entreno
                        </button>
                    </div>
                </div>
            ) : (
                <div className="card today-teaser rest-card" style={{ marginTop: '16px', padding: '24px', background: 'linear-gradient(145deg, rgba(30,40,55,0.4) 0%, rgba(15,20,30,0.8) 100%)', border: '1px solid rgba(136, 170, 255, 0.15)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#88aaff' }}>
                            <Coffee size={20} />
                            {todayTeaser?.name || "Día de Recuperación"}
                        </h3>
                        <p className="text-secondary" style={{ fontSize: '14px', lineHeight: 1.4 }}>Hoy toca descansar o movilidad ligera. ¡El músculo crece cuando descansas!</p>
                    </div>
                </div>
            )}

        </div>
    );
}
