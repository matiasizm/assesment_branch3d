// src/core/logic/StiffnessMatrix.ts

export class StiffnessMatrix {
    /**
     * Genera la Matriz de Rigidez Local (k) para un elemento de viga 2D.
     * Teoría: Bernoulli-Euler (ignora deformación por corte).
     * * @param E Módulo de Elasticidad (Young's Modulus)
     * @param I Momento de Inercia
     * @param L Longitud del elemento
     * @returns Array 4x4 de números nativos (number[][])
     */
    static beam2D(E: number, I: number, L: number): number[][] {
        // Validaciones matemáticas básicas
        if (L <= 0) throw new Error("Length must be positive to compute stiffness.");
        if (E <= 0 || I <= 0) throw new Error("Material properties (E, I) must be positive.");

        const L2 = L * L;
        const L3 = L * L * L;

        // Factores de rigidez pre-calculados
        // Se extraen las constantes comunes para optimizar CPU y legibilidad
        const k_trans = (12 * E * I) / L3; // Rigidez traslacional (Fuerza/Desplazamiento)
        const k_rot   = (4 * E * I) / L;   // Rigidez rotacional principal (Momento/Giro)
        const k_cross = (6 * E * I) / L2;  // Rigidez acoplada (Fuerza/Giro)
        const k_rot_far = (2 * E * I) / L; // Rigidez rotacional cruzada (Momento i / Giro j)

        // Matriz simétrica 4x4
        // DOFs: [ v1, theta1, v2, theta2 ]
        // v = Vertical (Y), theta = Rotación (Z)
        return [
            // Nodo 1 (Izquierda)
            [ k_trans,   k_cross,   -k_trans,   k_cross  ], // Fuerza Y1
            [ k_cross,   k_rot,     -k_cross,   k_rot_far], // Momento M1
            
            // Nodo 2 (Derecha)
            [-k_trans,  -k_cross,    k_trans,  -k_cross  ], // Fuerza Y2
            [ k_cross,   k_rot_far, -k_cross,   k_rot    ]  // Momento M2
        ];
    }
}