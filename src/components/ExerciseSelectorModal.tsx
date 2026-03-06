import { useState, useMemo } from 'react';
import { Search, ArrowLeft, Check, Plus } from 'lucide-react';
import type { ExerciseLibrary } from '../services/db';
import './ExerciseSelectorModal.css';

interface ExerciseSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    dayName: string;
    library: ExerciseLibrary[];
    selectedIds: number[];
    onToggle: (id: number) => void;
}

export default function ExerciseSelectorModal({
    isOpen,
    onClose,
    dayName,
    library,
    selectedIds,
    onToggle
}: ExerciseSelectorModalProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');

    // Dynamically calculate available categories based on library content
    const dynamicCategories = useMemo(() => {
        const groups = new Set(library.map(ex => ex.muscleGroup).filter((v): v is string => !!v));
        return ['All', ...Array.from(groups)];
    }, [library]);

    // Filter exercises based on search term and category
    const filteredLibrary = useMemo(() => {
        return library.filter(ex => {
            const matchesSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = activeCategory === 'All' || ex.muscleGroup === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [library, searchTerm, activeCategory]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content fade-in-up">

                {/* Header */}
                <div className="modal-header">
                    <button className="icon-btn" onClick={onClose}>
                        <ArrowLeft size={24} />
                    </button>
                    <h2>Biblioteca de Ejercicios</h2>
                    <span className="logo-placeholder">EVO GYM</span>
                </div>

                <div className="modal-sub-header">
                    <span className="adding-to">Añadiendo a: <strong>{dayName}</strong></span>
                </div>

                {/* Search Bar */}
                <div className="search-container">
                    <Search className="search-icon" size={20} />
                    <input
                        type="search"
                        placeholder="Buscar ejercicios..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>

                {/* Categories Scrollable Row */}
                <div className="categories-scroll">
                    <div className="filter-chips">
                        {dynamicCategories.map(cat => (
                            <button
                                key={cat}
                                className={`filter-chip ${activeCategory === cat ? 'active' : ''}`}
                                onClick={() => setActiveCategory(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Exercise List */}
                <div className="exercise-list-scroll">
                    {filteredLibrary.map(ex => {
                        const isSelected = selectedIds.includes(ex.id!);
                        return (
                            <div
                                key={ex.id}
                                className={`list-item ${isSelected ? 'selected' : ''}`}
                                onClick={() => onToggle(ex.id!)}
                            >
                                <div className="list-item-content">
                                    <h3>{ex.name}</h3>
                                    <div className="list-item-desc">
                                        <div className="info-icon">ⓘ</div>
                                        <p>{ex.description}</p>
                                    </div>
                                </div>
                                <button className={`toggle-btn ${isSelected ? 'checked' : ''}`}>
                                    {isSelected ? <Check size={20} /> : <Plus size={20} />}
                                </button>
                            </div>
                        );
                    })}
                    {filteredLibrary.length === 0 && (
                        <p className="empty-message">No se encontraron ejercicios.</p>
                    )}
                </div>

                {/* Confirm Button */}
                <div className="modal-actions">
                    <button className="primary-btn w-full action-glow" onClick={onClose}>
                        Listo ({selectedIds.length} ejercicios)
                    </button>
                </div>

            </div>
        </div>
    );
}
