import { useState, useCallback, useMemo } from 'react';
import { BeamAnalysisService } from '../../core/services/BeamAnalysisService';
import type { BeamInput, BeamLoadInput } from '../../core/services/BeamAnalysisService';
import type { SupportType } from '../../core/entities/Node';
import { Node } from '../../core/entities/Node';
import type { AnalysisResults } from '../../core/logic/FemSolver';
import type { LoadType, Load, LoadCategory } from '../../core/entities/Load';
import { PointForceLoad, PointMomentLoad, DistributedForceLoad } from '../../core/entities/Load';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useBeamAnalysis = () => {
    // --- STATE ---
    const [length, setLength] = useState<number>(10);
    const [supports, setSupports] = useState<{ id: string, x: number, type: SupportType }[]>([]);
    const [loads, setLoads] = useState<BeamLoadInput[]>([]);
    // Material properties (Steel default: E=200 GPa, I=0.0001 m⁴)
    const [material, setMaterial] = useState({ E: 200e9, I: 0.0001 });
    
    const [results, setResults] = useState<AnalysisResults | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Generate nodes from supports and loads for visualization
    const nodes = useMemo(() => {
        const points = new Set<number>();
        points.add(0);
        points.add(length);
        supports.forEach(s => points.add(s.x));
        loads.forEach(l => {
            if (typeof l.x === 'number') points.add(l.x);
            if (typeof l.startX === 'number') points.add(l.startX);
            if (typeof l.endX === 'number') points.add(l.endX);
        });

        const sortedX = Array.from(points)
            .sort((a, b) => a - b)
            .filter(x => x >= 0 && x <= length);

        return sortedX.map((x, i) => {
            const supportConf = supports.find(s => Math.abs(s.x - x) < 1e-4);
            const type = supportConf ? supportConf.type : 'Free';
            return new Node(`n${i}`, x, type);
        });
    }, [length, supports, loads]);

    // Convert BeamLoadInput to Load for diagram calculations
    const processedLoads = useMemo((): Load[] => {
        return loads.map(load => {
            const category = load.category || 'Dead';
            if (load.type === 'PointForce' && typeof load.x === 'number') {
                return new PointForceLoad(load.id, load.magnitude, load.x, category);
            } else if (load.type === 'PointMoment' && typeof load.x === 'number') {
                return new PointMomentLoad(load.id, load.magnitude, load.x, category);
            } else if (load.type === 'DistributedForce' && typeof load.startX === 'number' && typeof load.endX === 'number') {
                return new DistributedForceLoad(load.id, load.magnitude, load.startX, load.endX, category);
            }
            // Fallback - shouldn't happen
            return new PointForceLoad(load.id, 0, 0, category);
        }).filter(l => l.type !== 'PointForce' || (l as PointForceLoad).magnitude !== 0);
    }, [loads]);

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

    const addLoad = (type: LoadType, magnitude: number, x?: number, startX?: number, endX?: number, direction: 'up' | 'down' = 'down', category: LoadCategory = 'Live') => {
        // Apply direction: 'down' means negative (downward), 'up' means positive (upward)
        const signedMagnitude = direction === 'down' ? -Math.abs(magnitude) : Math.abs(magnitude);
        const newLoad: BeamLoadInput = {
            id: generateId(), type, magnitude: signedMagnitude, x, startX, endX, category
        };
        setLoads(prev => [...prev, newLoad]);
        setResults(null);
    };

    const removeLoad = (id: string) => {
        setLoads(prev => prev.filter(l => l.id !== id));
        setResults(null);
    };

    const updateLoadCategory = (id: string, category: LoadCategory) => {
        setLoads(prev => prev.map(l => l.id === id ? { ...l, category } : l));
        setResults(null);
    };

    const solve = useCallback(() => {
        setError(null);
        try {
            const input: BeamInput = { length, E: material.E, I: material.I, supports, loads };
            
            // Log backend input
            console.log('═══════════════════════════════════════════════════════');
            console.log('🔧 BACKEND INPUT - Beam Analysis Request');
            console.log('═══════════════════════════════════════════════════════');
            console.log('📏 Beam Properties:');
            console.log('   Length:', input.length, 'm');
            console.log('   E (Young\'s Modulus):', input.E, 'Pa =', (input.E / 1e9).toFixed(2), 'GPa');
            console.log('   I (Moment of Inertia):', input.I, 'm⁴');
            console.log('');
            console.log('🔩 Supports (' + input.supports.length + '):');
            input.supports.forEach((s, i) => {
                console.log(`   ${i + 1}. ${s.type} support at x = ${s.x.toFixed(3)} m`);
            });
            console.log('');
            console.log('⚖️  Loads (' + input.loads.length + '):');
            input.loads.forEach((l, i) => {
                if (l.type === 'PointForce' && typeof l.x === 'number') {
                    console.log(`   ${i + 1}. Point Force: ${l.magnitude.toFixed(2)} kN at x = ${l.x.toFixed(3)} m`);
                } else if (l.type === 'PointMoment' && typeof l.x === 'number') {
                    console.log(`   ${i + 1}. Point Moment: ${l.magnitude.toFixed(2)} kNm at x = ${l.x.toFixed(3)} m`);
                } else if (l.type === 'DistributedForce' && typeof l.startX === 'number' && typeof l.endX === 'number') {
                    const span = l.endX - l.startX;
                    const totalLoad = l.magnitude * span;
                    console.log(`   ${i + 1}. Distributed Force: ${l.magnitude.toFixed(2)} kN/m from x = ${l.startX.toFixed(3)} m to ${l.endX.toFixed(3)} m`);
                    console.log(`      → Span: ${span.toFixed(3)} m, Total Load: ${totalLoad.toFixed(2)} kN`);
                }
            });
            console.log('');
            console.log('📦 Full Input Object:', JSON.stringify(input, null, 2));
            console.log('═══════════════════════════════════════════════════════');
            
            const calculatedResults = BeamAnalysisService.analyze(input);
            setResults(calculatedResults);
        } catch (err) {
            console.error('❌ Calculation Error:', err);
            const msg = err instanceof Error ? err.message : "Calculation error";
            setError(msg);
            setResults(null);
        }
    }, [length, supports, loads, material]);

    return { 
        length, setLength: updateLength, 
        supports, addSupport, removeSupport, 
        loads, addLoad, removeLoad, updateLoadCategory,
        solve, results, error,
        nodes,
        processedLoads,
        material, setMaterial
    };
};