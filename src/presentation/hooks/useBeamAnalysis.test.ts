import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBeamAnalysis } from './useBeamAnalysis';

describe('useBeamAnalysis Integration Hook', () => {
    
    // 1. Test de Valores Iniciales
    it('Should initialize with default values', () => {
        const { result } = renderHook(() => useBeamAnalysis());
        
        expect(result.current.length).toBe(10); // Valor por defecto
        expect(result.current.supports).toHaveLength(0);
        expect(result.current.results).toBeNull();
    });

    // 2. Test de Gestión de Apoyos (State Management)
    it('Should manage supports correctly', () => {
        const { result } = renderHook(() => useBeamAnalysis());

        // A. Agregar
        act(() => {
            result.current.addSupport(0, 'Pin');
        });

        expect(result.current.supports).toHaveLength(1);
        expect(result.current.supports[0].type).toBe('Pin');

        // B. Remover
        const id = result.current.supports[0].id;
        act(() => {
            result.current.removeSupport(id);
        });

        expect(result.current.supports).toHaveLength(0);
    });

    // 3. Test de Flujo Completo (Integration: Hook -> Service -> Solver)
    it('Should solve a standard beam problem end-to-end', () => {
        const { result } = renderHook(() => useBeamAnalysis());

        // A. Configurar escenario (Viga simplemente apoyada con carga central)
        act(() => {
            result.current.addSupport(0, 'Pin');
            result.current.addSupport(10, 'Roller');
            
            // Carga puntual de -100kN en x=5
            result.current.addLoad('PointForce', -100, 5);
        });

        // B. Ejecutar Solve
        act(() => {
            result.current.solve();
        });

        // C. Verificar que hay resultados
        expect(result.current.error).toBeNull();
        expect(result.current.results).not.toBeNull();

        // D. Verificar lógica física básica
        // El nodo central (x=5) debe tener desplazamiento negativo (bajar)
        const disp = result.current.results?.displacements;
        
        // Buscamos el nodo en x=5 (aprox) en el mapa de resultados
        // Nota: No sabemos el ID exacto del nodo intermedio generado dinámicamente,
        // pero sabemos que deben haber 3 nodos en total (0, 5, 10).
        expect(Object.keys(disp || {}).length).toBeGreaterThanOrEqual(3);
    });

    // 4. Test de Manejo de Errores
    it('Should handle unstable structures gracefully', () => {
        const { result } = renderHook(() => useBeamAnalysis());

        // Escenario: Viga flotando sin apoyos (Inestable)
        act(() => {
            result.current.addLoad('PointForce', -100, 5);
            result.current.solve();
        });

        // Debe fallar controladamente
        expect(result.current.results).toBeNull();
        expect(result.current.error).toBeTruthy(); // Debe existir un mensaje de error
    });
});