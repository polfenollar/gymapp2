import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, type ExerciseLibrary, type BlockConfig, type WorkoutDay, populateInitialExercises } from '../services/db';
import { useAppStore } from '../store/useAppStore';
import { ChevronRight, ChevronLeft, Save, HelpCircle, Plus, X, Copy } from 'lucide-react';
import ExerciseSelectorModal from '../components/ExerciseSelectorModal';
import './ConfigFlow.css';

const TARGETS = [
    {
        id: 'Fuerza',
        desc: '4-8 semanas, pocas repeticiones, alta intensidad.',
        howToTrain: 'Foco en movimientos compuestos (Press, Sentadilla, Peso Muerto). Rango de 1-5 reps con descansos largos (3-5 min).',
        howToRest: 'Prioriza el sueño profundo. Evita el cardio de alto impacto entre sesiones pesadas.',
        howToEat: 'Superávit calórico ligero. Alta proteína para reparar tejido conectivo y músculo.'
    },
    {
        id: 'Hipertrofia',
        desc: '6-12 semanas, repeticiones moderadas, alto volumen.',
        howToTrain: 'Rango de 8-12 reps. Foco en la conexión mente-músculo y tiempo bajo tensión.',
        howToRest: '48h de descanso entre el mismo grupo muscular. Sueño de 7-9 horas.',
        howToEat: 'Superávit calórico (250-500 kcal adicionales). Ingesta constante de carbohidratos para energía.'
    },
    {
        id: 'Definición',
        desc: '8-16 semanas, preparación de corte.',
        howToTrain: 'Mantén la intensidad pero reduce el volumen si es necesario. Añade cardio LISS de baja intensidad.',
        howToRest: 'Recuperación más lenta debido al déficit. El descanso es crítico para evitar el catabolismo.',
        howToEat: 'Déficit calórico controlado. Aumenta la proteína para preservar masa muscular.'
    },
    {
        id: 'Recuperación',
        desc: '1 semana, volumen bajo, descarga.',
        howToTrain: 'Carga al 50-60% de tu máximo. No busques el fallo. Mejora la técnica.',
        howToRest: 'Descanso activo (estiramientos, yoga, caminatas ligeras).',
        howToEat: 'Mantenimiento calórico. Enfoque en micronutrientes y antiinflamatorios.'
    }
];

export default function ConfigFlow() {
    const navigate = useNavigate();
    const activeBlockId = useAppStore(state => state.activeBlockId);
    const setActiveBlockId = useAppStore(state => state.setActiveBlockId);
    const [step, setStep] = useState(0);
    const [target, setTarget] = useState('Hipertrofia');
    const [duration, setDuration] = useState(8);
    const [daysPerWeek, setDaysPerWeek] = useState(4);
    const [daysConfig, setDaysConfig] = useState<number[][]>([]);
    const [library, setLibrary] = useState<ExerciseLibrary[]>([]);
    const [activeBlock, setActiveBlock] = useState<BlockConfig | null>(null);
    const [allDays, setAllDays] = useState<WorkoutDay[]>([]);
    const [editingDayIdx, setEditingDayIdx] = useState<number | null>(null);
    const [selectedWeek, setSelectedWeek] = useState(1);
    // Track if we're editing a specific week (null = creating template for all weeks)
    const [editingWeek, setEditingWeek] = useState<number | null>(null);

    useEffect(() => {
        populateInitialExercises().then(() => {
            db.exerciseLibrary.toArray().then(setLibrary);
        });
    }, []);

    useEffect(() => {
        async function fetchActive() {
            if (activeBlockId) {
                const block = await db.blockConfigs.get(activeBlockId);
                const days = await db.workoutDays.where('blockId').equals(activeBlockId).toArray();
                if (block) {
                    setActiveBlock(block);
                    setAllDays(days.sort((a, b) => a.weekNumber === b.weekNumber ? a.dayNumber - b.dayNumber : a.weekNumber - b.weekNumber));
                    setStep(0);
                } else {
                    setStep(1);
                }
            } else {
                setStep(1);
            }
        }
        fetchActive();
    }, [activeBlockId]);

    useEffect(() => {
        setDaysConfig(prev => {
            const newConfig = Array(daysPerWeek).fill([]);
            for (let i = 0; i < Math.min(daysPerWeek, prev.length); i++) {
                newConfig[i] = prev[i];
            }
            return newConfig;
        });
    }, [daysPerWeek]);

    const toggleExercise = (dayIndex: number, exerciseId: number) => {
        const newDays = [...daysConfig];
        const currentList = newDays[dayIndex] || [];
        if (currentList.includes(exerciseId)) {
            newDays[dayIndex] = currentList.filter(id => id !== exerciseId);
        } else {
            newDays[dayIndex] = [...currentList, exerciseId];
        }
        setDaysConfig(newDays);
    };

    // Get days for a specific week from the stored allDays
    const getDaysForWeek = (weekNum: number) => {
        return allDays
            .filter(d => d.weekNumber === weekNum)
            .sort((a, b) => a.dayNumber - b.dayNumber);
    };

    const handleSave = async () => {
        try {
            let blockId = activeBlock?.id;
            if (blockId) {
                await db.blockConfigs.update(blockId, {
                    target,
                    durationWeeks: duration,
                    daysPerWeek
                });

                if (editingWeek !== null) {
                    // Only update the specific week being customized
                    const existingDays = await db.workoutDays
                        .where('[blockId+weekNumber]')
                        .equals([blockId, editingWeek])
                        .toArray();
                    for (const day of existingDays) {
                        if (day.id) await db.workoutDays.delete(day.id);
                    }
                    for (let i = 0; i < daysPerWeek; i++) {
                        await db.workoutDays.add({
                            blockId,
                            weekNumber: editingWeek,
                            dayNumber: i + 1,
                            exerciseIds: daysConfig[i] || []
                        });
                    }
                } else {
                    // Template mode: replicate across ALL weeks
                    await db.workoutDays.where('blockId').equals(blockId).delete();
                    for (let week = 1; week <= duration; week++) {
                        for (let i = 0; i < daysPerWeek; i++) {
                            await db.workoutDays.add({
                                blockId,
                                weekNumber: week,
                                dayNumber: i + 1,
                                exerciseIds: daysConfig[i] || []
                            });
                        }
                    }
                }
            } else {
                blockId = await db.blockConfigs.add({
                    target,
                    durationWeeks: duration,
                    daysPerWeek,
                    startDate: new Date().toISOString()
                }) as number;

                // New plan: replicate template across all weeks
                for (let week = 1; week <= duration; week++) {
                    for (let i = 0; i < daysPerWeek; i++) {
                        await db.workoutDays.add({
                            blockId,
                            weekNumber: week,
                            dayNumber: i + 1,
                            exerciseIds: daysConfig[i] || []
                        });
                    }
                }
            }
            setActiveBlockId(blockId);
            setEditingWeek(null);
            navigate('/dashboard');
        } catch (e) {
            console.error(e);
        }
    };

    const activeTarget = TARGETS.find(t => t.id === target);

    return (
        <div className="screen-padding config-container">
            {/* ===== STEP 0: VIEW CURRENT PLAN ===== */}
            {step === 0 && activeBlock && (
                <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div className="flex-between mb-16">
                        <h1 style={{ margin: 0 }}>Plan Actual</h1>
                        <div className="badge">{activeBlock.target}</div>
                    </div>

                    <div className="plan-card">
                        <h3 className="mb-8">Parámetros</h3>
                        <p className="text-secondary">Duración: {activeBlock.durationWeeks} Semanas</p>
                        <p className="text-secondary">Frecuencia: {activeBlock.daysPerWeek} Días/Semana</p>
                        <p className="text-secondary">Inicio: {new Date(activeBlock.startDate).toLocaleDateString()}</p>
                    </div>

                    {/* Week stepper */}
                    <div className="week-stepper">
                        <button
                            className="stepper-btn"
                            disabled={selectedWeek <= 1}
                            onClick={() => setSelectedWeek(w => Math.max(1, w - 1))}
                        >
                            <ChevronLeft size={22} />
                        </button>
                        <span className="stepper-label">Semana {selectedWeek} de {activeBlock.durationWeeks}</span>
                        <button
                            className="stepper-btn"
                            disabled={selectedWeek >= activeBlock.durationWeeks}
                            onClick={() => setSelectedWeek(w => Math.min(activeBlock.durationWeeks, w + 1))}
                        >
                            <ChevronRight size={22} />
                        </button>
                    </div>

                    <div className="flex-between mb-8 mt-16">
                        <h3 style={{ margin: 0 }}>Semana {selectedWeek}</h3>
                        <button
                            className="chip chip-active"
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '12px' }}
                            onClick={() => {
                                const weekDays = getDaysForWeek(selectedWeek);
                                setTarget(activeBlock.target);
                                setDuration(activeBlock.durationWeeks);
                                setDaysPerWeek(activeBlock.daysPerWeek);
                                const newDaysConfig = Array(activeBlock.daysPerWeek).fill([]);
                                weekDays.forEach(day => {
                                    if (day.dayNumber <= activeBlock.daysPerWeek) {
                                        newDaysConfig[day.dayNumber - 1] = day.exerciseIds || [];
                                    }
                                });
                                setDaysConfig(newDaysConfig);
                                setEditingWeek(selectedWeek);
                                setStep(3);
                            }}
                        >
                            Personalizar
                        </button>
                    </div>

                    <div className="days-list scrollable-area">
                        {getDaysForWeek(selectedWeek).map(day => (
                            <div key={day.id} className="day-card">
                                <h3 className="mb-8" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Día {day.dayNumber}</h3>
                                <div className="selected-exercises-list">
                                    {day.exerciseIds.map((exId, idx) => {
                                        const ex = library.find(l => l.id === exId);
                                        return ex ? <div key={`${exId}-${idx}`} className="text-secondary text-sm" style={{ padding: '4px 0' }}>- {ex.name}</div> : null;
                                    })}
                                    {day.exerciseIds.length === 0 && (
                                        <span className="text-secondary text-sm">Sin ejercicios asignados</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bottom-fixed">
                        <button className="primary-btn w-full mb-16" onClick={() => {
                            // Edit as template (all weeks)
                            const week1Days = getDaysForWeek(1);
                            setTarget(activeBlock.target);
                            setDuration(activeBlock.durationWeeks);
                            setDaysPerWeek(activeBlock.daysPerWeek);
                            const newDaysConfig = Array(activeBlock.daysPerWeek).fill([]);
                            week1Days.forEach(day => {
                                if (day.dayNumber <= activeBlock.daysPerWeek) {
                                    newDaysConfig[day.dayNumber - 1] = day.exerciseIds || [];
                                }
                            });
                            setDaysConfig(newDaysConfig);
                            setEditingWeek(null);
                            setStep(1);
                        }}>
                            Editar Plan
                        </button>
                        <button className="secondary-btn w-full" onClick={() => {
                            if (window.confirm('¿Estás seguro de que quieres crear un nuevo plan? Esto reemplazará tu bloque actual.')) {
                                setActiveBlock(null);
                                setActiveBlockId(null);
                                setTarget('Hipertrofia');
                                setDuration(8);
                                setDaysPerWeek(4);
                                setDaysConfig([]);
                                setEditingWeek(null);
                                setStep(1);
                            }
                        }}>
                            Crear Nuevo Plan
                        </button>
                    </div>
                </div>
            )}

            {/* ===== STEP 1: SELECT TARGET ===== */}
            {step === 1 && (
                <div className="fade-in">
                    <h1>Seleccionar Objetivo</h1>
                    <p className="subtitle">¿Cuál es tu objetivo principal para este bloque?</p>
                    <div className="grid-list">
                        {TARGETS.map(t => (
                            <button
                                key={t.id}
                                className={`card-select ${target === t.id ? 'selected' : ''}`}
                                onClick={() => setTarget(t.id)}
                            >
                                <h3>{t.id}</h3>
                            </button>
                        ))}
                    </div>
                    <div className="recommendation-box">
                        <div className="flex-start mb-16">
                            <HelpCircle size={20} className="info-icon" />
                            <p className="font-bold">{activeTarget?.id} - Guía del Bloque</p>
                        </div>
                        <div className="rec-grid">
                            <div className="rec-item">
                                <span className="rec-label">Entrenar:</span>
                                <p>{activeTarget?.howToTrain}</p>
                            </div>
                            <div className="rec-item">
                                <span className="rec-label">Descansar:</span>
                                <p>{activeTarget?.howToRest}</p>
                            </div>
                            <div className="rec-item">
                                <span className="rec-label">Comer:</span>
                                <p>{activeTarget?.howToEat}</p>
                            </div>
                        </div>
                    </div>
                    <button className="primary-btn bottom-fixed" onClick={() => setStep(2)}>
                        Siguiente <ChevronRight size={20} />
                    </button>
                </div>
            )}

            {/* ===== STEP 2: BLOCK PARAMETERS ===== */}
            {step === 2 && (
                <div className="fade-in">
                    <h1>Parámetros del Bloque</h1>
                    <div className="input-group">
                        <label>Duración ({duration} Semanas)</label>
                        <input
                            type="range" min="1" max="16" value={duration}
                            onChange={e => setDuration(parseInt(e.target.value))}
                        />
                    </div>
                    <div className="input-group">
                        <label>Frecuencia ({daysPerWeek} Días/Semana)</label>
                        <input
                            type="range" min="1" max="7" value={daysPerWeek}
                            onChange={e => setDaysPerWeek(parseInt(e.target.value))}
                        />
                    </div>
                    <div className="action-row bottom-fixed">
                        <button className="secondary-btn" onClick={() => setStep(1)}>
                            <ChevronLeft size={20} /> Atrás
                        </button>
                        <button className="primary-btn" onClick={() => setStep(3)}>
                            Planificar Días <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* ===== STEP 3: PLAN DAYS ===== */}
            {step === 3 && (
                <div className="fade-in">
                    <h1>{editingWeek !== null ? `Semana ${editingWeek}` : 'Planifica tus Días'}</h1>
                    <p className="subtitle">
                        {editingWeek !== null
                            ? `Personalizando los ejercicios de la Semana ${editingWeek}.`
                            : 'Esta configuración se aplicará como plantilla a todas las semanas del bloque.'
                        }
                    </p>
                    {editingWeek === null && (
                        <div className="recommendation-box mb-16">
                            <Copy size={18} className="info-icon" />
                            <p>Los ejercicios se copiarán a las {duration} semanas. Podrás personalizar semanas individuales después.</p>
                        </div>
                    )}
                    <div className="days-list scrollable-area">
                        {daysConfig.map((selectedIds, dayIndex) => (
                            <div key={dayIndex} className="day-card">
                                <div className="flex-between">
                                    <div>
                                        <h3 style={{ marginBottom: '4px' }}>Día {dayIndex + 1}</h3>
                                        <span className="text-secondary text-sm">{selectedIds.length} ejercicios</span>
                                    </div>
                                    <button
                                        className="chip chip-active"
                                        style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', outline: 'none' }}
                                        onClick={() => setEditingDayIdx(dayIndex)}
                                    >
                                        <Plus size={16} /> Añadir
                                    </button>
                                </div>
                                {selectedIds.length > 0 && (
                                    <div className="selected-exercises-list mt-16">
                                        {selectedIds.map(exId => {
                                            const ex = library.find(l => l.id === exId);
                                            return ex ? (
                                                <div key={exId} className="selected-ex-row">
                                                    <span>- {ex.name}</span>
                                                    <button onClick={() => toggleExercise(dayIndex, exId)} className="remove-btn">
                                                        <X size={16} className="text-secondary" />
                                                    </button>
                                                </div>
                                            ) : null;
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="action-row bottom-fixed">
                        <button className="secondary-btn" onClick={() => {
                            if (editingWeek !== null) {
                                // Go back to plan overview
                                setEditingWeek(null);
                                setStep(0);
                            } else {
                                setStep(2);
                            }
                        }}>
                            <ChevronLeft size={20} /> Atrás
                        </button>
                        <button className="primary-btn" onClick={handleSave}>
                            Guardar {editingWeek !== null ? `Sem ${editingWeek}` : 'Bloque'} <Save size={20} style={{ marginLeft: '8px' }} />
                        </button>
                    </div>
                </div>
            )}

            {editingDayIdx !== null && (
                <ExerciseSelectorModal
                    isOpen={true}
                    onClose={() => setEditingDayIdx(null)}
                    dayName={`Día ${editingDayIdx + 1}`}
                    library={library}
                    selectedIds={daysConfig[editingDayIdx] || []}
                    onToggle={(id) => toggleExercise(editingDayIdx, id)}
                />
            )}
        </div>
    );
}
