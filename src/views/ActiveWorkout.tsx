import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, RotateCcw, Trophy } from 'lucide-react';
import { db, type ExerciseLibrary, type TrackedSet } from '../services/db';
import { useAppStore } from '../store/useAppStore';
import './ActiveWorkout.css';

function RestTimer() {
    const defaultRest = 90; // Default 1m 30s
    const [restTime, setRestTime] = useState(defaultRest);
    const [timeLeft, setTimeLeft] = useState(defaultRest);
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (isRunning && timeLeft > 0) {
            interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
        } else if (timeLeft === 0 && isRunning) {
            setIsRunning(false);
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]); // Vibrate to notify
        }
        return () => clearInterval(interval);
    }, [isRunning, timeLeft]);

    const format = (secs: number) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const adjustTime = (amount: number) => {
        setRestTime(prev => {
            const newTime = Math.max(15, prev + amount); // Min 15s
            if (!isRunning) setTimeLeft(newTime);
            return newTime;
        });
        if (isRunning) {
            setTimeLeft(prev => Math.max(0, prev + amount));
        }
    };

    const reset = () => {
        setIsRunning(false);
        setTimeLeft(restTime);
    };

    const toggle = () => {
        if (timeLeft === 0) setTimeLeft(restTime);
        setIsRunning(!isRunning);
    };

    return (
        <div className="chronometer">
            <button onClick={() => adjustTime(-15)} className="chrono-adj-btn">-</button>
            <div className={`time-display ${timeLeft === 0 ? 'time-finished' : ''}`} onClick={toggle}>
                {format(timeLeft)}
            </div>
            <button onClick={() => adjustTime(15)} className="chrono-adj-btn">+</button>

            <div className="chrono-controls" style={{ marginLeft: '12px' }}>
                <button onClick={toggle} className="chrono-btn">
                    {isRunning ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
                </button>
                <button onClick={reset} className="chrono-btn">
                    <RotateCcw size={16} />
                </button>
            </div>
        </div>
    );
}
function ProgressionTable({ exerciseId, muscleGroup }: { exerciseId: number, muscleGroup?: string }) {
    const [history, setHistory] = useState<{ date: string, sets: TrackedSet[] }[]>([]);
    const isCardio = muscleGroup === 'Cardio y Movilidad';
    const isCore = muscleGroup === 'Core';

    useEffect(() => {
        async function fetchHistory() {
            const allSets = await db.trackedSets
                .where('exerciseId')
                .equals(exerciseId)
                .toArray();

            // Group by date
            const grouped = allSets.reduce((acc, set) => {
                if (!acc[set.date]) acc[set.date] = [];
                acc[set.date].push(set);
                return acc;
            }, {} as Record<string, TrackedSet[]>);

            // Sort dates descending and take last 4
            const sortedEntries = Object.entries(grouped)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .slice(0, 4)
                .map(([date, sets]) => ({
                    date,
                    sets: sets.sort((a, b) => a.setNumber - b.setNumber)
                }));

            setHistory(sortedEntries);
        }
        fetchHistory();
    }, [exerciseId]);

    if (history.length === 0) return <p className="text-secondary text-xs italic">Sin historial previo.</p>;

    if (isCardio) {
        return (
            <div className="progression-container">
                <table className="prog-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Duración</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.map((entry, idx) => (
                            <tr key={idx}>
                                <td className="prog-date">{new Date(entry.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}</td>
                                <td className="prog-cell">{entry.sets[0] ? `${entry.sets[0].reps}min` : '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    if (isCore) {
        return (
            <div className="progression-container">
                <table className="prog-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>S1</th>
                            <th>S2</th>
                            <th>S3</th>
                            <th>S4</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.map((entry, idx) => (
                            <tr key={idx}>
                                <td className="prog-date">{new Date(entry.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}</td>
                                {[1, 2, 3, 4].map(num => {
                                    const s = entry.sets.find(s => s.setNumber === num);
                                    return <td key={num} className="prog-cell">{s ? `${s.reps}` : '-'}</td>;
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    return (
        <div className="progression-container">
            <table className="prog-table">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>S1</th>
                        <th>S2</th>
                        <th>S3</th>
                        <th>S4</th>
                    </tr>
                </thead>
                <tbody>
                    {history.map((entry, idx) => (
                        <tr key={idx}>
                            <td className="prog-date">{new Date(entry.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}</td>
                            {[1, 2, 3, 4].map(num => {
                                const s = entry.sets.find(s => s.setNumber === num);
                                return <td key={num} className="prog-cell">{s ? `${s.weight}x${s.reps}` : '-'}</td>;
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function ExerciseCard({
    exercise,
    isExpanded,
    onToggle,
    onComplete
}: {
    exercise: ExerciseLibrary,
    isExpanded: boolean,
    onToggle: () => void,
    onComplete: () => void
}) {
    const isCardio = exercise.muscleGroup === 'Cardio y Movilidad';
    const isCore = exercise.muscleGroup === 'Core';

    const initialSets = isCardio
        ? [{ setNumber: 1, weight: 0, reps: 0, completed: false }]
        : [
            { setNumber: 1, weight: 0, reps: 0, completed: false },
            { setNumber: 2, weight: 0, reps: 0, completed: false },
            { setNumber: 3, weight: 0, reps: 0, completed: false },
            { setNumber: 4, weight: 0, reps: 0, completed: false }
        ];

    const [sets, setSets] = useState<Partial<TrackedSet>[]>(initialSets);
    const [isSaved, setIsSaved] = useState(false);

    const updateSet = (index: number, field: 'weight' | 'reps', value: string) => {
        const newSets = [...sets];
        newSets[index][field] = Number(value);
        setSets(newSets);
    };

    const saveExercise = async () => {
        const today = new Date().toISOString().split('T')[0];
        const completedSets = sets.filter(s => (s.weight && s.weight > 0) || (s.reps && s.reps > 0));

        if (completedSets.length === 0) {
            setIsSaved(true);
            onComplete();
            return;
        }

        for (const set of completedSets) {
            await db.trackedSets.add({
                date: today,
                exerciseId: exercise.id!,
                setNumber: set.setNumber!,
                weight: set.weight || 0,
                reps: set.reps || 0,
                completed: true
            });
        }
        setIsSaved(true);
        onComplete();
    };

    return (
        <div className={`exercise-card ${isExpanded ? 'expanded' : ''} ${isSaved ? 'saved completed-glow' : ''}`}>
            <div className="exercise-header" onClick={onToggle}>
                <div className="ex-info">
                    <h3>{exercise.name}</h3>
                    <span className="ex-muscle">{exercise.muscleGroup}</span>
                </div>
                {isSaved ? <Trophy size={20} className="text-accent" /> : <div className="indicator" />}
            </div>

            {isExpanded && (
                <div className="exercise-body">
                    <p className="ex-desc">{exercise.description}</p>
                    <div className="sets-container">
                        {isCardio ? (
                            <>
                                <div className="sets-header">
                                    <span>Duración (min)</span>
                                </div>
                                <div className="set-row">
                                    <input
                                        type="number"
                                        className="set-input"
                                        style={{ flex: 1 }}
                                        value={sets[0].reps || ''}
                                        onChange={(e) => updateSet(0, 'reps', e.target.value)}
                                        placeholder="0"
                                    />
                                </div>
                            </>
                        ) : isCore ? (
                            <>
                                <div className="sets-header">
                                    <span>Set</span>
                                    <span>Reps</span>
                                </div>
                                {sets.map((set, idx) => (
                                    <div key={idx} className="set-row">
                                        <span className="set-num">{set.setNumber}</span>
                                        <input
                                            type="number"
                                            className="set-input"
                                            value={set.reps || ''}
                                            onChange={(e) => updateSet(idx, 'reps', e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                ))}
                            </>
                        ) : (
                            <>
                                <div className="sets-header">
                                    <span>Set</span>
                                    <span>kg</span>
                                    <span>Reps</span>
                                </div>
                                {sets.map((set, idx) => (
                                    <div key={idx} className="set-row">
                                        <span className="set-num">{set.setNumber}</span>
                                        <input
                                            type="number"
                                            className="set-input"
                                            value={set.weight || ''}
                                            onChange={(e) => updateSet(idx, 'weight', e.target.value)}
                                            placeholder="0"
                                        />
                                        <input
                                            type="number"
                                            className="set-input"
                                            value={set.reps || ''}
                                            onChange={(e) => updateSet(idx, 'reps', e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                ))}
                            </>
                        )}
                    </div>

                    <div className="history-section">
                        <h4 className="hist-title">Progresión (Últimas 4 Sesiones)</h4>
                        <ProgressionTable exerciseId={exercise.id!} muscleGroup={exercise.muscleGroup} />
                    </div>

                    <div className="exercise-card-actions mt-16">
                        <RestTimer />
                        {!isSaved && (
                            <button className="primary-btn sm-btn" onClick={saveExercise} style={{ padding: '8px 16px', fontSize: '14px', flex: 'none' }}>
                                Guardar
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ActiveWorkout() {
    const navigate = useNavigate();
    const activeBlockId = useAppStore(state => state.activeBlockId);
    const [exercises, setExercises] = useState<ExerciseLibrary[]>([]);
    const [currentWeek, setCurrentWeek] = useState(1);

    // Focus Mode State
    const [expandedExId, setExpandedExId] = useState<number | null>(null);
    const [completedExIds, setCompletedExIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        async function fetchTodayWorkout() {
            if (activeBlockId) {
                const block = await db.blockConfigs.get(activeBlockId);
                let weekNum = 1;
                if (block) {
                    weekNum = Math.min(
                        block.durationWeeks,
                        Math.max(1, Math.ceil((Date.now() - new Date(block.startDate).getTime()) / (7 * 24 * 60 * 60 * 1000)))
                    );
                    setCurrentWeek(weekNum);
                }
                // Load the day based on natural calendar (1 = Lunes, 7 = Domingo)
                const jsDay = new Date().getDay();
                const naturalDayNumber = jsDay === 0 ? 7 : jsDay;

                const weekDays = await db.workoutDays
                    .where('[blockId+weekNumber]')
                    .equals([activeBlockId, weekNum])
                    .toArray();

                const todayWorkout = weekDays.find(d => d.dayNumber === naturalDayNumber);
                if (todayWorkout && todayWorkout.exerciseIds.length > 0) {
                    const exs = await Promise.all(
                        todayWorkout.exerciseIds.map(id => db.exerciseLibrary.get(id))
                    );
                    const validExs = exs.filter(Boolean) as ExerciseLibrary[];
                    setExercises(validExs);
                    if (validExs.length > 0) {
                        setExpandedExId(validExs[0].id!); // Auto-expand first exercise
                    }
                    return;
                } else {
                    setExercises([]); // Resting day
                    return;
                }
            }
            const allEx = await db.exerciseLibrary.toArray();
            setExercises(allEx);
        }
        fetchTodayWorkout();
    }, [activeBlockId]);

    // Gamification properties
    const progressPct = exercises.length > 0 ? (completedExIds.size / exercises.length) * 100 : 0;
    const isFullyCompleted = exercises.length > 0 && completedExIds.size === exercises.length;

    const handleComplete = (exId: number) => {
        setCompletedExIds(prev => {
            const next = new Set(prev);
            next.add(exId);
            return next;
        });

        // Auto-advance Focus Mode to the next unfinished exercise
        const idx = exercises.findIndex(e => e.id === exId);
        if (idx !== -1) {
            for (let i = idx + 1; i < exercises.length; i++) {
                if (!completedExIds.has(exercises[i].id!)) {
                    setExpandedExId(exercises[i].id!);
                    return;
                }
            }
            // If none found after, start from beginning to find skipped ones
            for (let i = 0; i < idx; i++) {
                if (!completedExIds.has(exercises[i].id!)) {
                    setExpandedExId(exercises[i].id!);
                    return;
                }
            }
        }
        setExpandedExId(null);
    };

    return (
        <div className="screen-padding workout-container fade-in">
            <div className="workout-topbar" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="workout-header-text">
                        <h2 style={{ marginBottom: 0 }}>
                            {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'][(new Date().getDay() === 0 ? 7 : new Date().getDay()) - 1]}
                        </h2>
                        <span className="text-secondary text-sm">Semana {currentWeek}</span>
                    </div>
                </div>

                {exercises.length > 0 && (
                    <div className="workout-progress-container mt-16">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Progreso</span>
                            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{completedExIds.size} / {exercises.length}</span>
                        </div>
                        <div className="progress-bar-bg" style={{ height: '6px' }}>
                            <div className="progress-bar-fill" style={{ width: `${progressPct}%`, transition: 'width 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}></div>
                        </div>
                    </div>
                )}
            </div>

            <div className="exercise-list">
                {exercises.map(ex => (
                    <ExerciseCard
                        key={ex.id}
                        exercise={ex}
                        isExpanded={expandedExId === ex.id}
                        onToggle={() => setExpandedExId(expandedExId === ex.id ? null : ex.id!)}
                        onComplete={() => handleComplete(ex.id!)}
                    />
                ))}
                {exercises.length === 0 && (
                    <div className="empty-state text-center mt-32">
                        <Trophy size={48} className="text-secondary mb-16" />
                        <h3>Día de Descanso</h3>
                        <p className="text-secondary mt-8">Hoy no tienes ejercicios programados.<br />¡Aprovecha para recuperar!</p>
                    </div>
                )}
            </div>

            {isFullyCompleted ? (
                <div className="completion-banner fade-in mt-24 mb-32" style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'rgba(237, 179, 89, 0.2)', marginBottom: '16px', color: 'var(--accent-primary)' }}>
                        <Trophy size={48} />
                    </div>
                    <h2 style={{ color: 'var(--accent-primary)', marginBottom: '8px' }}>¡Entrenamiento Completado!</h2>
                    <p className="text-secondary mb-24">Gran trabajo. Guarda la sesión y descansa, te lo has ganado.</p>
                    <button className="primary-btn bottom-fixed action-glow main-cta" onClick={() => navigate('/dashboard')} style={{ background: 'linear-gradient(90deg, #d4983e 0%, var(--accent-primary) 100%)', color: '#121212' }}>
                        Guardar y Volver
                    </button>
                </div>
            ) : (
                <button className="secondary-btn bottom-fixed mt-24" onClick={() => navigate('/dashboard')} style={{ marginBottom: '24px' }}>
                    Pausar / Salir
                </button>
            )}
        </div>
    );
}
