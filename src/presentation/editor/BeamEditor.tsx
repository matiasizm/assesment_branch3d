import React, { useRef, useState } from 'react';
import { MousePointer2, ArrowDown, Play, Ruler, Weight, Eraser, Trash2 } from 'lucide-react';
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
    addLoad: (type: LoadType, mag: number, x: number) => void;
    removeLoad: (id: string) => void;
    solve: () => void;
    results: AnalysisResults | null;
}

type Tool = 'select' | 'pin' | 'roller' | 'load';

export const BeamEditor: React.FC<BeamEditorProps> = (props) => {
    const [activeTool, setActiveTool] = useState<Tool>('select');
    const [loadMag, setLoadMag] = useState(10);
    const svgRef = useRef<SVGSVGElement>(null);

    // Configuración Visual
    const width = 800; 
    const height = 400;
    const paddingX = 60;
    const beamY = 200;

    const metersToPx = (m: number) => (m / props.length) * (width - paddingX * 2) + paddingX;
    const pxToMeters = (px: number) => {
        const raw = ((px - paddingX) / (width - paddingX * 2)) * props.length;
        const snapStep = 0.25; // Snap más fino
        const snapped = Math.round(raw / snapStep) * snapStep;
        return Math.max(0, Math.min(props.length, snapped));
    };

    const handleCanvasClick = (e: React.MouseEvent) => {
        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const xPx = e.clientX - rect.left;
        const xM = pxToMeters(xPx);

        if (activeTool === 'pin') props.addSupport(xM, 'Pin');
        if (activeTool === 'roller') props.addSupport(xM, 'Roller');
        if (activeTool === 'load') props.addLoad('PointForce', -loadMag, xM);
        
        if (activeTool !== 'select') setActiveTool('select');
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-center relative p-6">
            
            {/* --- 1. BARRA SUPERIOR (Floating Island) --- */}
            <div className="absolute top-6 flex items-center gap-6 px-6 py-3 bg-slate-800/60 backdrop-blur-md border border-white/10 rounded-full shadow-2xl z-20">
                
                {/* Length Input */}
                <div className="flex items-center gap-3 border-r border-white/10 pr-6">
                    <Ruler size={18} className="text-slate-400" />
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Length</span>
                        <div className="flex items-baseline gap-1">
                            <input 
                                type="number" 
                                value={props.length} 
                                onChange={e => props.setLength(Number(e.target.value))}
                                className="w-12 bg-transparent text-white font-mono font-bold outline-none border-b border-transparent focus:border-cyan-500 transition-colors text-center"
                            />
                            <span className="text-xs text-slate-500">m</span>
                        </div>
                    </div>
                </div>

                {/* Load Input */}
                <div className="flex items-center gap-3">
                    <Weight size={18} className="text-rose-400" />
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Force</span>
                        <div className="flex items-baseline gap-1">
                            <input 
                                type="number" 
                                value={loadMag} 
                                onChange={e => setLoadMag(Number(e.target.value))}
                                className="w-12 bg-transparent text-white font-mono font-bold outline-none border-b border-transparent focus:border-rose-500 transition-colors text-center"
                            />
                            <span className="text-xs text-slate-500">kN</span>
                        </div>
                    </div>
                </div>

                {/* Solve Button */}
                <button 
                    onClick={props.solve} 
                    className="ml-4 bg-cyan-500 hover:bg-cyan-400 text-slate-900 px-6 py-2 rounded-full font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] transition-all flex items-center gap-2 active:scale-95"
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
                    <div className="w-full h-[1px] bg-white/10 mx-auto" />
                    <ToolButton 
                        active={activeTool === 'load'} onClick={() => setActiveTool('load')} 
                        icon={<ArrowDown size={20}/>} label="Load" color="text-rose-400"
                    />
                </aside>

                {/* Main Canvas Container */}
                <main className="flex-1 bg-slate-900/50 backdrop-blur rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden flex items-center justify-center group">
                    
                    {/* Grid Sutil */}
                    <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px] opacity-20 pointer-events-none" />

                    <svg 
                        ref={svgRef}
                        viewBox={`0 0 ${width} ${height}`} 
                        className="w-full h-full cursor-crosshair"
                        onClick={handleCanvasClick}
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

                        {/* Elementos: Supports */}
                        {props.supports.map(s => (
                            <g key={s.id} onClick={(e) => {e.stopPropagation(); props.removeSupport(s.id)}} className="cursor-pointer hover:opacity-80 transition-opacity">
                                {s.type === 'Pin' 
                                    ? <path d={`M ${metersToPx(s.x)} ${beamY} l -10 20 h 20 z`} fill="#10b981" stroke="#064e3b" strokeWidth="2"/>
                                    : <circle cx={metersToPx(s.x)} cy={beamY + 10} r="9" fill="#10b981" stroke="#064e3b" strokeWidth="2" />
                                }
                            </g>
                        ))}

                        {/* Elementos: Loads */}
                        {props.loads.map(l => {
                            if (typeof l.x !== 'number') return null;
                            const x = metersToPx(l.x);
                            return (
                                <g key={l.id} onClick={(e) => {e.stopPropagation(); props.removeLoad(l.id)}} className="cursor-pointer hover:opacity-80 group/load">
                                    <line x1={x} y1={beamY - 60} x2={x} y2={beamY - 5} stroke="#f43f5e" strokeWidth="3" markerEnd="url(#arrowhead)" />
                                    <path d={`M ${x-6} ${beamY-10} L ${x} ${beamY} L ${x+6} ${beamY-10}`} fill="#f43f5e" />
                                    
                                    {/* Etiqueta flotante */}
                                    <rect x={x - 24} y={beamY - 85} width="48" height="20" rx="4" fill="#881337" opacity="0.9" />
                                    <text x={x} y={beamY - 71} textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">{Math.abs(l.magnitude)}</text>
                                    
                                    {/* Icono borrar al hover */}
                                    <circle cx={x + 15} cy={beamY - 75} r="6" fill="black" className="opacity-0 group-hover/load:opacity-100 transition-opacity" />
                                    <text x={x + 15} y={beamY - 72} textAnchor="middle" fill="white" fontSize="8" className="opacity-0 group-hover/load:opacity-100 pointer-events-none">×</text>
                                </g>
                            )
                        })}

                        {/* Deformada */}
                        {props.results && (
                            <DeformationPath results={props.results} totalL={props.length} width={width} padding={paddingX} baseY={beamY} inputs={{l: props.length, s: props.supports, f: props.loads}} />
                        )}
                    </svg>

                    {/* Hint */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-slate-500 font-mono tracking-widest opacity-50 uppercase">
                        Interactive Canvas • Grid Snap ON
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