import { useState, useCallback } from 'react';
import { BeamAnalysisService } from '../../core/services/BeamAnalysisService';
import type { BeamInput, BeamLoadInput } from '../../core/services/BeamAnalysisService';
import type { SupportType } from '../../core/entities/Node';
import type { AnalysisResults } from '../../core/logic/FemSolver';
import type { LoadType } from '../../core/entities/Load';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useBeamAnalysis = () => {
    // --- STATE ---
    const [length, setLength] = useState<number>(10);
    const [supports, setSupports] = useState<{ id: string, x: number, type: SupportType }[]>([]);
    const [loads, setLoads] = useState<BeamLoadInput[]>([]);
    // Material por defecto (Acero)
    const [material] = useState({ E: 200e9, I: 0.0001 });
    
    const [results, setResults] = useState<AnalysisResults | null>(null);
    const [error, setError] = useState<string | null>(null);

    // --- ACTIONS ---
    const updateLength = (newLength: number) => {
        if (newLength > 0) {
            setLength(newLength);
            setResults(null);
            // Limpiar elementos que queden fuera
            setSupports(prev => prev.filter(s => s.x <= newLength));
            setLoads(prev => prev.filter(l => (l.x ?? 0) <= newLength));
        }
    };

    const addSupport = (x: number, type: SupportType) => {
        setSupports(prev => {
            const filtered = prev.filter(s => Math.abs(s.x - x) > 1e-3);
            return [...filtered, { id: generateId(), x, type }];
        });
        setResults(null);
    };

    const removeSupport = (id: string) => {
        setSupports(prev => prev.filter(s => s.id !== id));
        setResults(null);
    };

    const addLoad = (type: LoadType, magnitude: number, x?: number, startX?: number, endX?: number) => {
        const newLoad: BeamLoadInput = {
            id: generateId(), type, magnitude, x, startX, endX, category: 'Live'
        };
        setLoads(prev => [...prev, newLoad]);
        setResults(null);
    };

    const removeLoad = (id: string) => {
        setLoads(prev => prev.filter(l => l.id !== id));
        setResults(null);
    };

    const solve = useCallback(() => {
        setError(null);
        try {
            const input: BeamInput = { length, E: material.E, I: material.I, supports, loads };
            const calculatedResults = BeamAnalysisService.analyze(input);
            setResults(calculatedResults);
        } catch (err) {
            console.error(err);
            const msg = err instanceof Error ? err.message : "Calculation error";
            setError(msg);
            setResults(null);
        }
    }, [length, supports, loads, material]);

    return { 
        length, setLength: updateLength, 
        supports, addSupport, removeSupport, 
        loads, addLoad, removeLoad, 
        solve, results, error 
    };
};