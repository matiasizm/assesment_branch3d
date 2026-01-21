// src/core/services/DiagramCalculator.ts

import type { Node } from '../entities/Node';
import type { Load, LoadCategory } from '../entities/Load';

export interface DiagramPoint {
    x: number;
    value: number;
}

export interface DiagramData {
    shearForce: DiagramPoint[];
    bendingMoment: DiagramPoint[];
    deformation: DiagramPoint[];
}

export type DiagramViewMode = 'dead' | 'live';

export class DiagramCalculator {

    static calculateDiagrams(
        length: number,
        nodes: Node[],
        loads: Load[],
        reactions: Record<string, { fy: number, m: number }>,
        displacements: Record<string, { y: number, rotation: number }>,
        resolution: number = 200,
        viewMode: DiagramViewMode = 'dead'
    ): DiagramData {
        
        const step = length / resolution;
        const eps = 1e-3; // Tolerancia holgada para capturar reacciones

        // 1. Preparación de datos
        const sortedNodes = [...nodes].sort((a, b) => a.x - b.x);

        const pointForces: Array<{ x: number, mag: number, type: string }> = [];
        const pointMoments: Array<{ x: number, mag: number, type: string }> = [];
        const distLoads: Array<{ startX: number, endX: number, mag: number }> = [];

        // ---------------------------------------------------------------------------
        // A. PROCESAR REACCIONES (MODO ROBUSTO)
        // ---------------------------------------------------------------------------
        // Creamos un mapa espacial para encontrar reacciones aunque el ID falle
        const reactionByPos = new Map<number, { fy: number, m: number }>();
        
        // Llenar mapa espacial usando las coordenadas de los nodos
        sortedNodes.forEach(node => {
            const r = reactions[node.id];
            if (r) {
                // Clave entera aproximada para evitar errores de float (x * 1000)
                const key = Math.round(node.x * 1000);
                reactionByPos.set(key, r);
            }
        });

        // Iterar nodos para agregar fuerzas
        sortedNodes.forEach(node => {
            // Intentar por ID, si no, buscar por posición
            let r = reactions[node.id];
            if (!r) {
                const key = Math.round(node.x * 1000);
                r = reactionByPos.get(key)!;
            }

            if (r) {
                if (Math.abs(r.fy) > 1e-5) {
                    pointForces.push({ x: node.x, mag: r.fy, type: 'reaction' });
                }
                // Momento de reacción se invierte para diagrama interno
                if (Math.abs(r.m) > 1e-5) {
                    pointMoments.push({ x: node.x, mag: -r.m, type: 'reaction' }); 
                }
            }
        });

        // ---------------------------------------------------------------------------
        // B. FILTRAR CARGAS
        // ---------------------------------------------------------------------------
        const filteredLoads = loads.filter(load => {
            const cat = load.category || 'Dead'; 
            if (viewMode === 'dead') return cat === 'Dead';
            if (viewMode === 'live') return cat === 'Live';
            return false;
        });

        // ---------------------------------------------------------------------------
        // C. PROCESAR CARGAS
        // ---------------------------------------------------------------------------
        filteredLoads.forEach(load => {
            const l = load as any;
            const type = l.type || ''; 

            if (type === 'PointForce') {
                // Usamos el signo directo de la magnitud
                pointForces.push({ x: l.x, mag: l.magnitude, type: 'load' });
            } 
            else if (type === 'PointMoment') {
                pointMoments.push({ x: l.x, mag: l.magnitude, type: 'load' });
            }
            else if (type === 'DistributedForce' || type === 'distributed' || type === 'DistributedLoad') {
                const mag = l.magnitude;
                if (Math.abs(mag) > 1e-5) {
                    distLoads.push({
                        startX: Number(l.startX),
                        endX: Number(l.endX),
                        mag: mag
                    });
                }
            }
        });

        const shearForce: DiagramPoint[] = [];
        const bendingMoment: DiagramPoint[] = [];
        const deformation: DiagramPoint[] = [];

        // ---------------------------------------------------------------------------
        // 2. CÁLCULO FÍSICO (MÉTODO DE SECCIONES)
        // ---------------------------------------------------------------------------
        
        for (let i = 0; i <= resolution; i++) {
            const x = i * step;
            
            let V = 0;
            let M = 0;

            // A. Fuerzas Puntuales
            for (const f of pointForces) {
                // CONDICIÓN MÁGICA:
                // 1. Incluimos fuerzas a la izquierda (f.x <= x)
                // 2. EXCLUIMOS fuerzas que estén EXACTAMENTE en el borde final de la viga (f.x >= length)
                //    Esto evita que el diagrama baje a 0 por sumar la reacción derecha.
                //    Queremos ver la fuerza interna llegando al apoyo, no el equilibrio después de él.
                
                const isAtEnd = f.x >= (length - eps);

                if (f.x <= x + eps && !isAtEnd) {
                    V += f.mag;
                    M += f.mag * (x - f.x);
                }
            }

            // B. Momentos Puntuales
            for (const pm of pointMoments) {
                const isAtEnd = pm.x >= (length - eps);
                
                if (pm.x <= x + eps && !isAtEnd) {
                    M += pm.mag; 
                }
            }

            // C. Cargas Distribuidas
            for (const d of distLoads) {
                if (x > d.startX - eps) {
                    const effectiveEnd = Math.min(x, d.endX);
                    const width = effectiveEnd - d.startX;

                    if (width > 0) {
                        const totalLoad = d.mag * width;
                        V += totalLoad;

                        const centroidX = d.startX + (width / 2);
                        const leverArm = x - centroidX;

                        M += totalLoad * leverArm;
                    }
                }
            }
            
            // Limpieza estética
            if (Math.abs(V) < 1e-4) V = 0;
            if (Math.abs(M) < 1e-4) M = 0;

            shearForce.push({ x, value: V });
            bendingMoment.push({ x, value: M });
        }

        // 3. Deformación (Hermite) - Sin cambios
        for (let i = 0; i <= resolution; i++) {
            const x = i * step;
            let defY = 0;

            for (let j = 0; j < sortedNodes.length - 1; j++) {
                const node1 = sortedNodes[j];
                const node2 = sortedNodes[j + 1];

                if (x >= node1.x - eps && x <= node2.x + eps) {
                    const L = node2.x - node1.x;
                    if (L < 1e-6) break;

                    const xi = (x - node1.x) / L;
                    const v1 = displacements[node1.id]?.y || 0;
                    const th1 = displacements[node1.id]?.rotation || 0;
                    const v2 = displacements[node2.id]?.y || 0;
                    const th2 = displacements[node2.id]?.rotation || 0;
                    const xi2 = xi * xi;
                    const xi3 = xi2 * xi;
                    const N1 = 1 - 3*xi2 + 2*xi3;
                    const N2 = L * (xi - 2*xi2 + xi3);
                    const N3 = 3*xi2 - 2*xi3;
                    const N4 = L * (xi3 - xi2);

                    defY = N1*v1 + N2*th1 + N3*v2 + N4*th2;
                    break; 
                }
            }
            deformation.push({ x, value: defY });
        }

        return { shearForce, bendingMoment, deformation };
    }
}