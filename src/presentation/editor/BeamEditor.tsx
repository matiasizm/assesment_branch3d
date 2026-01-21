import React, { useRef, useState } from 'react';
import { MousePointer2, ArrowDown, Play, Ruler, Weight, Eraser, Trash2, Grid3x3, Lock, GripVertical } from 'lucide-react';
import type { SupportType } from '../../core/entities/Node';
import type { LoadType } from '../../core/entities/Load';
import type { AnalysisResults } from '../../core/logic/FemSolver';

interface BeamEditorProps {
    length: number;
    setLength: (l: number) => void;
    supports: { id: string, x: number, type: SupportType }[];
    addSupport: (x: number, type: SupportType) => void;
    removeSupport: (id: string) => void;
    loads: any[];
    addLoad: (type: LoadType, mag: number, x?: number, startX?: number, endX?: number) => void;
    removeLoad: (id: string) => void;
    solve: () => void;
    results: AnalysisResults | null;
}

type Tool = 'select' | 'pin' | 'roller' | 'fixed' | 'load';
type LoadMode = 'point' | 'distributed';

export const BeamEditor: React.FC<BeamEditorProps> = (props) => {
    const [activeTool, setActiveTool] = useState<Tool>('select');
    const [loadMode, setLoadMode] = useState<LoadMode>('point');
    const [loadMag, setLoadMag] = useState(10);
    const [distStartX, setDistStartX] = useState(2);
    const [distEndX, setDistEndX] = useState(8);
    const [showLoadSettings, setShowLoadSettings] = useState(false);
    const [gridSnap, setGridSnap] = useState(0.25);
    const [showGrid, setShowGrid] = useState(true);
    const [showGridSettings, setShowGridSettings] = useState(false);
    const [hoverPosition, setHoverPosition] = useState<{ x: number, snapped: number } | null>(null);
    const [distributedStartPos, setDistributedStartPos] = useState<number | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    // Configuración Visual
    const width = 800; 
    const height = 400;
    const paddingX = 60;
    const beamY = 200;

    const metersToPx = (m: number) => (m / props.length) * (width - paddingX * 2) + paddingX;
    const pxToMeters = (px: number) => {
        const raw = ((px - paddingX) / (width - paddingX * 2)) * props.length;
        const snapped = Math.round(raw / gridSnap) * gridSnap;
        return Math.max(0, Math.min(props.length, snapped));
    };

    const handleCanvasClick = (e: React.MouseEvent) => {
        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const xPx = e.clientX - rect.left;
        const xM = pxToMeters(xPx);

        if (activeTool === 'pin') props.addSupport(xM, 'Pin');
        if (activeTool === 'roller') props.addSupport(xM, 'Roller');
        if (activeTool === 'fixed') props.addSupport(xM, 'Fixed');
        
        if (activeTool === 'load') {
            if (loadMode === 'point') {
                props.addLoad('PointForce', -loadMag, xM);
                setActiveTool('select');
            } else {
                // Distributed force: first click sets start, second click sets end
                if (distributedStartPos === null) {
                    setDistributedStartPos(xM);
                } else {
                    const startX = Math.min(distributedStartPos, xM);
                    const endX = Math.max(distributedStartPos, xM);
                    if (endX > startX) {
                        props.addLoad('DistributedForce', -loadMag, undefined, startX, endX);
                    }
                    setDistributedStartPos(null);
                    setActiveTool('select');
                }
            }
        }
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-center relative p-6">
            
            {/* --- 1. BARRA SUPERIOR (Floating Island) --- */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-6 px-6 py-3 bg-slate-800/60 backdrop-blur-md border border-white/10 rounded-full shadow-2xl z-20">
                
                {/* Length Input */}
                <div className="flex items-center gap-3 border-r border-white/10 pr-6">
                    <Ruler size={18} className="text-slate-400" />
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Length</span>
                        <div className="flex items-baseline gap-1">
                            <input 
                                type="number" 
                                min="0.1"
                                step="0.1"
                                value={props.length} 
                                onChange={e => props.setLength(Number(e.target.value))}
                                className="w-16 bg-transparent text-white font-mono font-bold outline-none border-b border-transparent focus:border-cyan-500 transition-colors text-center"
                            />
                            <span className="text-xs text-slate-500">m</span>
                        </div>
                    </div>
                </div>

                {/* Load Settings */}
                <div className="flex items-center gap-3 border-r border-white/10 pr-6">
                    <Weight size={18} className="text-rose-400" />
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    setLoadMode('point');
                                    setShowLoadSettings(false);
                                    setDistributedStartPos(null);
                                }}
                                className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                                    loadMode === 'point' 
                                        ? 'bg-rose-500/30 text-rose-400 border border-rose-500/50' 
                                        : 'text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                Point
                            </button>
                            <button
                                onClick={() => {
                                    setLoadMode('distributed');
                                    setShowLoadSettings(true);
                                    setDistributedStartPos(null);
                                }}
                                className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                                    loadMode === 'distributed' 
                                        ? 'bg-rose-500/30 text-rose-400 border border-rose-500/50' 
                                        : 'text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                Distributed
                            </button>
                            <button
                                onClick={() => setShowLoadSettings(!showLoadSettings)}
                                className="text-slate-500 hover:text-slate-300 text-xs"
                                title="Load Settings"
                            >
                                ⚙️
                            </button>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <input 
                                type="number" 
                                min="0.1"
                                step="0.1"
                                value={loadMag} 
                                onChange={e => setLoadMag(Number(e.target.value))}
                                className="w-16 bg-transparent text-white font-mono font-bold outline-none border-b border-transparent focus:border-rose-500 transition-colors text-center"
                            />
                            <span className="text-xs text-slate-500">kN{loadMode === 'distributed' ? '/m' : ''}</span>
                        </div>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="flex items-center gap-4 border-r border-white/10 pr-6">
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Supports</span>
                        <span className="text-emerald-400 font-mono font-bold text-sm">{props.supports.length}</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Loads</span>
                        <span className="text-rose-400 font-mono font-bold text-sm">{props.loads.length}</span>
                    </div>
                </div>

                {/* Solve Button */}
                <button 
                    onClick={props.solve}
                    disabled={props.supports.length === 0}
                    className="bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-900 px-6 py-2 rounded-full font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] transition-all flex items-center gap-2 active:scale-95 disabled:shadow-none"
                    title={props.supports.length === 0 ? "Add at least one support to solve" : "Calculate beam analysis"}
                >
                    <Play size={18} fill="currentColor"/> 
                    SOLVE
                </button>
            </div>

            {/* --- 2. ÁREA DE TRABAJO (Canvas + Tools) --- */}
            <div className="flex gap-6 w-full max-w-5xl h-[500px]">
                
                {/* Floating Toolbar (Left Dock) */}
                <aside className="flex flex-col justify-center gap-4 bg-slate-800/40 backdrop-blur-md border border-white/5 p-2 rounded-2xl shadow-xl">
                    <ToolButton 
                        active={activeTool === 'select'} onClick={() => setActiveTool('select')} 
                        icon={<MousePointer2 size={20}/>} label="Select" 
                    />
                    <div className="w-full h-[1px] bg-white/10 mx-auto" />
                    <ToolButton 
                        active={activeTool === 'pin'} onClick={() => setActiveTool('pin')} 
                        icon={<div className="font-bold text-[10px] tracking-tighter">PIN</div>} label="Pin" color="text-emerald-400"
                    />
                    <ToolButton 
                        active={activeTool === 'roller'} onClick={() => setActiveTool('roller')} 
                        icon={<div className="font-bold text-[10px] tracking-tighter">ROL</div>} label="Roller" color="text-emerald-400"
                    />
                    <ToolButton 
                        active={activeTool === 'fixed'} onClick={() => setActiveTool('fixed')} 
                        icon={<Lock size={18}/>} label="Fixed" color="text-blue-400"
                    />
                    <div className="w-full h-[1px] bg-white/10 mx-auto" />
                    <ToolButton 
                        active={activeTool === 'load'} onClick={() => {
                            if (activeTool === 'load') {
                                setActiveTool('select');
                            } else {
                                setActiveTool('load');
                                if (loadMode === 'distributed') {
                                    setDistributedStartPos(null);
                                }
                            }
                        }} 
                        icon={loadMode === 'point' ? <ArrowDown size={20}/> : <GripVertical size={20}/>} 
                        label={loadMode === 'point' ? 'Point Load' : 'Distributed Load'} 
                        color="text-rose-400"
                    />
                    <div className="w-full h-[1px] bg-white/10 mx-auto" />
                    <ToolButton 
                        active={showGridSettings} onClick={() => setShowGridSettings(!showGridSettings)} 
                        icon={<Grid3x3 size={18}/>} label="Grid Settings" color={showGrid ? "text-cyan-400" : "text-slate-400"}
                    />
                </aside>

                {/* Main Canvas Container */}
                <main className="flex-1 bg-slate-900/50 backdrop-blur rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden flex items-center justify-center group">
                    
                    {/* Load Settings Panel */}
                    {showLoadSettings && (
                        <div className="absolute top-4 left-4 bg-slate-800/90 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-2xl z-30 min-w-[250px]">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-rose-400 font-semibold text-sm flex items-center gap-2">
                                    <Weight size={14} />
                                    Load Settings
                                </h4>
                                <button 
                                    onClick={() => setShowLoadSettings(false)}
                                    className="text-slate-500 hover:text-slate-300 text-xs"
                                >
                                    ×
                                </button>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">Load Type</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setLoadMode('point');
                                                setDistributedStartPos(null);
                                            }}
                                            className={`flex-1 text-xs px-3 py-2 rounded-lg transition-colors ${
                                                loadMode === 'point' 
                                                    ? 'bg-rose-500/30 text-rose-400 border border-rose-500/50' 
                                                    : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                                            }`}
                                        >
                                            Point Force
                                        </button>
                                        <button
                                            onClick={() => {
                                                setLoadMode('distributed');
                                                setDistributedStartPos(null);
                                            }}
                                            className={`flex-1 text-xs px-3 py-2 rounded-lg transition-colors ${
                                                loadMode === 'distributed' 
                                                    ? 'bg-rose-500/30 text-rose-400 border border-rose-500/50' 
                                                    : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                                            }`}
                                        >
                                            Distributed
                                        </button>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">
                                        Magnitude ({loadMode === 'point' ? 'kN' : 'kN/m'})
                                    </label>
                                    <input
                                        type="number"
                                        min="0.1"
                                        step="0.1"
                                        value={loadMag}
                                        onChange={(e) => setLoadMag(Math.max(0.1, Number(e.target.value)))}
                                        className="w-full bg-slate-700/50 border border-white/10 rounded-lg px-2 py-1 text-sm text-white font-mono focus:border-rose-500 focus:outline-none"
                                    />
                                </div>

                                {loadMode === 'distributed' && (
                                    <>
                                        <div>
                                            <label className="text-xs text-slate-400 mb-1 block">Start Position (m)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max={props.length}
                                                step={gridSnap}
                                                value={distStartX}
                                                onChange={(e) => {
                                                    const val = Math.max(0, Math.min(props.length, Number(e.target.value)));
                                                    setDistStartX(val);
                                                    if (val >= distEndX) setDistEndX(Math.min(props.length, val + gridSnap));
                                                }}
                                                className="w-full bg-slate-700/50 border border-white/10 rounded-lg px-2 py-1 text-sm text-white font-mono focus:border-rose-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400 mb-1 block">End Position (m)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max={props.length}
                                                step={gridSnap}
                                                value={distEndX}
                                                onChange={(e) => {
                                                    const val = Math.max(0, Math.min(props.length, Number(e.target.value)));
                                                    setDistEndX(val);
                                                    if (val <= distStartX) setDistStartX(Math.max(0, val - gridSnap));
                                                }}
                                                className="w-full bg-slate-700/50 border border-white/10 rounded-lg px-2 py-1 text-sm text-white font-mono focus:border-rose-500 focus:outline-none"
                                            />
                                        </div>
                                        <div className="pt-2 border-t border-white/10">
                                            <button
                                                onClick={() => {
                                                    if (distStartX < distEndX) {
                                                        props.addLoad('DistributedForce', -loadMag, undefined, distStartX, distEndX);
                                                    }
                                                }}
                                                className="w-full bg-rose-500 hover:bg-rose-400 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
                                            >
                                                Add Distributed Load
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Grid Settings Panel */}
                    {showGridSettings && (
                        <div className="absolute top-4 right-4 bg-slate-800/90 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-2xl z-30 min-w-[200px]">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-slate-300 font-semibold text-sm flex items-center gap-2">
                                    <Grid3x3 size={14} />
                                    Grid Settings
                                </h4>
                                <button 
                                    onClick={() => setShowGridSettings(false)}
                                    className="text-slate-500 hover:text-slate-300 text-xs"
                                >
                                    ×
                                </button>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs text-slate-400">Show Grid</label>
                                    <button
                                        onClick={() => setShowGrid(!showGrid)}
                                        className={`w-10 h-5 rounded-full transition-colors ${
                                            showGrid ? 'bg-cyan-500' : 'bg-slate-600'
                                        }`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                                            showGrid ? 'translate-x-5' : 'translate-x-1'
                                        }`} />
                                    </button>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">Snap Interval (m)</label>
                                    <input
                                        type="number"
                                        min="0.01"
                                        max="5"
                                        step="0.01"
                                        value={gridSnap}
                                        onChange={(e) => setGridSnap(Math.max(0.01, Number(e.target.value)))}
                                        className="w-full bg-slate-700/50 border border-white/10 rounded-lg px-2 py-1 text-sm text-white font-mono focus:border-cyan-500 focus:outline-none"
                                    />
                                    <div className="flex gap-1 mt-1">
                                        {[0.1, 0.25, 0.5, 1.0].map(val => (
                                            <button
                                                key={val}
                                                onClick={() => setGridSnap(val)}
                                                className={`text-xs px-2 py-0.5 rounded ${
                                                    gridSnap === val 
                                                        ? 'bg-cyan-500 text-slate-900' 
                                                        : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                                                }`}
                                            >
                                                {val}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Grid Visualization */}
                    {showGrid && (
                        <svg 
                            className="absolute inset-0 w-full h-full pointer-events-none z-0"
                            viewBox={`0 0 ${width} ${height}`}
                        >
                            {/* Vertical grid lines */}
                            {Array.from({ length: Math.floor(props.length / gridSnap) + 1 }).map((_, i) => {
                                const x = i * gridSnap;
                                if (x > props.length) return null;
                                const xPx = metersToPx(x);
                                const isMajor = (x % (gridSnap * 5) === 0) || x === 0 || Math.abs(x - props.length) < 0.01;
                                
                                return (
                                    <g key={`grid-${i}`}>
                                        <line 
                                            x1={xPx} 
                                            y1={paddingX} 
                                            x2={xPx} 
                                            y2={height - paddingX} 
                                            stroke={isMajor ? "#475569" : "#334155"} 
                                            strokeWidth={isMajor ? 1 : 0.5}
                                            strokeDasharray={isMajor ? "none" : "2,2"}
                                            opacity={isMajor ? 0.4 : 0.2}
                                        />
                                        {isMajor && (
                                            <text 
                                                x={xPx} 
                                                y={beamY + 25} 
                                                fill="#64748b" 
                                                fontSize="9" 
                                                fontFamily="monospace" 
                                                textAnchor="middle"
                                                opacity={0.6}
                                            >
                                                {x.toFixed(2)}
                                            </text>
                                        )}
                                    </g>
                                );
                            })}
                        </svg>
                    )}

                    <svg 
                        ref={svgRef}
                        viewBox={`0 0 ${width} ${height}`} 
                        className="w-full h-full cursor-crosshair"
                        onClick={handleCanvasClick}
                        onMouseMove={(e) => {
                            if (!svgRef.current) return;
                            const rect = svgRef.current.getBoundingClientRect();
                            const xPx = e.clientX - rect.left;
                            const xM = pxToMeters(xPx);
                            setHoverPosition({ x: xPx, snapped: xM });
                        }}
                        onMouseLeave={() => setHoverPosition(null)}
                    >
                        {/* Viga con Glow */}
                        <defs>
                            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="4" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                        </defs>

                        {/* Eje Viga */}
                        <line x1={paddingX} y1={beamY} x2={width - paddingX} y2={beamY} stroke="#475569" strokeWidth="4" strokeLinecap="round" />
                        <line x1={paddingX} y1={beamY} x2={width - paddingX} y2={beamY} stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />

                        {/* Regla (Cotas) */}
                        <text x={paddingX} y={beamY + 40} fill="#64748b" fontSize="12" fontFamily="monospace" textAnchor="middle">0.0m</text>
                        <text x={width - paddingX} y={beamY + 40} fill="#64748b" fontSize="12" fontFamily="monospace" textAnchor="middle">{props.length.toFixed(1)}m</text>

                        {/* Hover indicator for grid snap */}
                        {hoverPosition && activeTool !== 'select' && (
                            <g>
                                <line 
                                    x1={hoverPosition.x} 
                                    y1={paddingX} 
                                    x2={hoverPosition.x} 
                                    y2={height - paddingX} 
                                    stroke="#22d3ee" 
                                    strokeWidth="1.5"
                                    strokeDasharray="4,4"
                                    opacity="0.6"
                                />
                                <circle 
                                    cx={hoverPosition.x} 
                                    cy={beamY} 
                                    r="6" 
                                    fill="#22d3ee" 
                                    opacity="0.8"
                                />
                                <rect 
                                    x={hoverPosition.x - 30} 
                                    y={beamY - 35} 
                                    width="60" 
                                    height="18" 
                                    rx="4" 
                                    fill="#0e7490" 
                                    opacity="0.9"
                                />
                                <text 
                                    x={hoverPosition.x} 
                                    y={beamY - 22} 
                                    textAnchor="middle" 
                                    fill="white" 
                                    fontSize="10" 
                                    fontFamily="monospace"
                                    fontWeight="bold"
                                >
                                    {hoverPosition.snapped.toFixed(2)}m
                                </text>
                            </g>
                        )}

                        {/* Elementos: Supports */}
                        {props.supports.map(s => (
                            <g key={s.id} onClick={(e) => {e.stopPropagation(); props.removeSupport(s.id)}} className="cursor-pointer hover:opacity-80 transition-opacity group/support">
                                {s.type === 'Pin' ? (
                                    <>
                                        <path d={`M ${metersToPx(s.x)} ${beamY} l -10 20 h 20 z`} fill="#10b981" stroke="#064e3b" strokeWidth="2"/>
                                        <text x={metersToPx(s.x)} y={beamY + 50} textAnchor="middle" fill="#10b981" fontSize="10" fontWeight="bold" className="opacity-0 group-hover/support:opacity-100 transition-opacity">PIN</text>
                                    </>
                                ) : s.type === 'Roller' ? (
                                    <>
                                        <circle cx={metersToPx(s.x)} cy={beamY + 10} r="9" fill="#10b981" stroke="#064e3b" strokeWidth="2" />
                                        <text x={metersToPx(s.x)} y={beamY + 50} textAnchor="middle" fill="#10b981" fontSize="10" fontWeight="bold" className="opacity-0 group-hover/support:opacity-100 transition-opacity">ROLLER</text>
                                    </>
                                ) : s.type === 'Fixed' ? (
                                    <>
                                        {/* Fixed support: rectangle attached to beam */}
                                        <rect 
                                            x={metersToPx(s.x) - 8} 
                                            y={beamY} 
                                            width="16" 
                                            height="25" 
                                            fill="#3b82f6" 
                                            stroke="#1e40af" 
                                            strokeWidth="2"
                                        />
                                        {/* Diagonal lines indicating fixed connection */}
                                        <line x1={metersToPx(s.x) - 6} y1={beamY + 5} x2={metersToPx(s.x) - 2} y2={beamY + 15} stroke="#1e40af" strokeWidth="1.5" />
                                        <line x1={metersToPx(s.x) + 2} y1={beamY + 5} x2={metersToPx(s.x) + 6} y2={beamY + 15} stroke="#1e40af" strokeWidth="1.5" />
                                        <text x={metersToPx(s.x)} y={beamY + 50} textAnchor="middle" fill="#3b82f6" fontSize="10" fontWeight="bold" className="opacity-0 group-hover/support:opacity-100 transition-opacity">FIXED</text>
                                    </>
                                ) : null}
                                {/* Position label */}
                                <text 
                                    x={metersToPx(s.x)} 
                                    y={beamY - 25} 
                                    textAnchor="middle" 
                                    fill="#94a3b8" 
                                    fontSize="9" 
                                    fontFamily="monospace"
                                    className="opacity-0 group-hover/support:opacity-100 transition-opacity"
                                >
                                    x={s.x.toFixed(2)}m
                                </text>
                                {/* Delete indicator */}
                                <circle cx={metersToPx(s.x) + 12} cy={beamY - 12} r="8" fill="#1e293b" className="opacity-0 group-hover/support:opacity-100 transition-opacity" />
                                <text x={metersToPx(s.x) + 12} y={beamY - 8} textAnchor="middle" fill="#ef4444" fontSize="12" fontWeight="bold" className="opacity-0 group-hover/support:opacity-100 transition-opacity pointer-events-none">×</text>
                            </g>
                        ))}

                        {/* Elementos: Loads */}
                        {props.loads.map(l => {
                            // Point Force
                            if (l.type === 'PointForce' && typeof l.x === 'number') {
                                const x = metersToPx(l.x);
                                return (
                                    <g key={l.id} onClick={(e) => {e.stopPropagation(); props.removeLoad(l.id)}} className="cursor-pointer hover:opacity-80 group/load">
                                        <line x1={x} y1={beamY - 60} x2={x} y2={beamY - 5} stroke="#f43f5e" strokeWidth="3" />
                                        <path d={`M ${x-6} ${beamY-10} L ${x} ${beamY} L ${x+6} ${beamY-10}`} fill="#f43f5e" />
                                        
                                        {/* Etiqueta flotante */}
                                        <rect x={x - 30} y={beamY - 85} width="60" height="20" rx="4" fill="#881337" opacity="0.9" />
                                        <text x={x} y={beamY - 71} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">{Math.abs(l.magnitude)} kN</text>
                                        
                                        {/* Position label */}
                                        <text x={x} y={beamY - 95} textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace" className="opacity-0 group-hover/load:opacity-100 transition-opacity">
                                            x={l.x.toFixed(2)}m
                                        </text>
                                        
                                        {/* Icono borrar al hover */}
                                        <circle cx={x + 18} cy={beamY - 75} r="6" fill="#1e293b" className="opacity-0 group-hover/load:opacity-100 transition-opacity" />
                                        <text x={x + 18} y={beamY - 72} textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="bold" className="opacity-0 group-hover/load:opacity-100 pointer-events-none">×</text>
                                    </g>
                                );
                            }
                            
                            // Distributed Force
                            if (l.type === 'DistributedForce' && typeof l.startX === 'number' && typeof l.endX === 'number') {
                                const startX = metersToPx(l.startX);
                                const endX = metersToPx(l.endX);
                                const width = endX - startX;
                                const arrowSpacing = Math.min(50, width / 4);
                                
                                return (
                                    <g key={l.id} onClick={(e) => {e.stopPropagation(); props.removeLoad(l.id)}} className="cursor-pointer hover:opacity-80 group/load">
                                        {/* Distributed load arrows */}
                                        {Array.from({ length: Math.floor(width / arrowSpacing) + 1 }).map((_, i) => {
                                            const x = startX + (i * arrowSpacing);
                                            if (x > endX) return null;
                                            return (
                                                <g key={`arrow-${i}`}>
                                                    <line x1={x} y1={beamY - 50} x2={x} y2={beamY - 5} stroke="#f43f5e" strokeWidth="2" />
                                                    <path d={`M ${x-4} ${beamY-8} L ${x} ${beamY} L ${x+4} ${beamY-8}`} fill="#f43f5e" />
                                                </g>
                                            );
                                        })}
                                        
                                        {/* Base line */}
                                        <line x1={startX} y1={beamY - 5} x2={endX} y2={beamY - 5} stroke="#f43f5e" strokeWidth="2" />
                                        
                                        {/* Label */}
                                        <rect x={(startX + endX) / 2 - 40} y={beamY - 75} width="80" height="18" rx="4" fill="#881337" opacity="0.9" />
                                        <text x={(startX + endX) / 2} y={beamY - 63} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">
                                            {Math.abs(l.magnitude)} kN/m
                                        </text>
                                        
                                        {/* Position labels */}
                                        <text x={startX} y={beamY - 90} textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace" className="opacity-0 group-hover/load:opacity-100 transition-opacity">
                                            {l.startX.toFixed(2)}m
                                        </text>
                                        <text x={endX} y={beamY - 90} textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace" className="opacity-0 group-hover/load:opacity-100 transition-opacity">
                                            {l.endX.toFixed(2)}m
                                        </text>
                                        
                                        {/* Delete indicator */}
                                        <circle cx={endX + 12} cy={beamY - 40} r="6" fill="#1e293b" className="opacity-0 group-hover/load:opacity-100 transition-opacity" />
                                        <text x={endX + 12} y={beamY - 37} textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="bold" className="opacity-0 group-hover/load:opacity-100 pointer-events-none">×</text>
                                    </g>
                                );
                            }
                            
                            return null;
                        })}

                        {/* Distributed force placement indicator */}
                        {activeTool === 'load' && loadMode === 'distributed' && distributedStartPos !== null && hoverPosition && (
                            <g>
                                <line 
                                    x1={metersToPx(distributedStartPos)} 
                                    y1={beamY - 50} 
                                    x2={hoverPosition.x} 
                                    y2={beamY - 50} 
                                    stroke="#f43f5e" 
                                    strokeWidth="2"
                                    strokeDasharray="4,4"
                                    opacity="0.6"
                                />
                                <rect 
                                    x={Math.min(metersToPx(distributedStartPos), hoverPosition.x) - 30} 
                                    y={beamY - 70} 
                                    width="60" 
                                    height="16" 
                                    rx="4" 
                                    fill="#881337" 
                                    opacity="0.8"
                                />
                                <text 
                                    x={(metersToPx(distributedStartPos) + hoverPosition.x) / 2} 
                                    y={beamY - 60} 
                                    textAnchor="middle" 
                                    fill="white" 
                                    fontSize="9" 
                                    fontFamily="monospace"
                                >
                                    {Math.abs(distributedStartPos - hoverPosition.snapped).toFixed(2)}m
                                </text>
                            </g>
                        )}

                        {/* Deformada */}
                        {props.results && (
                            <DeformationPath results={props.results} totalL={props.length} width={width} padding={paddingX} baseY={beamY} inputs={{l: props.length, s: props.supports, f: props.loads}} />
                        )}
                    </svg>

                    {/* Hint */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 text-[10px] text-slate-500 font-mono tracking-widest opacity-50 uppercase">
                        <span>Interactive Canvas</span>
                        <span>•</span>
                        <span>Grid Snap: {gridSnap}m</span>
                        {activeTool !== 'select' && (
                            <>
                                <span>•</span>
                                <span className="text-cyan-400 animate-pulse">
                                    {activeTool === 'pin' && 'Click to add Pin Support'}
                                    {activeTool === 'roller' && 'Click to add Roller Support'}
                                    {activeTool === 'fixed' && 'Click to add Fixed Support'}
                                    {activeTool === 'load' && loadMode === 'point' && `Click to add ${loadMag}kN Point Load`}
                                    {activeTool === 'load' && loadMode === 'distributed' && distributedStartPos === null && `Click to set start position (${loadMag}kN/m)`}
                                    {activeTool === 'load' && loadMode === 'distributed' && distributedStartPos !== null && `Click to set end position`}
                                </span>
                            </>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

// Componentes UI Reutilizables (Estilizados)
const ToolButton = ({ active, onClick, icon, label, color = "text-slate-200" }: any) => (
    <button 
        onClick={onClick} 
        className={`
            w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group relative
            ${active 
                ? 'bg-gradient-to-br from-slate-700 to-slate-800 text-white shadow-inner ring-1 ring-cyan-500/50' 
                : 'hover:bg-white/5 text-slate-400 hover:text-white hover:scale-105'
            }
        `}
    >
        <div className={active ? color : ""}>{icon}</div>
        
        {/* Tooltip moderno a la derecha */}
        <span className="absolute left-14 px-2 py-1 bg-slate-900 border border-white/10 text-[10px] text-slate-300 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            {label}
        </span>
    </button>
);

const DeformationPath = ({ results, totalL, width, padding, baseY, inputs }: any) => {
    const points = new Set<number>([0, totalL]);
    inputs.s.forEach((s: any) => points.add(s.x));
    inputs.f.forEach((l: any) => typeof l.x === 'number' && points.add(l.x));
    
    const sortedX = Array.from(points).sort((a,b) => a-b);
    const SCALE = 250; 
    
    let d = "";
    sortedX.forEach((xMeter, i) => {
        const xPx = (xMeter / totalL) * (width - padding * 2) + padding;
        const nodeId = `n${i}`;
        const dy = results.displacements[nodeId]?.y || 0;
        const yPx = baseY - (dy * SCALE);
        d += `${i===0 ? 'M' : 'L'} ${xPx} ${yPx} `;
    });

    return (
        <>
            {/* Sombra de la curva (Glow) */}
            <path d={d} fill="none" stroke="#22d3ee" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" filter="url(#glow)" />
            {/* Línea principal */}
            <path d={d} fill="none" stroke="#22d3ee" strokeWidth="2" strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round" />
        </>
    );
};