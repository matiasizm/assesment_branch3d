import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBeamAnalysis } from './useBeamAnalysis';

describe('useBeamAnalysis Integration Hook', () => {
    
    it('Should initialize with default values', () => {
        const { result } = renderHook(() => useBeamAnalysis());
        
        expect(result.current.length).toBe(10);
        expect(result.current.supports).toHaveLength(0);
        expect(result.current.results).toBeNull();
    });

    it('Should manage supports correctly', () => {
        const { result } = renderHook(() => useBeamAnalysis());

        act(() => {
            result.current.addSupport(0, 'Pin');
        });

        expect(result.current.supports).toHaveLength(1);
        expect(result.current.supports[0].type).toBe('Pin');

        const id = result.current.supports[0].id;
        act(() => {
            result.current.removeSupport(id);
        });

        expect(result.current.supports).toHaveLength(0);
    });

    it('Should solve a standard beam problem end-to-end', () => {
        const { result } = renderHook(() => useBeamAnalysis());

        act(() => {
            result.current.addSupport(0, 'Pin');
            result.current.addSupport(10, 'Roller');
            result.current.addLoad('PointForce', -100, 5);
        });

        act(() => {
            result.current.solve();
        });

        expect(result.current.error).toBeNull();
        expect(result.current.results).not.toBeNull();

        // Verify mesh generation creates nodes at support and load locations
        const disp = result.current.results?.displacements;
        expect(Object.keys(disp || {}).length).toBeGreaterThanOrEqual(3);
    });

    it('Should handle unstable structures gracefully', () => {
        const { result } = renderHook(() => useBeamAnalysis());

        act(() => {
            result.current.addLoad('PointForce', -100, 5);
            result.current.solve();
        });

        expect(result.current.results).toBeNull();
        expect(result.current.error).toBeTruthy();
    });

    it('Should manage load categories correctly', () => {
        const { result } = renderHook(() => useBeamAnalysis());

        act(() => {
            result.current.addLoad('PointForce', -100, 5);
        });

        expect(result.current.loads).toHaveLength(1);
        expect(result.current.loads[0].category).toBe('Live');

        act(() => {
            result.current.addLoad('PointForce', -50, 3, undefined, undefined, 'down', 'Dead');
        });

        expect(result.current.loads).toHaveLength(2);
        expect(result.current.loads[1].category).toBe('Dead');

        const loadId = result.current.loads[0].id;
        act(() => {
            result.current.updateLoadCategory(loadId, 'Dead');
        });

        expect(result.current.loads[0].category).toBe('Dead');
    });

    it('Should handle loads with different categories', () => {
        const { result } = renderHook(() => useBeamAnalysis());

        act(() => {
            result.current.addSupport(0, 'Pin');
            result.current.addSupport(10, 'Roller');
            result.current.addLoad('PointForce', -100, 3, undefined, undefined, 'down', 'Dead');
            result.current.addLoad('PointForce', -50, 7, undefined, undefined, 'down', 'Live');
        });

        expect(result.current.loads).toHaveLength(2);
        expect(result.current.loads[0].category).toBe('Dead');
        expect(result.current.loads[1].category).toBe('Live');

        act(() => {
            result.current.solve();
        });

        expect(result.current.error).toBeNull();
        expect(result.current.results).not.toBeNull();
    });
});