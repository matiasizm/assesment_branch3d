// src/core/services/BeamAnalysisService.ts

// FIX 1: Separamos la importación de la Clase (valor) y el Tipo (definición)
import { Node } from '../entities/Node';
import type { SupportType } from '../entities/Node';

import { Element } from '../entities/Element';
import { 
    PointForceLoad, 
    PointMomentLoad, 
    DistributedForceLoad, 
    type Load, 
    type LoadType, 
    type LoadCategory 
} from '../entities/Load';
import { FemSolver, type AnalysisResults } from '../logic/FemSolver';

// --- DTOs ---
export interface BeamInput {
    length: number;
    E: number; 
    I: number; 
    supports: { x: number; type: SupportType }[];
    loads: BeamLoadInput[];
}

export interface BeamLoadInput {
    id: string;
    type: LoadType;
    magnitude: number;
    x?: number;        
    startX?: number;   
    endX?: number;     
    category?: LoadCategory;
}

export class BeamAnalysisService {

    static analyze(input: BeamInput): AnalysisResults {
        const { nodes, elements } = BeamAnalysisService.generateMesh(input);
        const domainLoads = BeamAnalysisService.processLoads(input.loads, elements);
        return FemSolver.solve(nodes, elements, domainLoads);
    }

    private static generateMesh(input: BeamInput): { nodes: Node[], elements: Element[] } {
        const points = new Set<number>();
        points.add(0);
        points.add(input.length);
        input.supports.forEach(s => points.add(s.x));
        input.loads.forEach(l => {
            if (typeof l.x === 'number') points.add(l.x);
            if (typeof l.startX === 'number') points.add(l.startX);
            if (typeof l.endX === 'number') points.add(l.endX);
        });

        const sortedX = Array.from(points)
            .sort((a, b) => a - b)
            .filter(x => x >= 0 && x <= input.length);

        const nodes: Node[] = sortedX.map((x, i) => {
            const supportConf = input.supports.find(s => Math.abs(s.x - x) < 1e-4);
            const type = supportConf ? supportConf.type : 'Free';
            return new Node(`n${i}`, x, type);
        });

        const elements: Element[] = [];
        for (let i = 0; i < nodes.length - 1; i++) {
            const startNode = nodes[i];
            const endNode = nodes[i+1];
            if (Math.abs(endNode.x - startNode.x) > 1e-6) {
                elements.push(new Element(`e${i}`, startNode, endNode, input.E, input.I));
            }
        }

        return { nodes, elements };
    }

    private static processLoads(inputs: BeamLoadInput[], elements: Element[]): Load[] {
        const domainLoads: Load[] = [];

        inputs.forEach(raw => {
            const category = raw.category || 'Dead';

            if (raw.type === 'PointForce' && typeof raw.x === 'number') {
                domainLoads.push(new PointForceLoad(raw.id, raw.magnitude, raw.x, category));
            } 
            else if (raw.type === 'PointMoment' && typeof raw.x === 'number') {
                domainLoads.push(new PointMomentLoad(raw.id, raw.magnitude, raw.x, category));
            } 
            // FIX 2: Corregido el string. Debe ser 'DistributedForce', NO 'DistributedForceLoad'
            else if (raw.type === 'DistributedForce' && typeof raw.startX === 'number' && typeof raw.endX === 'number') {
                
                const rawStart = raw.startX;
                const rawEnd = raw.endX;

                elements.forEach((el, index) => {
                    const elStart = el.startNode.x;
                    const elEnd = el.endNode.x;
                    const tolerance = 1e-4;

                    const overlaps = (elStart >= rawStart - tolerance) && (elEnd <= rawEnd + tolerance);

                    if (overlaps) {
                        domainLoads.push(new DistributedForceLoad(
                            `${raw.id}_el${index}`, 
                            raw.magnitude, 
                            elStart, 
                            elEnd, 
                            category
                        ));
                    }
                });
            }
        });

        return domainLoads;
    }
}