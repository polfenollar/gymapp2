import React, { useRef, useState } from 'react';
import { db } from '../services/db';
import { Download, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import './DataManagement.css';

export default function DataManagement() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handleExport = async () => {
        try {
            const data = {
                blockConfigs: await db.blockConfigs.toArray(),
                workoutDays: await db.workoutDays.toArray(),
                trackedSets: await db.trackedSets.toArray(),
                exerciseLibrary: await db.exerciseLibrary.toArray(),
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `evogym-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setStatus({ type: 'success', message: 'Datos exportados correctamente.' });
            setTimeout(() => setStatus(null), 3000);
        } catch (error) {
            console.error('Export error:', error);
            setStatus({ type: 'error', message: 'Error al exportar los datos.' });
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            await db.transaction('rw', db.blockConfigs, db.workoutDays, db.trackedSets, db.exerciseLibrary, async () => {
                if (data.blockConfigs) {
                    await db.blockConfigs.clear();
                    await db.blockConfigs.bulkAdd(data.blockConfigs);
                }
                if (data.workoutDays) {
                    await db.workoutDays.clear();
                    await db.workoutDays.bulkAdd(data.workoutDays);
                }
                if (data.trackedSets) {
                    await db.trackedSets.clear();
                    await db.trackedSets.bulkAdd(data.trackedSets);
                }
                // Only overwrite exercises if provided
                if (data.exerciseLibrary && data.exerciseLibrary.length > 0) {
                    await db.exerciseLibrary.clear();
                    await db.exerciseLibrary.bulkAdd(data.exerciseLibrary);
                }
            });

            setStatus({ type: 'success', message: 'Datos restaurados correctamente. Recargando...' });

            // Reload to re-initialize stores and state
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (error) {
            console.error('Import error:', error);
            setStatus({ type: 'error', message: 'Archivo inválido o corrupto.' });
        }

        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="data-management-card card">
            <h3 className="section-title" style={{ marginTop: 0, marginBottom: '16px' }}>Gestión de Datos</h3>
            <p className="text-secondary text-sm mb-16">
                Guarda una copia de seguridad de tus entrenamientos (Exportar) antes de borrar la aplicación o cambiar de dispositivo.
            </p>

            <div className="data-actions">
                <button className="secondary-btn" onClick={handleExport}>
                    <Download size={18} className="mr-8" />
                    Exportar
                </button>
                <button className="secondary-btn" onClick={handleImportClick}>
                    <Upload size={18} className="mr-8" />
                    Importar
                </button>
                <input
                    type="file"
                    accept=".json"
                    style={{ display: 'none' }}
                    ref={fileInputRef}
                    onChange={handleFileChange}
                />
            </div>

            {status && (
                <div className={`status-message ${status.type} mt-16`}>
                    {status.type === 'success' ? <CheckCircle2 size={16} className="mr-4" /> : <AlertCircle size={16} className="mr-4" />}
                    {status.message}
                </div>
            )}
        </div>
    );
}
