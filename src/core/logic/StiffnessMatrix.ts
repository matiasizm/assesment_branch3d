export class StiffnessMatrix {
    /**
     * Generates local stiffness matrix for 2D beam element using Bernoulli-Euler theory
     * (shear deformation ignored)
     * @param E Young's Modulus
     * @param I Moment of Inertia
     * @param L Element length
     * @returns 4x4 stiffness matrix [v1, θ1, v2, θ2] DOFs
     */
    static beam2D(E: number, I: number, L: number): number[][] {
        if (L <= 0) throw new Error("Length must be positive to compute stiffness.");
        if (E <= 0 || I <= 0) throw new Error("Material properties (E, I) must be positive.");

        const L2 = L * L;
        const L3 = L * L * L;

        const k_trans = (12 * E * I) / L3;
        const k_rot   = (4 * E * I) / L;
        const k_cross = (6 * E * I) / L2;
        const k_rot_far = (2 * E * I) / L;

        return [
            [ k_trans,   k_cross,   -k_trans,   k_cross  ],
            [ k_cross,   k_rot,     -k_cross,   k_rot_far],
            [-k_trans,  -k_cross,    k_trans,  -k_cross  ],
            [ k_cross,   k_rot_far, -k_cross,   k_rot    ]
        ];
    }
}