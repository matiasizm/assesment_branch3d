import { 
    matrix, 
    add, 
    multiply, 
    lusolve, 
    subset, 
    index, 
    zeros, 
    det,
    Matrix
} from 'mathjs';
import { Node } from '../entities/Node';
import { Element } from '../entities/Element';
import type { Load } from '../entities/Load';

export interface AnalysisResults {
    displacements: Record<string, { y: number, rotation: number }>;
    reactions: Record<string, { fy: number, m: number }>;
}

export class FemSolver {

    public static solve(
        nodes: Node[], 
        elements: Element[], 
        loads: Load[]
    ): AnalysisResults {
        console.log('🧮 FemSolver.solve() - Starting FEM analysis...');
        console.log('   Total DOFs:', nodes.length * 2, `(${nodes.length} nodes × 2 DOFs/node)`);
        console.log('   Free DOFs:', nodes.filter(n => !n.isRestrainedY).length * 2 + nodes.filter(n => !n.isRestrainedRotation).length, 'DOFs');
        console.log('   Fixed DOFs:', nodes.filter(n => n.isRestrainedY).length + nodes.filter(n => n.isRestrainedRotation).length, 'DOFs');
        
        const nodeIndexMap = new Map<string, number>();
        nodes.forEach((node, i) => nodeIndexMap.set(node.id, i));

        const totalDofs = nodes.length * 2;
        
        let K = zeros(totalDofs, totalDofs, 'sparse') as Matrix; 
        let F = zeros(totalDofs, 1) as Matrix; 

        elements.forEach(el => {
            const idxStart = nodeIndexMap.get(el.startNode.id)!;
            const idxEnd = nodeIndexMap.get(el.endNode.id)!;

            const dofIndices = [
                idxStart * 2,     
                idxStart * 2 + 1, 
                idxEnd * 2,       
                idxEnd * 2 + 1    
            ];

            const kLocal = el.stiffnessMatrix; 

            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    const row = dofIndices[i];
                    const col = dofIndices[j];
                    
                    const currentVal = K.get([row, col]);
                    K.set([row, col], currentVal + kLocal[i][j]);
                }
            }
        });

        loads.forEach(load => {
            if (load.type === 'PointForce' || load.type === 'PointMoment') {
                const pointLoad = load as { x: number, magnitude: number }; 
                
                const node = nodes.find(n => Math.abs(n.x - pointLoad.x) < 1e-3);
                
                if (node) {
                    const idx = nodeIndexMap.get(node.id)!;
                    const dofIndex = load.type === 'PointForce' 
                        ? idx * 2
                        : idx * 2 + 1;
                    
                    const currentF = F.get([dofIndex, 0]);
                    F.set([dofIndex, 0], currentF + load.magnitude); 
                }
            } else if (load.type === 'DistributedForce') {
                // Convert distributed loads to equivalent nodal loads using Fixed-End Actions
                // Reference: Structural Analysis textbooks (Hibbeler, Kassimali)
                const distLoad = load as { startX: number, endX: number, magnitude: number };
                const w = distLoad.magnitude;
                const L = distLoad.endX - distLoad.startX;
                
                if (L <= 1e-6) return;
                
                const startNode = nodes.find(n => Math.abs(n.x - distLoad.startX) < 1e-3);
                const endNode = nodes.find(n => Math.abs(n.x - distLoad.endX) < 1e-3);
                
                if (!startNode || !endNode) {
                    console.warn(`⚠️  Distributed load nodes not found: startX=${distLoad.startX}, endX=${distLoad.endX}`);
                    return;
                }
                
                // Fixed-End Actions for uniformly distributed load: V = wL/2, M = ±wL²/12
                const V_start = (w * L) / 2;
                const V_end = (w * L) / 2;
                const M_start = (w * L * L) / 12;
                const M_end = -(w * L * L) / 12;
                
                const idxStart = nodeIndexMap.get(startNode.id)!;
                const currentFyStart = F.get([idxStart * 2, 0]);
                const currentMzStart = F.get([idxStart * 2 + 1, 0]);
                F.set([idxStart * 2, 0], currentFyStart + V_start);
                F.set([idxStart * 2 + 1, 0], currentMzStart + M_start);
                
                const idxEnd = nodeIndexMap.get(endNode.id)!;
                const currentFyEnd = F.get([idxEnd * 2, 0]);
                const currentMzEnd = F.get([idxEnd * 2 + 1, 0]);
                F.set([idxEnd * 2, 0], currentFyEnd + V_end);
                F.set([idxEnd * 2 + 1, 0], currentMzEnd + M_end);
                
                console.log(`   📐 Distributed load converted: w=${w.toFixed(2)} kN/m, L=${L.toFixed(3)} m`);
                console.log(`      → V_start=${V_start.toFixed(2)} kN, M_start=${M_start.toFixed(2)} kNm`);
                console.log(`      → V_end=${V_end.toFixed(2)} kN, M_end=${M_end.toFixed(2)} kNm`);
            }
        });

        const freeDofs: number[] = [];
        const fixedDofs: number[] = [];

        nodes.forEach((node, i) => {
            if (node.isRestrainedY) fixedDofs.push(i * 2);
            else freeDofs.push(i * 2);

            if (node.isRestrainedRotation) fixedDofs.push(i * 2 + 1);
            else freeDofs.push(i * 2 + 1);
        });

        const globalDisplacements = zeros(totalDofs, 1) as Matrix;
        
        if (freeDofs.length === 0) {
            // All DOFs fixed: statically indeterminate but stable structure
            // Displacements are zero, reactions calculated from R = K*0 - F = -F
            console.log('   ℹ️  All DOFs are fixed - statically indeterminate but stable structure');
            console.log('   → All displacements are zero');
            console.log('   → Reactions calculated from equilibrium: R = -F');
        } else {
            const K_ff = subset(K, index(freeDofs, freeDofs)) as Matrix;
            const F_f = subset(F, index(freeDofs, [0])) as Matrix;

            let d_f: Matrix;
            
            try {
                // Check for mechanism: singular stiffness matrix indicates instability
                const determinant = det(K_ff);
                
                if (Math.abs(determinant) < 1e-10) {
                    throw new Error("Structure is unstable (Mechanism). Stiffness matrix is singular.");
                }

                d_f = lusolve(K_ff, F_f) as Matrix; 
                
                // Validate numerical stability: check for infinite or NaN results
                d_f.forEach(val => {
                    if (!isFinite(val) || isNaN(val)) {
                         throw new Error("Structure is unstable. Displacements are infinite.");
                    }
                });

                freeDofs.forEach((dofIdx, i) => {
                    const val = d_f.get([i, 0]); 
                    globalDisplacements.set([dofIdx, 0], val);
                });

            } catch (error) {
                console.error("Singular Matrix or Solver Error", error);
                throw new Error("Structure is unstable or creates a mechanism.");
            }
        }

        // Calculate reactions: R = K*d - F
        const Kd = multiply(K, globalDisplacements) as Matrix;
        const R_matrix = add(Kd, multiply(F, -1)) as Matrix; 

        const results: AnalysisResults = {
            displacements: {},
            reactions: {}
        };

        nodes.forEach((node, i) => {
            const dy = globalDisplacements.get([i * 2, 0]);
            const rot = globalDisplacements.get([i * 2 + 1, 0]);
            
            const ry = R_matrix.get([i * 2, 0]);
            const rm = R_matrix.get([i * 2 + 1, 0]);

            results.displacements[node.id] = { y: dy, rotation: rot };
            
            if (node.isRestrainedY || node.isRestrainedRotation) {
                results.reactions[node.id] = { 
                    fy: node.isRestrainedY ? ry : 0, 
                    m: node.isRestrainedRotation ? rm : 0 
                };
            }
        });

        console.log('📊 FemSolver Results:');
        const maxDeflection = Math.max(...Object.values(results.displacements).map(d => Math.abs(d.y)));
        console.log('   Max Deflection:', (maxDeflection * 1000).toFixed(3), 'mm');
        console.log('   Total Reactions:', Object.keys(results.reactions).length, 'supports');
        Object.entries(results.reactions).forEach(([id, r]) => {
            if (Math.abs(r.fy) > 1e-6 || Math.abs(r.m) > 1e-6) {
                console.log(`   ${id}: Fy = ${r.fy.toFixed(2)} kN, M = ${r.m.toFixed(2)} kNm`);
            }
        });

        return results;
    }
}