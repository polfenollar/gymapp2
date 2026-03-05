import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, RotateCcw, CheckCircle2, Circle, Trophy } from 'lucide-react';
import { db, type ExerciseLibrary, type TrackedSet } from '../services/db';
import { useAppStore } from '../store/useAppStore';
import './ActiveWorkout.css';

function Chronometer() {
    const [time, setTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (isRunning) {
            interval = setInterval(() => setTime(t => t + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [isRunning]);

    const format = (secs: number) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <div className="chronometer">
            <div className="time-display">{format(time)}</div>
            <div className="chrono-controls">
                <button onClick={() => setIsRunning(!isRunning)} className="chrono-btn">
                    {isRunning ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
                </button>
                <button onClick={() => { setTime(0); setIsRunning(false); }} className="chrono-btn">
                    <RotateCcw size={18} />
                </button>
            </div>
        </div>
    );
}

function ExerciseCard({ exercise }: { exercise: ExerciseLibrary }) {
    const [expanded, setExpanded] = useState(false);
    const [sets, setSets] = useState<Partial<TrackedSet>[]>([
        { setNumber: 1, weight: 0, reps: 0, completed: false },
        { setNumber: 2, weight: 0, reps: 0, completed: false },
        { setNumber: 3, weight: 0, reps: 0, completed: false },
        { setNumber: 4, weight: 0, reps: 0, completed: false }
    ]);
    const [isSaved, setIsSaved] = useState(false);

    const toggleSet = (index: number) => {
        const newSets = [...sets];
        newSets[index].completed = !newSets[index].completed;
        setSets(newSets);
    };

    const updateSet = (index: number, field: 'weight' | 'reps', value: string) => {
        const newSets = [...sets];
        newSets[index][field] = Number(value);
        setSets(newSets);
    };

    const saveExercise = async () => {
        const today = new Date().toISOString().split('T')[0];
        const completedSets = sets.filter(s => s.completed);

        for (const set of completedSets) {
            await db.trackedSets.add({
                date: today,
                exerciseId: exercise.id!,
                setNumber: set.setNumber!,
                weight: set.weight!,
                reps: set.reps!,
                completed: true
            });
        }
        setIsSaved(true);
        setTimeout(() => setExpanded(false), 500);
    };

    return (
        <div className={`exercise-card ${expanded ? 'expanded' : ''} ${isSaved ? 'saved' : ''}`}>
            <div className="exercise-header" onClick={() => setExpanded(!expanded)}>
                <div className="ex-info">
                    <h3>{exercise.name}</h3>
                    <span className="ex-muscle">{exercise.muscleGroup}</span>
                </div>
                {isSaved ? <Trophy size={20} className="text-accent" /> : <div className="indicator" />}
            </div>

            {expanded && (
                <div className="exercise-body">
                    <p className="ex-desc">{exercise.description}</p>
                    <div className="sets-container">
                        <div className="sets-header">
                            <span>Set</span>
                            <span>kg</span>
                            <span>Reps</span>
                            <span>Done</span>
                        </div>
                        {sets.map((set, idx) => (
                            <div key={idx} className={`set-row ${set.completed ? 'completed' : ''}`}>
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
                                <button className="check-btn" onClick={() => toggleSet(idx)}>
                                    {set.completed ? <CheckCircle2 className="text-accent" /> : <Circle className="text-secondary" />}
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="history-section">
                        <h4 className="hist-title">Semana Anterior</h4>
                        <div className="history-table">
                            <div className="hist-row text-secondary">
                                <span>Vol Total: 450kg</span>
                                <span>Máx: 100kg x 5</span>
                            </div>
                        </div>
                    </div>

                    {!isSaved && (
                        <button className="primary-btn sm-btn mt-16" onClick={saveExercise}>
                            Guardar Series
                        </button>
                    )}
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
                // Load the first day of the current week
                const weekDays = await db.workoutDays
                    .where('[blockId+weekNumber]')
                    .equals([activeBlockId, weekNum])
                    .toArray();
                const firstDay = weekDays.sort((a, b) => a.dayNumber - b.dayNumber)[0];
                if (firstDay && firstDay.exerciseIds.length > 0) {
                    const exs = await Promise.all(
                        firstDay.exerciseIds.map(id => db.exerciseLibrary.get(id))
                    );
                    setExercises(exs.filter(Boolean) as ExerciseLibrary[]);
                    return;
                }
            }
            const allEx = await db.exerciseLibrary.toArray();
            setExercises(allEx);
        }
        fetchTodayWorkout();
    }, [activeBlockId]);

    return (
        <div className="screen-padding workout-container fade-in">
            <div className="workout-topbar">
                <div className="workout-header-text">
                    <h2 style={{ marginBottom: 0 }}>Día 1</h2>
                    <span className="text-secondary text-sm">Semana {currentWeek}</span>
                </div>
                <div className="workout-header-chrono">
                    <Chronometer />
                </div>
            </div>

            <div className="exercise-list">
                {exercises.map(ex => (
                    <ExerciseCard key={ex.id} exercise={ex} />
                ))}
                {exercises.length === 0 && <p className="text-secondary text-center mt-24">No se encontraron ejercicios.</p>}
            </div>

            <button className="primary-btn bottom-fixed action-glow main-cta" onClick={() => navigate('/dashboard')}>
                Finalizar Entreno
            </button>
        </div>
    );
}
