import React from 'react';
import { useBeamAnalysis } from './hooks/useBeamAnalysis';
import { BeamEditor } from './editor/BeamEditor';
import { ResultsPanel } from './results/ResultsPanel';

function App() {
    const controller = useBeamAnalysis();

    return (
        <div className="w-screen h-screen bg-slate-950 text-slate-200 flex flex-col overflow-hidden font-sans selection:bg-cyan-500/30">
            {/* Fondo decorativo (Glow) */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/5 rounded-full blur-[120px]" />
            </div>

            {/* SECCIÓN SUPERIOR: EDITOR (Flex Grow) */}
            <div className="relative z-10 flex-1 min-h-0 flex flex-col">
                <BeamEditor 
                    length={controller.length}
                    setLength={controller.setLength}
                    supports={controller.supports}
                    addSupport={controller.addSupport}
                    removeSupport={controller.removeSupport}
                    loads={controller.loads}
                    addLoad={controller.addLoad}
                    removeLoad={controller.removeLoad}
                    solve={controller.solve}
                    results={controller.results}
                />
            </div>

            {/* SECCIÓN INFERIOR: RESULTADOS (Altura fija o colapsable) */}
            <div className="relative z-20 h-[35%] min-h-[250px] border-t border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                <ResultsPanel 
                    results={controller.results} 
                    error={controller.error} 
                />
            </div>
        </div>
    );
}

export default App;