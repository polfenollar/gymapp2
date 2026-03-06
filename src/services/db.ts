import Dexie, { type Table } from 'dexie';

export interface BlockConfig {
    id?: number;
    target: string; // 'Strength', 'Hypertrophy', 'Definition', 'Recovery'
    durationWeeks: number;
    daysPerWeek: number;
    startDate: string; // ISO String
}

export interface WorkoutDay {
    id?: number;
    blockId: number;
    weekNumber: number; // e.g. 1, 2, ... durationWeeks
    dayNumber: number; // e.g. 1, 2, ... daysPerWeek
    exerciseIds: number[];
}

export interface ExerciseLibrary {
    id?: number;
    name: string;
    description: string;
    imageUrl?: string;
    muscleGroup?: string;
}

export interface TrackedSet {
    id?: number;
    date: string; // YYYY-MM-DD
    exerciseId: number;
    setNumber: number; // 1, 2, 3, 4
    weight: number;
    reps: number;
    completed: boolean;
}

export class GymDatabase extends Dexie {
    blockConfigs!: Table<BlockConfig>;
    workoutDays!: Table<WorkoutDay>;
    exerciseLibrary!: Table<ExerciseLibrary>;
    trackedSets!: Table<TrackedSet>;

    constructor() {
        super('GymAppDB');
        this.version(1).stores({
            blockConfigs: '++id, target',
            workoutDays: '++id, blockId',
            exerciseLibrary: '++id, name',
            trackedSets: '++id, date, exerciseId, [date+exerciseId]'
        });
        this.version(2).stores({
            blockConfigs: '++id, target',
            workoutDays: '++id, blockId, [blockId+weekNumber]',
            exerciseLibrary: '++id, name',
            trackedSets: '++id, date, exerciseId, [date+exerciseId]'
        }).upgrade(tx => {
            // Migrate existing WorkoutDay rows: set weekNumber=1 for all
            return tx.table('workoutDays').toCollection().modify(day => {
                if (!day.weekNumber) day.weekNumber = 1;
            });
        });
    }
}

export const db = new GymDatabase();

export async function populateInitialExercises() {
    const existing = await db.exerciseLibrary.toArray();
    const existingNames = new Set(existing.map(e => e.name.toLowerCase().trim()));

    const masterList = [
        // Pecho
        { name: 'Press de banca barra', description: 'Empuje horizontal con barra para fuerza máxima.', muscleGroup: 'Pecho, Hombros y Tríceps' },
        { name: 'Press de banca mancuernas', description: 'Empuje con mayor rango de movimiento.', muscleGroup: 'Pecho, Hombros y Tríceps' },
        { name: 'Press inclinado mancuernas', description: 'Enfocado en la parte superior del pectoral.', muscleGroup: 'Pecho, Hombros y Tríceps' },
        { name: 'Press inclinado barra', description: 'Empuje pesado para el pectoral superior.', muscleGroup: 'Pecho, Hombros y Tríceps' },
        { name: 'Press declinado barra', description: 'Enfocado en la parte inferior del pecho.', muscleGroup: 'Pecho, Hombros y Tríceps' },
        { name: 'Press declinado mancuernas', description: 'Empuje inferior con mayor libertad de movimiento.', muscleGroup: 'Pecho, Hombros y Tríceps' },
        { name: 'Cruces en poleas', description: 'Aislamiento constante mediante tensión por cables.', muscleGroup: 'Pecho, Hombros y Tríceps' },
        { name: 'Aperturas con mancuernas', description: 'Estiramiento pectoral con peso libre.', muscleGroup: 'Pecho, Hombros y Tríceps' },
        { name: 'Aperturas Peck Deck', description: 'Aislamiento pectoral asistido en máquina.', muscleGroup: 'Pecho, Hombros y Tríceps' },
        { name: 'Fondos en paralelas', description: 'Empuje de peso corporal para pecho inferior.', muscleGroup: 'Pecho, Hombros y Tríceps' },
        { name: 'Fondos en máquina', description: 'Fondos asistidos para control del movimiento.', muscleGroup: 'Pecho, Hombros y Tríceps' },
        { name: 'Flexiones de brazos', description: 'Empuje básico contra el suelo.', muscleGroup: 'Pecho, Hombros y Tríceps' },
        { name: 'Press máquina convergente', description: 'Empuje guiado con arco de movimiento natural.', muscleGroup: 'Pecho, Hombros y Tríceps' },
        { name: 'Pull-over con mancuerna', description: 'Expansión torácica y trabajo de serrato.', muscleGroup: 'Pecho, Hombros y Tríceps' },

        // Espalda
        { name: 'Remo polea baja Gironda', description: 'Tracción horizontal para densidad de espalda.', muscleGroup: 'Espalda y Bíceps' },
        { name: 'Remo mancuerna una mano', description: 'Trabajo unilateral para corregir asimetrías.', muscleGroup: 'Espalda y Bíceps' },
        { name: 'Jalón al pecho ancho', description: 'Tracción vertical para amplitud de espalda.', muscleGroup: 'Espalda y Bíceps' },
        { name: 'Jalón al pecho unilateral', description: 'Jalón enfocado en conexión mente-músculo individual.', muscleGroup: 'Espalda y Bíceps' },
        { name: 'Pullover polea alta normal', description: 'Aislamiento del dorsal con brazos rectos.', muscleGroup: 'Espalda y Bíceps' },
        { name: 'Pullover polea alta explosivo', description: 'Trabajo de potencia en la fase concéntrica.', muscleGroup: 'Espalda y Bíceps' },
        { name: 'Dominadas agarre ancho', description: 'Tracción vertical exigente para espalda ancha.', muscleGroup: 'Espalda y Bíceps' },
        { name: 'Dominadas agarre estrecho', description: 'Enfocadas en la parte central del dorsal.', muscleGroup: 'Espalda y Bíceps' },
        { name: 'Dominadas agarre supino', description: 'Tracción vertical con gran ayuda del bíceps.', muscleGroup: 'Espalda y Bíceps' },
        { name: 'Remo barra 90 grados', description: 'Remo pesado para grosor total de espalda.', muscleGroup: 'Espalda y Bíceps' },
        { name: 'Remo barra 45 grados', description: 'Variante más cómoda para la zona lumbar.', muscleGroup: 'Espalda y Bíceps' },
        { name: 'Remo en punta (T)', description: 'Remo estable para cargar mucho peso.', muscleGroup: 'Espalda y Bíceps' },
        { name: 'Peso muerto convencional', description: 'Movimiento de fuerza total para cadena posterior.', muscleGroup: 'Espalda y Bíceps' },
        { name: 'Peso muerto sumo', description: 'Postura ancha con menor estrés lumbar.', muscleGroup: 'Espalda y Bíceps' },
        { name: 'Hiperextensiones lumbares', description: 'Fortalecimiento específico de la baja espalda.', muscleGroup: 'Espalda y Bíceps' },
        { name: 'Encogimientos de hombros', description: 'Aislamiento para el músculo trapecio.', muscleGroup: 'Espalda y Bíceps' },

        // Piernas
        { name: 'Extensión de cuádriceps', description: 'Aislamiento puro del cuádriceps en máquina.', muscleGroup: 'Piernas y Glúteos' },
        { name: 'Peso muerto rumano mancuernas', description: 'Estiramiento de femorales con mayor control.', muscleGroup: 'Piernas y Glúteos' },
        { name: 'Peso muerto rumano barra', description: 'Carga pesada para isquiotibiales y glúteos.', muscleGroup: 'Piernas y Glúteos' },
        { name: 'Peso muerto piernas rígidas', description: 'Máximo estiramiento de la cadena posterior.', muscleGroup: 'Piernas y Glúteos' },
        { name: 'Curl femoral sentado', description: 'Aislamiento de isquios con cadera estable.', muscleGroup: 'Piernas y Glúteos' },
        { name: 'Curl femoral tumbado', description: 'Trabajo de flexión de rodilla para isquios.', muscleGroup: 'Piernas y Glúteos' },
        { name: 'Gemelos de pie', description: 'Extensión de tobillo para el gastrocnemio.', muscleGroup: 'Piernas y Glúteos' },
        { name: 'Gemelos sentado', description: 'Enfocado principalmente en el músculo sóleo.', muscleGroup: 'Piernas y Glúteos' },
        { name: 'Tibial anterior', description: 'Fortalecimiento de la parte delantera de espinilla.', muscleGroup: 'Piernas y Glúteos' },
        { name: 'Sentadillas traseras', description: 'El ejercicio rey para pierna completa.', muscleGroup: 'Piernas y Glúteos' },
        { name: 'Sentadillas frontales', description: 'Mayor énfasis en cuádriceps y core vertical.', muscleGroup: 'Piernas y Glúteos' },
        { name: 'Sentadillas goblet', description: 'Sentadilla con peso frontal para mejorar técnica.', muscleGroup: 'Piernas y Glúteos' },
        { name: 'Prensa de piernas inclinada', description: 'Empuje pesado de pierna con espalda apoyada.', muscleGroup: 'Piernas y Glúteos' },
        { name: 'Prensa de piernas horizontal', description: 'Movimiento guiado para menor presión lumbar.', muscleGroup: 'Piernas y Glúteos' },
        { name: 'Zancadas (Lunges)', description: 'Trabajo unilateral para estabilidad y piernas.', muscleGroup: 'Piernas y Glúteos' },
        { name: 'Sentadilla Búlgara', description: 'Sentadilla unilateral con pie trasero elevado.', muscleGroup: 'Piernas y Glúteos' },
        { name: 'Sentadilla Hack', description: 'Sentadilla guiada con apoyo dorsal fijo.', muscleGroup: 'Piernas y Glúteos' },
        { name: 'Aducciones en máquina', description: 'Trabajo de la cara interna del muslo.', muscleGroup: 'Piernas y Glúteos' },
        { name: 'Abducciones en máquina', description: 'Aislamiento del glúteo medio y cadera.', muscleGroup: 'Piernas y Glúteos' },

        // Hombros
        { name: 'Press Arnold', description: 'Press rotativo para todas las cabezas del hombro.', muscleGroup: 'Pecho, Hombros y Tríceps' },
        { name: 'Face Pulls', description: 'Salud del hombro y deltoide posterior.', muscleGroup: 'Pecho, Hombros y Tríceps' },
        { name: 'Pájaros con mancuernas', description: 'Aislamiento del deltoide posterior inclinado.', muscleGroup: 'Pecho, Hombros y Tríceps' },
        { name: 'Press militar barra', description: 'Empuje vertical pesado de pie.', muscleGroup: 'Pecho, Hombros y Tríceps' },
        { name: 'Press militar mancuernas', description: 'Empuje vertical con mayor libertad articular.', muscleGroup: 'Pecho, Hombros y Tríceps' },
        { name: 'Elevaciones laterales mancuernas', description: 'Aislamiento para ensanchar los hombros.', muscleGroup: 'Pecho, Hombros y Tríceps' },
        { name: 'Elevaciones laterales poleas', description: 'Tensión constante en la parte lateral.', muscleGroup: 'Pecho, Hombros y Tríceps' },
        { name: 'Elevaciones frontales mancuernas', description: 'Aislamiento del deltoide anterior.', muscleGroup: 'Pecho, Hombros y Tríceps' },
        { name: 'Elevaciones frontales barra', description: 'Trabajo frontal simétrico con barra.', muscleGroup: 'Pecho, Hombros y Tríceps' },
        { name: 'Elevaciones frontales disco', description: 'Movimiento frontal simple con agarre neutro.', muscleGroup: 'Pecho, Hombros y Tríceps' },
        { name: 'Remo al mentón', description: 'Tracción vertical para hombro y trapecio.', muscleGroup: 'Pecho, Hombros y Tríceps' },

        // Brazos
        { name: 'Extensión tríceps cuerda', description: 'Aislamiento de tríceps con apertura final.', muscleGroup: 'Pecho, Hombros y Tríceps' },
        { name: 'Extensión tríceps barra', description: 'Empuje rígido para fuerza en tríceps.', muscleGroup: 'Pecho, Hombros y Tríceps' },
        { name: 'Press francés barra Z', description: 'Extensión de codo clásica para tríceps.', muscleGroup: 'Pecho, Hombros y Tríceps' },
        { name: 'Press francés mancuernas', description: 'Extensión de tríceps con agarre neutro.', muscleGroup: 'Pecho, Hombros y Tríceps' },
        { name: 'Curl bíceps barra Z', description: 'Flexión de codo cómoda para muñecas.', muscleGroup: 'Espalda y Bíceps' },
        { name: 'Curl bíceps mancuernas', description: 'Trabajo alterno de bíceps con supinación.', muscleGroup: 'Espalda y Bíceps' },
        { name: 'Curl bíceps inclinado', description: 'Máximo estiramiento de la cabeza larga.', muscleGroup: 'Espalda y Bíceps' },
        { name: 'Curl bíceps barra recta', description: 'Máxima tensión en la flexión del bíceps.', muscleGroup: 'Espalda y Bíceps' },
        { name: 'Curl Martillo', description: 'Enfocado en braquial y antebrazo.', muscleGroup: 'Espalda y Bíceps' },
        { name: 'Curl concentrado', description: 'Aislamiento máximo del pico del bíceps.', muscleGroup: 'Espalda y Bíceps' },
        { name: 'Curl banco Scott', description: 'Aislamiento evitando el balanceo del cuerpo.', muscleGroup: 'Espalda y Bíceps' },
        { name: 'Press banca agarre cerrado', description: 'Empuje de pecho enfocado en tríceps.', muscleGroup: 'Pecho, Hombros y Tríceps' },
        { name: 'Patada de tríceps', description: 'Extensión final de codo con mancuerna.', muscleGroup: 'Pecho, Hombros y Tríceps' },
        { name: 'Fondos entre bancos', description: 'Empuje de peso corporal para tríceps.', muscleGroup: 'Pecho, Hombros y Tríceps' },

        // Glúteos y Lumbar
        { name: 'Hip Thrust', description: 'El mejor ejercicio para glúteo mayor.', muscleGroup: 'Piernas y Glúteos' },
        { name: 'Hiperextensiones a 45°', description: 'Fortalece lumbar, glúteos e isquios.', muscleGroup: 'Piernas y Glúteos' },
        { name: 'Puente de glúteo', description: 'Extensión de cadera en el suelo.', muscleGroup: 'Piernas y Glúteos' },
        { name: 'Patada de glúteo polea', description: 'Aislamiento analítico de glúteo en cable.', muscleGroup: 'Piernas y Glúteos' },
        { name: 'Patada de glúteo máquina', description: 'Movimiento guiado de extensión de cadera.', muscleGroup: 'Piernas y Glúteos' },
        { name: 'Clamshells', description: 'Activación del glúteo medio en el suelo.', muscleGroup: 'Piernas y Glúteos' },
        { name: 'Step-up', description: 'Subida a plataforma para fuerza unilateral.', muscleGroup: 'Piernas y Glúteos' },

        // Core
        { name: 'Dead Bug', description: 'Estabilidad lumbo-pélvica y control abdominal.', muscleGroup: 'Core' },
        { name: 'Bird-Dog', description: 'Estabilidad cruzada de core y espalda.', muscleGroup: 'Core' },
        { name: 'Plancha abdominal', description: 'Resistencia isométrica de toda la faja abdominal.', muscleGroup: 'Core' },
        { name: 'Plancha Lateral', description: 'Trabajo isométrico de oblicuos y cadera.', muscleGroup: 'Core' },
        { name: 'Giros Rusos', description: 'Rotación de tronco para trabajo de oblicuos.', muscleGroup: 'Core' },
        { name: 'Crunch abdominal', description: 'Flexión de columna para recto abdominal.', muscleGroup: 'Core' },
        { name: 'Elevación piernas suelo', description: 'Trabajo de la zona abdominal inferior.', muscleGroup: 'Core' },
        { name: 'Elevación piernas colgado', description: 'Ejercicio avanzado de core y flexores.', muscleGroup: 'Core' },
        { name: 'Rueda abdominal', description: 'Extensión de core de alta intensidad.', muscleGroup: 'Core' },

        // Cardio / Movilidad
        { name: 'LISS', description: 'Cardio de baja intensidad y larga duración.', muscleGroup: 'Cardio y Movilidad' },
        { name: 'HIIT', description: 'Intervalos de alta intensidad para quemar grasa.', muscleGroup: 'Cardio y Movilidad' },
        { name: 'Saltos verticales', description: 'Entrenamiento de potencia explosiva para piernas.', muscleGroup: 'Cardio y Movilidad' },
        { name: 'Movilidad 90/90', description: 'Apertura de cadera y rotación interna/externa.', muscleGroup: 'Cardio y Movilidad' },
        { name: 'Movilidad Torácica', description: 'Mejora la extensión y rotación de espalda.', muscleGroup: 'Cardio y Movilidad' }
    ];

    const toAdd = masterList.filter(e => !existingNames.has(e.name.toLowerCase().trim()));
    if (toAdd.length > 0) {
        await db.exerciseLibrary.bulkAdd(toAdd);
    }

    // Fix retrospective bad groupings from previous deploy
    const groupMap: Record<string, string> = {
        'Pecho': 'Pecho, Hombros y Tríceps',
        'Espalda': 'Espalda y Bíceps',
        'Piernas': 'Piernas y Glúteos',
        'Hombros': 'Pecho, Hombros y Tríceps',
        'Brazos': 'Pecho, Hombros y Tríceps', // Fallback
        'Glúteos y Lumbar': 'Piernas y Glúteos'
    };

    const toUpdate = existing.filter(ex => ex.muscleGroup && groupMap[ex.muscleGroup]);
    if (toUpdate.length > 0) {
        // Find correct mapping from masterList directly where possible to match biceps/triceps appropriately
        const updates = toUpdate.map(ex => {
            const trueGroup = masterList.find(m => m.name.toLowerCase().trim() === ex.name.toLowerCase().trim());
            return {
                ...ex,
                muscleGroup: trueGroup ? trueGroup.muscleGroup : groupMap[ex.muscleGroup!]
            };
        });
        await db.exerciseLibrary.bulkPut(updates);
    }
}
