import { 
    matrix, 
    add, 
    multiply, 
    lusolve, 
    subset, 
    index, 
    zeros, 
    det,
    Matrix // <--- IMPORTANTE: Importamos la interfaz de tipo
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
        
        const nodeIndexMap = new Map<string, number>();
        nodes.forEach((node, i) => nodeIndexMap.set(node.id, i));

        const totalDofs = nodes.length * 2;
        
        // FIX 1: Forzamos el tipo 'as Matrix' para que TS sepa que tiene metodos .get() y .set()
        let K = zeros(totalDofs, totalDofs, 'sparse') as Matrix; 
        let F = zeros(totalDofs, 1) as Matrix; 

        // -----------------------------------------------------------------
        // 2. ENSAMBLE MATRIZ K
        // -----------------------------------------------------------------
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
                    
                    // FIX 2: Como ya definimos K 'as Matrix', ahora .get() funciona sin error
                    const currentVal = K.get([row, col]);
                    K.set([row, col], currentVal + kLocal[i][j]);
                }
            }
        });

        // -----------------------------------------------------------------
        // 3. ENSAMBLE VECTOR F
        // -----------------------------------------------------------------
        loads.forEach(load => {
            if (load.type === 'PointForce' || load.type === 'PointMoment') {
                // TRUCO SENIOR:
                // TypeScript duda si 'load' tiene X. 
                // Creamos una referencia temporal forzando el tipo que TIENE X.
                // Esto elimina el error inmediatamente.
                const pointLoad = load as { x: number, magnitude: number }; 
                
                // Ahora usamos 'pointLoad.x' en lugar de 'load.x'
                const node = nodes.find(n => Math.abs(n.x - pointLoad.x) < 1e-3);
                
                if (node) {
                    const idx = nodeIndexMap.get(node.id)!;
                    const dofIndex = load.type === 'PointForce' 
                        ? idx * 2       
                        : idx * 2 + 1;  
                    
                    const currentF = F.get([dofIndex, 0]);
                    F.set([dofIndex, 0], currentF + load.magnitude); 
                }
            }
        });

        // 4. CONDICIONES DE BORDE (Boundary Conditions)
        const freeDofs: number[] = [];
        const fixedDofs: number[] = [];

        nodes.forEach((node, i) => {
            if (node.isRestrainedY) fixedDofs.push(i * 2);
            else freeDofs.push(i * 2);

            if (node.isRestrainedRotation) fixedDofs.push(i * 2 + 1);
            else freeDofs.push(i * 2 + 1);
        });

        // 🛑 BORRADA LA REGLA: if (fixedDofs.length < 2) ... 
        // Esa regla era ingenua. Ahora dejamos que la matemática hable.

        const K_ff = subset(K, index(freeDofs, freeDofs)) as Matrix;
        const F_f = subset(F, index(freeDofs, [0])) as Matrix;

        // -----------------------------------------------------------------
        // 5. SOLVER Y VALIDACIÓN DE ESTABILIDAD (La forma correcta)
        // -----------------------------------------------------------------
        let d_f: Matrix;
        
        try {
            // A. VALIDACIÓN MATEMÁTICA: Determinante
            // Si el determinante es casi cero, la matriz no se puede invertir.
            // Es un mecanismo.
            const determinant = det(K_ff);
            
            // Usamos un epsilon pequeño para errores de punto flotante
            if (Math.abs(determinant) < 1e-10) {
                throw new Error("Structure is unstable (Mechanism). Stiffness matrix is singular.");
            }

            d_f = lusolve(K_ff, F_f) as Matrix; 
            
            // B. VALIDACIÓN NUMÉRICA: Resultados Infinitos o NaN
            // A veces el determinante pasa "raspando" pero el resultado es basura
            d_f.forEach(val => {
                if (!isFinite(val) || isNaN(val)) {
                     throw new Error("Structure is unstable. Displacements are infinite.");
                }
            });

        } catch (error) {
            console.error("Singular Matrix or Solver Error", error);
            // Re-lanzamos el error limpio para que lo capture el Hook
            throw new Error("Structure is unstable or creates a mechanism.");
        }
        // -----------------------------------------------------------------
        // 6. POST-PROCESO
        // -----------------------------------------------------------------
        const globalDisplacements = zeros(totalDofs, 1) as Matrix;
        
        freeDofs.forEach((dofIdx, i) => {
            const val = d_f.get([i, 0]); 
            globalDisplacements.set([dofIdx, 0], val);
        });

        // Calculo de Reacciones: R = K*d - F
        // FIX 6: Operaciones matriciales seguras
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

        return results;
    }
}