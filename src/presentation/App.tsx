import React, { useState } from 'react';
import { useBeamAnalysis } from './hooks/useBeamAnalysis';
import { UnifiedWorkspace } from './workspace/UnifiedWorkspace';

function App() {
    const controller = useBeamAnalysis();

    return (
        <div className="w-screen h-screen bg-slate-950 flex flex-col overflow-hidden font-sans">
            <UnifiedWorkspace 
                length={controller.length}
                setLength={controller.setLength}
                supports={controller.supports}
                addSupport={controller.addSupport}
                removeSupport={controller.removeSupport}
                loads={controller.loads}
                addLoad={controller.addLoad}
                removeLoad={controller.removeLoad}
                updateLoadCategory={controller.updateLoadCategory}
                solve={controller.solve}
                results={controller.results}
                error={controller.error}
                nodes={controller.nodes}
                processedLoads={controller.processedLoads}
                material={controller.material}
                setMaterial={controller.setMaterial}
            />
        </div>
    );
}

export default App;
