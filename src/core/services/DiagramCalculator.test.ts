import { describe, it, expect } from 'vitest';
import { BeamAnalysisService } from './BeamAnalysisService';
import { DiagramCalculator } from './DiagramCalculator';
import { Node } from '../entities/Node';
import { PointForceLoad } from '../entities/Load';

describe('DiagramCalculator - Simply Supported Beam with Central Load', () => {
    const length = 7; // meters
    const E = 200e9; // Pa (Steel: 200 GPa)
    const I = 0.0001; // m⁴
    const loadMagnitude = 10; // kN (Target unit for diagrams)
    const loadPosition = 3.5; // m (center)

    // Helper para reconstruir nodos basados en desplazamiento (Física)
    const reconstructNodesRobustly = (results: any): Node[] => {
        const allIds = Object.keys(results.displacements);
        
        // 1. Encontrar nodo central (Mayor desplazamiento absoluto)
        const centerNodeId = allIds.reduce((maxId, currId) => {
            const dispMax = Math.abs(results.displacements[maxId]?.y || 0);
            const dispCurr = Math.abs(results.displacements[currId]?.y || 0);
            return dispCurr > dispMax ? currId : maxId;
        });

        // 2. Identificar apoyos (los otros dos)
        const supportIds = allIds.filter(id => id !== centerNodeId);

        const nodes: Node[] = [
            new Node(supportIds[0], 0, 'Pin'),
            new Node(centerNodeId, loadPosition, 'Free'),
            new Node(supportIds[1], length, 'Roller')
        ];

        return nodes.sort((a, b) => a.x - b.x);
    };

    it('Should calculate correct reactions for simply supported beam', () => {
        // Para análisis estructural usamos unidades SI consistentes (Newtons)
        const inputForAnalysis = {
            length,
            E,
            I,
            supports: [
                { x: 0, type: 'Pin' as const },
                { x: length, type: 'Roller' as const }
            ],
            loads: [
                {
                    id: 'load1',
                    type: 'PointForce' as const,
                    // CORRECCIÓN: Convertir kN a N para el solver físico
                    magnitude: -loadMagnitude * 1000, 
                    x: loadPosition,
                    category: 'Dead' as const
                }
            ]
        };

        const results = BeamAnalysisService.analyze(inputForAnalysis);

        const reactionEntries = Object.entries(results.reactions);
        const totalVerticalReaction = reactionEntries.reduce((sum, [, r]) => sum + r.fy, 0);
        const appliedLoadN = -loadMagnitude * 1000; 
        
        // Verificar equilibrio en Newtons
        expect(Math.abs(totalVerticalReaction + appliedLoadN)).toBeLessThan(1.0); // Tolerancia 1N
    });

    it('Should calculate correct maximum deflection at center', () => {
        // 1. Análisis en Newtons (SI Units) para obtener desplazamientos reales
        const inputForAnalysis = {
            length, E, I,
            supports: [
                { x: 0, type: 'Pin' as const },
                { x: length, type: 'Roller' as const }
            ],
            loads: [
                {
                    id: 'load1',
                    type: 'PointForce' as const,
                    magnitude: -loadMagnitude * 1000, // Newtons (-10000)
                    x: loadPosition,
                    category: 'Dead' as const
                }
            ]
        };

        const results = BeamAnalysisService.analyze(inputForAnalysis);
        const nodes = reconstructNodesRobustly(results);

        // 2. Configuración para el Diagrama en kN (Visualización)
        // DiagramCalculator solo usa las cargas para calcular V y M.
        // La deformación la toma DIRECTAMENTE de 'results.displacements' (que ya está en metros).
        const loadsForDiagram = [
            new PointForceLoad('load1', -loadMagnitude, loadPosition, 'Dead') // kN (-10)
        ];

        const diagramData = DiagramCalculator.calculateDiagrams(
            length,
            nodes,
            loadsForDiagram,
            results.reactions,     // Reacciones en N (ojo, esto afectará el diagrama V/M si no se escala, ver test siguiente)
            results.displacements, // Desplazamientos en m
            200, 
            'dead'
        );

        // Verificación de Deformación
        const centerDeflection = diagramData.deformation.find(d => 
            Math.abs(d.x - loadPosition) < 0.05
        );

        expect(centerDeflection).toBeDefined();
        
        // Solución Analítica (usando N para ser consistente con E en Pa)
        // P = 10000 N
        const P_newtons = loadMagnitude * 1000;
        const analyticalDeflection = (P_newtons * Math.pow(length, 3)) / (48 * E * I);
        
        // Comparación
        const calculatedValue = centerDeflection!.value;
        const errorRatio = Math.abs(Math.abs(calculatedValue) - Math.abs(analyticalDeflection)) / Math.abs(analyticalDeflection);
        
        console.log(`Deflection Check: Calc=${calculatedValue.toExponential(4)} vs Theory=${analyticalDeflection.toExponential(4)}`);
        
        expect(errorRatio).toBeLessThan(0.1);
    });

    it('Should calculate correct shear force diagram', () => {
        // NOTA IMPORTANTE:
        // Si el BeamAnalysisService devuelve reacciones en Newtons (porque le pasamos N),
        // y queremos el diagrama en kN, tenemos que escalar las reacciones antes de pasarlas
        // al DiagramCalculator, O pasarle cargas en N y esperar diagrama en N.
        // Aquí asumiré que queremos el diagrama en kN.
        
        const inputForAnalysis = {
            length, E, I,
            supports: [ { x: 0, type: 'Pin' as const }, { x: length, type: 'Roller' as const } ],
            loads: [
                {
                    id: 'load1',
                    type: 'PointForce' as const,
                    magnitude: -loadMagnitude * 1000, // Input en N
                    x: loadPosition,
                    category: 'Dead' as const
                }
            ]
        };

        const results = BeamAnalysisService.analyze(inputForAnalysis);
        const nodes = reconstructNodesRobustly(results);

        // Convertir Reacciones de N a kN para el diagrama
        const reactionsInKN: Record<string, {fy: number, m: number}> = {};
        Object.entries(results.reactions).forEach(([id, r]) => {
            reactionsInKN[id] = { fy: r.fy / 1000, m: r.m / 1000 };
        });

        // Cargas en kN
        const loadsForDiagram = [
            new PointForceLoad('load1', -loadMagnitude, loadPosition, 'Dead')
        ];

        const diagramData = DiagramCalculator.calculateDiagrams(
            length,
            nodes,
            loadsForDiagram,
            reactionsInKN, // Pasamos reacciones en kN
            results.displacements,
            200,
            'dead'
        );

        const leftOfCenter = diagramData.shearForce.find(s => s.x < loadPosition && s.x > loadPosition - 0.5);
        const rightOfCenter = diagramData.shearForce.find(s => s.x > loadPosition && s.x < loadPosition + 0.5);

        // V = 5 kN
        expect(Math.abs(leftOfCenter!.value - 5)).toBeLessThan(0.1);
        // V = -5 kN
        expect(Math.abs(rightOfCenter!.value + 5)).toBeLessThan(0.1);
    });
});