import { useEffect, useState } from 'react';
import { db, type ExerciseLibrary, type TrackedSet } from '../services/db';
import { ArrowLeft, Calendar, Dumbbell, TrendingUp } from 'lucide-react';
import DataManagement from '../components/DataManagement';
import './History.css';

interface WorkoutSession {
    date: string;
    sets: TrackedSet[];
    exerciseCount: number;
    totalVolume: number;
}

interface ExerciseGroup {
    exercise: ExerciseLibrary;
    sets: TrackedSet[];
}

export default function History() {
    const [sessions, setSessions] = useState<WorkoutSession[]>([]);
    const [library, setLibrary] = useState<ExerciseLibrary[]>([]);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [detailGroups, setDetailGroups] = useState<ExerciseGroup[]>([]);

    useEffect(() => {
        async function loadHistory() {
            const allSets = await db.trackedSets.toArray();
            const allExercises = await db.exerciseLibrary.toArray();
            setLibrary(allExercises);

            // Group by date
            const dateMap = new Map<string, TrackedSet[]>();
            for (const set of allSets) {
                if (!set.completed) continue;
                const existing = dateMap.get(set.date) || [];
                existing.push(set);
                dateMap.set(set.date, existing);
            }

            // Build sessions sorted newest first
            const sessionList: WorkoutSession[] = [];
            for (const [date, sets] of dateMap.entries()) {
                const uniqueExercises = new Set(sets.map(s => s.exerciseId));
                const totalVolume = sets.reduce((sum, s) => sum + (s.weight * s.reps), 0);
                sessionList.push({
                    date,
                    sets,
                    exerciseCount: uniqueExercises.size,
                    totalVolume,
                });
            }
            sessionList.sort((a, b) => b.date.localeCompare(a.date));
            setSessions(sessionList);
        }
        loadHistory();
    }, []);

    const openDetail = (date: string) => {
        setSelectedDate(date);
        const session = sessions.find(s => s.date === date);
        if (!session) return;

        // Group sets by exerciseId
        const exMap = new Map<number, TrackedSet[]>();
        for (const set of session.sets) {
            const existing = exMap.get(set.exerciseId) || [];
            existing.push(set);
            exMap.set(set.exerciseId, existing);
        }

        const groups: ExerciseGroup[] = [];
        for (const [exId, sets] of exMap.entries()) {
            const exercise = library.find(e => e.id === exId);
            if (exercise) {
                groups.push({ exercise, sets: sets.sort((a, b) => a.setNumber - b.setNumber) });
            }
        }
        setDetailGroups(groups);
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    // Detail view for a specific date
    if (selectedDate) {
        const session = sessions.find(s => s.date === selectedDate);
        return (
            <div className="screen-padding history-container fade-in">
                <div className="history-detail-header">
                    <button className="icon-btn" onClick={() => setSelectedDate(null)}>
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h2 style={{ margin: 0 }}>{formatDate(selectedDate)}</h2>
                        <span className="text-secondary text-sm">
                            {session?.exerciseCount} ejercicios • {session?.totalVolume.toLocaleString()} kg total
                        </span>
                    </div>
                </div>

                <div className="detail-exercises">
                    {detailGroups.map(group => {
                        const isCardio = group.exercise.muscleGroup === 'Cardio y Movilidad';
                        const isCore = group.exercise.muscleGroup === 'Core';
                        return (
                            <div key={group.exercise.id} className="detail-exercise-card">
                                <div className="detail-ex-header">
                                    <h3>{group.exercise.name}</h3>
                                    <span className="text-secondary text-sm">{group.exercise.muscleGroup}</span>
                                </div>
                                <div className="detail-sets-table">
                                    {isCardio ? (
                                        <>
                                            <div className="detail-sets-header">
                                                <span>Duración</span>
                                            </div>
                                            {group.sets.map(set => (
                                                <div key={set.id} className="detail-set-row">
                                                    <span className="text-accent">{set.reps} min</span>
                                                </div>
                                            ))}
                                        </>
                                    ) : isCore ? (
                                        <>
                                            <div className="detail-sets-header">
                                                <span>Serie</span>
                                                <span>Reps</span>
                                            </div>
                                            {group.sets.map(set => (
                                                <div key={set.id} className="detail-set-row">
                                                    <span className="set-num-badge">{set.setNumber}</span>
                                                    <span>{set.reps} reps</span>
                                                </div>
                                            ))}
                                        </>
                                    ) : (
                                        <>
                                            <div className="detail-sets-header">
                                                <span>Serie</span>
                                                <span>Peso</span>
                                                <span>Reps</span>
                                                <span>Vol</span>
                                            </div>
                                            {group.sets.map(set => (
                                                <div key={set.id} className="detail-set-row">
                                                    <span className="set-num-badge">{set.setNumber}</span>
                                                    <span>{set.weight} kg</span>
                                                    <span>× {set.reps}</span>
                                                    <span className="text-accent">{set.weight * set.reps} kg</span>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // History list view
    return (
        <div className="screen-padding history-container fade-in">
            <DataManagement />

            <h1 style={{ marginTop: '24px' }}>Historial de Entrenamientos</h1>
            <p className="subtitle">Revisa tus sesiones de entrenamiento anteriores.</p>

            {sessions.length === 0 ? (
                <div className="flex-center empty-state" style={{ height: '50vh' }}>
                    <Calendar size={48} className="text-secondary mb-16" />
                    <h3 className="text-secondary">Aún no hay entrenamientos</h3>
                    <p className="text-secondary text-sm" style={{ marginTop: '8px' }}>
                        Completa un entreno para ver tu historial aquí.
                    </p>
                </div>
            ) : (
                <div className="sessions-list">
                    {sessions.map(session => (
                        <div
                            key={session.date}
                            className="session-card"
                            onClick={() => openDetail(session.date)}
                        >
                            <div className="session-card-left">
                                <div className="session-date-badge">
                                    <Calendar size={16} />
                                </div>
                                <div>
                                    <h3 style={{ marginBottom: '4px' }}>{formatDate(session.date)}</h3>
                                    <div className="session-meta">
                                        <span><Dumbbell size={14} /> {session.exerciseCount} ejercicios</span>
                                        <span><TrendingUp size={14} /> {session.totalVolume.toLocaleString()} kg</span>
                                    </div>
                                </div>
                            </div>
                            <ArrowLeft size={18} className="text-secondary" style={{ transform: 'rotate(180deg)' }} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
