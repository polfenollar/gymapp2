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
    const count = await db.exerciseLibrary.count();
    if (count === 0) {
        await db.exerciseLibrary.bulkAdd([
            // 1. Tren Inferior (Piernas y Glúteos)
            { name: 'Sentadilla con barra (High Bar)', description: 'Controlada, sin bajar de los 90° si hay molestias.', muscleGroup: 'Piernas y Glúteos' },
            { name: 'Zancadas búlgaras (Sentadilla Búlgara)', description: 'El ejercicio estrella para tu caso; se puede hacer con técnica de 1.5 reps.', muscleGroup: 'Piernas y Glúteos' },
            { name: 'Step-Up Explosivo (Cajón alto)', description: 'Subida rápida, bajada lenta (3 seg).', muscleGroup: 'Piernas y Glúteos' },
            { name: 'Sentadilla Goblet', description: 'Con mancuerna al pecho, pausa abajo de 2 seg e isometría final.', muscleGroup: 'Piernas y Glúteos' },
            { name: 'Extensión de cuádriceps', description: 'En máquina, buscando el fallo metabólico (ardor).', muscleGroup: 'Piernas y Glúteos' },
            { name: 'Peso muerto rumano (con mancuernas)', description: 'Rango corto (hasta la rodilla) para proteger L5-S1.', muscleGroup: 'Piernas y Glúteos' },
            { name: 'Curl femoral', description: 'Aislamiento de isquios (sentado o tumbado).', muscleGroup: 'Piernas y Glúteos' },
            { name: 'Hip Thrust (Empuje de cadera)', description: 'Fundamental para fortalecer glúteos y estabilizar la pelvis.', muscleGroup: 'Piernas y Glúteos' },
            { name: 'Aducciones en máquina', description: 'Para estabilidad lateral en el pádel.', muscleGroup: 'Piernas y Glúteos' },
            { name: 'Gemelos', description: 'Elevación de talones (de pie o sentado).', muscleGroup: 'Piernas y Glúteos' },
            { name: 'Tibial anterior', description: 'Elevación de puntas (salud de rodilla).', muscleGroup: 'Piernas y Glúteos' },
            { name: 'Hiperextensiones a 45°', description: 'Foco en glúteos, sin arquear la zona lumbar.', muscleGroup: 'Piernas y Glúteos' },

            // 2. Empuje (Pecho, Hombros y Tríceps)
            { name: 'Press de Banca (Barra)', description: 'Tu ejercicio de fuerza base.', muscleGroup: 'Pecho, Hombros y Tríceps' },
            { name: 'Press inclinado (Mancuernas)', description: 'Para la parte superior del pecho.', muscleGroup: 'Pecho, Hombros y Tríceps' },
            { name: 'Press Militar sentado (Mancuernas)', description: 'Más seguro para tu hernia que la barra de pie.', muscleGroup: 'Pecho, Hombros y Tríceps' },
            { name: 'Press Arnold', description: 'Rotación que trabaja todas las caras del deltoides.', muscleGroup: 'Pecho, Hombros y Tríceps' },
            { name: 'Elevaciones laterales (Mancuernas o polea)', description: 'Variantes de pie, sentado y con drop-sets.', muscleGroup: 'Pecho, Hombros y Tríceps' },
            { name: 'Cruces en polea', description: 'Trabajo de detalle para el pectoral.', muscleGroup: 'Pecho, Hombros y Tríceps' },
            { name: 'Fondos en paralelas', description: 'Trabajo de tríceps y pecho inferior.', muscleGroup: 'Pecho, Hombros y Tríceps' },
            { name: 'Extensión de tríceps', description: 'Polea con cuerda - Aislamiento de tríceps.', muscleGroup: 'Pecho, Hombros y Tríceps' },
            { name: 'Press francés', description: 'Sugerido hacerlo en el suelo para mayor seguridad lumbar.', muscleGroup: 'Pecho, Hombros y Tríceps' },
            { name: 'Flexiones explosivas (con palmada)', description: 'Ejercicio de potencia/contraste.', muscleGroup: 'Pecho, Hombros y Tríceps' },

            // 3. Tracción (Espalda y Bíceps)
            { name: 'Dominadas estrictas', description: 'Ahora con fase excéntrica lenta.', muscleGroup: 'Espalda y Bíceps' },
            { name: 'Remo en polea baja (Gironda)', description: 'Agarre neutro, torso inmóvil.', muscleGroup: 'Espalda y Bíceps' },
            { name: 'Remo con mancuerna a una mano', description: 'Apoyado en banco (máxima seguridad para L5-S1).', muscleGroup: 'Espalda y Bíceps' },
            { name: 'Jalón al pecho', description: 'Amplitud de espalda (ancho o unilateral).', muscleGroup: 'Espalda y Bíceps' },
            { name: 'Pullover en polea alta', description: 'Brazos rectos - normal o explosiva para potencia.', muscleGroup: 'Espalda y Bíceps' },
            { name: 'Face Pulls', description: 'El ejercicio más importante para la salud de tus hombros.', muscleGroup: 'Espalda y Bíceps' },
            { name: 'Pájaros', description: 'Deltoide posterior (Sentado o en máquina), para redondear el hombro.', muscleGroup: 'Espalda y Bíceps' },
            { name: 'Curl de bíceps', description: 'Diferentes ángulos para el bíceps (Barra Z / Mancuernas / Inclinado).', muscleGroup: 'Espalda y Bíceps' },
            { name: 'Curl Martillo', description: 'Para el braquial y antebrazo (agarre de la pala).', muscleGroup: 'Espalda y Bíceps' },

            // 4. Core y Salud de la Columna
            { name: 'Dead Bug', description: 'Control motor y estabilización lumbar.', muscleGroup: 'Core' },
            { name: 'Bird-Dog', description: 'Estabilidad cruzada de la columna.', muscleGroup: 'Core' },
            { name: 'Press Pallof', description: 'Anti-rotación, vital para transferir fuerza en el pádel.', muscleGroup: 'Core' },
            { name: 'Plancha (Plank) y Plancha Lateral', description: 'Resistencia del core.', muscleGroup: 'Core' },
            { name: 'Giros Rusos (Russian Twists)', description: 'Realizados de forma muy lenta y controlada.', muscleGroup: 'Core' },

            // 5. Cardio, Potencia y Movilidad
            { name: 'LISS (Caminata/Elíptica)', description: '20 min - Caminata con inclinación o elíptica.', muscleGroup: 'Cardio y Movilidad' },
            { name: 'HIIT (Bici estática)', description: '10-15 min - 30" sprint / 30" suave.', muscleGroup: 'Cardio y Movilidad' },
            { name: 'Saltos verticales', description: 'Amortiguando bien la caída (potencia).', muscleGroup: 'Cardio y Movilidad' },
            { name: 'Movilidad 90/90', description: 'Para la cadera.', muscleGroup: 'Cardio y Movilidad' },
            { name: 'Movilidad Torácica', description: 'Para liberar tensión de la espalda baja.', muscleGroup: 'Cardio y Movilidad' }
        ]);
    }
}
