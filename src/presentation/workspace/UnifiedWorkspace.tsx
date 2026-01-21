import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
    Ruler, Weight, Play, Grid3x3, Lock, MousePointer2, 
    ArrowDown, ArrowUp, GripVertical, Settings, X, CheckCircle2, AlertCircle,
    ZoomIn, ZoomOut, Maximize2, Move, Gauge, Box, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, PanelRightClose, PanelRightOpen
} from 'lucide-react';
import type { SupportType } from '../../core/entities/Node';
import type { LoadType, LoadCategory } from '../../core/entities/Load';
import type { AnalysisResults } from '../../core/logic/FemSolver';
import { IntegratedDiagrams } from '../results/IntegratedDiagrams';
import { InteractiveCanvas } from './InteractiveCanvas';
import { DiagramCalculator } from '../../core/services/DiagramCalculator';
import type { Node } from '../../core/entities/Node';
import type { Load } from '../../core/entities/Load';

interface UnifiedWorkspaceProps {
    length: number;
    setLength: (l: number) => void;
    supports: { id: string, x: number, type: SupportType }[];
    addSupport: (x: number, type: SupportType) => void;
    removeSupport: (id: string) => void;
    loads: any[];
    addLoad: (type: LoadType, mag: number, x?: number, startX?: number, endX?: number, direction?: 'up' | 'down', category?: LoadCategory) => void;
    removeLoad: (id: string) => void;
    updateLoadCategory: (id: string, category: LoadCategory) => void;
    solve: () => void;
    results: AnalysisResults | null;
    error: string | null;
    nodes: Node[];
    processedLoads: Load[];
    material: { E: number, I: number };
    setMaterial: (m: { E: number, I: number }) => void;
}

type Tool = 'select' | 'pin' | 'roller' | 'fixed' | 'load';
type LoadMode = 'point' | 'distributed';

export const UnifiedWorkspace: React.FC<UnifiedWorkspaceProps> = (props) => {
    const [activeTool, setActiveTool] = useState<Tool>('select');
    const [loadMode, setLoadMode] = useState<LoadMode>('point');
    const [loadMag, setLoadMag] = useState(10);
    const [loadDirection, setLoadDirection] = useState<'up' | 'down'>('down');
    const [loadCategory, setLoadCategory] = useState<LoadCategory>('Live');
    const [gridSnap, setGridSnap] = useState(0.25);
    const [showGrid, setShowGrid] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [showMaterial, setShowMaterial] = useState(false);
    const [distributedStartPos, setDistributedStartPos] = useState<number | null>(null);
    const [canvasZoom, setCanvasZoom] = useState(1);
    const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
    const [diagramZoom, setDiagramZoom] = useState(1);
    const [diagramPan, setDiagramPan] = useState({ x: 0, y: 0 });
    const [resultsPanelHeight, setResultsPanelHeight] = useState(500); // Default height in pixels
    const [isResizing, setIsResizing] = useState(false);
    const [showResultsPanel, setShowResultsPanel] = useState(true);
    const resizeRef = useRef<HTMLDivElement>(null);

    const diagramData = useMemo(() => {
        if (!props.results || props.nodes.length === 0) return null;
        try {
            return DiagramCalculator.calculateDiagrams(
                props.length,
                props.nodes,
                props.processedLoads,
                props.results.reactions,
                props.results.displacements,
                200
            );
        } catch (err) {
            console.error('Error calculating diagrams:', err);
            return null;
        }
    }, [props.results, props.length, props.nodes, props.processedLoads]);

    const handleZoom = (delta: number, target: 'canvas' | 'diagram') => {
        if (target === 'canvas') {
            setCanvasZoom(prev => Math.max(0.5, Math.min(3, prev + delta)));
        } else {
            setDiagramZoom(prev => Math.max(0.5, Math.min(3, prev + delta)));
        }
    };

    const resetZoom = (target: 'canvas' | 'diagram') => {
        if (target === 'canvas') {
            setCanvasZoom(1);
            setCanvasPan({ x: 0, y: 0 });
        } else {
            setDiagramZoom(1);
            setDiagramPan({ x: 0, y: 0 });
        }
    };

    // Handle panel resizing (vertical)
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const containerHeight = window.innerHeight;
            const toolbarHeight = 200; // Approximate toolbar height
            const availableHeight = containerHeight - toolbarHeight;
            const newHeight = availableHeight - (e.clientY - toolbarHeight);
            setResultsPanelHeight(Math.max(300, Math.min(800, newHeight)));
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizing]);

    return (
        <div className="flex flex-col h-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            {/* Top Toolbar - Enhanced Design */}
            <div className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-800/50 shadow-xl z-30">
                <div className="max-w-[1920px] mx-auto px-8 py-5">
                    {/* Main Toolbar Row */}
                    <div className="flex items-center justify-between gap-8">
                        {/* Left: Main Controls - Better Grouped */}
                        <div className="flex items-center gap-8">
                            {/* Beam Properties Section */}
                            <div className="flex items-center gap-4 px-4 py-2.5 bg-slate-800/60 rounded-xl border border-slate-700/50 backdrop-blur-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-500/10 rounded-lg">
                                        <Ruler size={18} className="text-orange-400" />
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Beam Length</label>
                                        <div className="flex items-baseline gap-1.5">
                                            <input
                                                type="number"
                                                min="0.1"
                                                step="0.1"
                                                value={props.length}
                                                onChange={e => props.setLength(Number(e.target.value))}
                                                className="w-24 px-3 py-1.5 bg-slate-900/50 border border-slate-600/50 rounded-lg text-sm font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                                            />
                                            <span className="text-xs text-slate-500 font-medium">m</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Load Controls Section */}
                            <div className="flex items-center gap-4 px-4 py-2.5 bg-slate-800/60 rounded-xl border border-slate-700/50 backdrop-blur-sm">
                                <div className="p-2 bg-emerald-500/10 rounded-lg">
                                    <Weight size={18} className="text-emerald-400" />
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Load Type</label>
                                        <div className="flex gap-1 bg-slate-900/50 rounded-lg p-1">
                                            <button
                                                onClick={() => {
                                                    setActiveTool('load');
                                                    setLoadMode('point');
                                                    setDistributedStartPos(null);
                                                }}
                                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                                    loadMode === 'point' && activeTool === 'load'
                                                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                                }`}
                                            >
                                                Point
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setActiveTool('load');
                                                    setLoadMode('distributed');
                                                    setDistributedStartPos(null);
                                                }}
                                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                                    loadMode === 'distributed' && activeTool === 'load'
                                                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                                }`}
                                            >
                                                Distributed
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Magnitude</label>
                                        <div className="flex items-baseline gap-1.5">
                                            <input
                                                type="number"
                                                min="0.1"
                                                step="0.1"
                                                value={loadMag}
                                                onChange={e => setLoadMag(Number(e.target.value))}
                                                className="w-24 px-3 py-1.5 bg-slate-900/50 border border-slate-600/50 rounded-lg text-sm font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                                            />
                                            <span className="text-xs text-slate-500 font-medium">kN{loadMode === 'distributed' ? '/m' : ''}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Direction</label>
                                        <div className="flex gap-1 bg-slate-900/50 rounded-lg p-1">
                                            <button
                                                onClick={() => {
                                                    setActiveTool('load');
                                                    setLoadDirection('down');
                                                }}
                                                className={`p-2 rounded-md transition-all ${
                                                    loadDirection === 'down'
                                                        ? 'bg-red-600 text-white shadow-md shadow-red-500/20'
                                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                                }`}
                                                title="Downward Load"
                                            >
                                                <ArrowDown size={16} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setActiveTool('load');
                                                    setLoadDirection('up');
                                                }}
                                                className={`p-2 rounded-md transition-all ${
                                                    loadDirection === 'up'
                                                        ? 'bg-yellow-500 text-slate-900 shadow-md shadow-yellow-500/20'
                                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                                }`}
                                                title="Upward Load"
                                            >
                                                <ArrowUp size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Category</label>
                                        <div className="flex gap-1 bg-slate-900/50 rounded-lg p-1">
                                            <button
                                                onClick={() => {
                                                    setActiveTool('load');
                                                    setLoadCategory('Dead');
                                                }}
                                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                                    loadCategory === 'Dead'
                                                        ? 'bg-slate-600 text-white shadow-md'
                                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                                }`}
                                                title="Dead Load (D)"
                                            >
                                                D
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setActiveTool('load');
                                                    setLoadCategory('Live');
                                                }}
                                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                                    loadCategory === 'Live'
                                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                                }`}
                                                title="Live Load (L)"
                                            >
                                                L
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions Section */}
                            <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-800/60 rounded-xl border border-slate-700/50 backdrop-blur-sm">
                                <button
                                    onClick={() => setShowMaterial(!showMaterial)}
                                    className={`p-2.5 rounded-lg transition-all ${
                                        showMaterial 
                                            ? 'bg-indigo-500/20 text-indigo-400 shadow-md shadow-indigo-500/10' 
                                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                    }`}
                                    title="Material Properties"
                                >
                                    <Gauge size={18} />
                                </button>
                                <button
                                    onClick={() => setShowGrid(!showGrid)}
                                    className={`p-2.5 rounded-lg transition-all ${
                                        showGrid 
                                            ? 'bg-orange-500/20 text-orange-400 shadow-md shadow-orange-500/10' 
                                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                    }`}
                                    title="Toggle Grid"
                                >
                                    <Grid3x3 size={18} />
                                </button>
                                <button
                                    onClick={() => setShowSettings(!showSettings)}
                                    className={`p-2.5 rounded-lg transition-all ${
                                        showSettings 
                                            ? 'bg-slate-700 text-slate-200 shadow-md' 
                                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                    }`}
                                    title="Settings"
                                >
                                    <Settings size={18} />
                                </button>
                            </div>

                            {/* Canvas Zoom Controls */}
                            <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-800/60 rounded-xl border border-slate-700/50 backdrop-blur-sm">
                                <button
                                    onClick={() => handleZoom(-0.1, 'canvas')}
                                    className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all"
                                    title="Zoom Out"
                                >
                                    <ZoomOut size={18} />
                                </button>
                                <span className="text-xs text-slate-500 px-2 font-mono font-semibold min-w-[3rem] text-center">{Math.round(canvasZoom * 100)}%</span>
                                <button
                                    onClick={() => handleZoom(0.1, 'canvas')}
                                    className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all"
                                    title="Zoom In"
                                >
                                    <ZoomIn size={18} />
                                </button>
                                <button
                                    onClick={() => resetZoom('canvas')}
                                    className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all"
                                    title="Reset Zoom"
                                >
                                    <Maximize2 size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Right: Solve Button & Status */}
                        <div className="flex items-center gap-4">
                            {/* Status Indicator */}
                            {props.results && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                                    <CheckCircle2 size={18} className="text-emerald-400" />
                                    <span className="text-sm font-semibold text-emerald-400">Solved</span>
                                </div>
                            )}
                            {props.error && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <AlertCircle size={18} className="text-red-400" />
                                    <span className="text-sm font-semibold text-red-400">Error</span>
                                </div>
                            )}
                            
                            {/* Solve Button - Enhanced */}
                            <button
                                onClick={props.solve}
                                disabled={props.supports.length === 0}
                                className="flex items-center gap-2.5 px-8 py-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:via-teal-600 hover:to-emerald-700 disabled:from-slate-700 disabled:via-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:shadow-none disabled:hover:scale-100"
                            >
                                <Play size={20} fill="currentColor" />
                                <span>Solve</span>
                            </button>
                        </div>
                    </div>

                    {/* Expandable Panels */}
                    {/* Settings Panel */}
                    {showSettings && (
                        <div className="mt-5 pt-5 border-t border-slate-700/50 animate-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center gap-6 flex-wrap">
                                <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-800/40 rounded-lg border border-slate-700/30">
                                    <span className="text-sm font-semibold text-slate-300">Grid Snap:</span>
                                    <input
                                        type="number"
                                        min="0.01"
                                        max="5"
                                        step="0.01"
                                        value={gridSnap}
                                        onChange={(e) => setGridSnap(Math.max(0.01, Number(e.target.value)))}
                                        className="w-24 px-3 py-1.5 bg-slate-900/50 border border-slate-600/50 rounded-lg text-sm font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                                    />
                                    <span className="text-sm text-slate-400 font-medium">m</span>
                                </div>
                                <div className="flex gap-2">
                                    {[0.1, 0.25, 0.5, 1.0].map(val => (
                                        <button
                                            key={val}
                                            onClick={() => setGridSnap(val)}
                                            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                                                gridSnap === val
                                                    ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                                                    : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700/50'
                                            }`}
                                        >
                                            {val}m
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Material Properties Panel */}
                    {showMaterial && (
                        <div className="mt-5 pt-5 border-t border-slate-700/50 animate-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center gap-6 flex-wrap">
                                <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-800/40 rounded-lg border border-slate-700/30">
                                    <Gauge size={16} className="text-indigo-400" />
                                    <span className="text-sm font-semibold text-slate-300">E:</span>
                                    <input
                                        type="number"
                                        min="1e6"
                                        step="1e9"
                                        value={props.material.E}
                                        onChange={(e) => props.setMaterial({ ...props.material, E: Number(e.target.value) })}
                                        className="w-36 px-3 py-1.5 bg-slate-900/50 border border-slate-600/50 rounded-lg text-sm font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                                    />
                                    <span className="text-xs text-slate-500 font-medium">Pa</span>
                                    <span className="text-xs text-slate-600 font-medium">({(props.material.E / 1e9).toFixed(1)} GPa)</span>
                                </div>
                                <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-800/40 rounded-lg border border-slate-700/30">
                                    <Box size={16} className="text-indigo-400" />
                                    <span className="text-sm font-semibold text-slate-300">I:</span>
                                    <input
                                        type="number"
                                        min="1e-6"
                                        step="0.0001"
                                        value={props.material.I}
                                        onChange={(e) => props.setMaterial({ ...props.material, I: Number(e.target.value) })}
                                        className="w-36 px-3 py-1.5 bg-slate-900/50 border border-slate-600/50 rounded-lg text-sm font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                                    />
                                    <span className="text-xs text-slate-500 font-medium">m⁴</span>
                                </div>
                                <div className="flex gap-2">
                                    {[
                                        { label: 'Steel', E: 200e9, I: 0.0001 },
                                        { label: 'Concrete', E: 30e9, I: 0.0001 },
                                        { label: 'Wood', E: 12e9, I: 0.0001 }
                                    ].map(mat => (
                                        <button
                                            key={mat.label}
                                            onClick={() => props.setMaterial({ E: mat.E, I: mat.I })}
                                            className="px-4 py-2 text-xs font-semibold rounded-lg transition-all bg-slate-800/60 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700/50"
                                        >
                                            {mat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Workspace - Vertical Split Layout */}
            <div className="flex-1 min-h-0 flex flex-col relative">
                {/* Editor Section */}
                <div className="flex-1 min-h-0 flex relative" style={{
                    height: showResultsPanel && props.results 
                        ? `calc(100% - ${resultsPanelHeight + 8}px)` 
                        : '100%'
                }}>
                    {/* Left Toolbar - Enhanced */}
                    <div className="w-20 bg-slate-900/95 backdrop-blur-sm border-r border-slate-800/50 flex flex-col items-center py-6 gap-4 z-10 shadow-lg">
                    {/* Select Tool */}
                    <div className="w-full flex flex-col items-center">
                        <ToolButton
                            active={activeTool === 'select'}
                            onClick={() => setActiveTool('select')}
                            icon={<MousePointer2 size={22} />}
                            label="Select"
                        />
                    </div>
                    
                    {/* Divider */}
                    <div className="w-12 h-[1px] bg-gradient-to-r from-transparent via-slate-700 to-transparent my-1" />
                    
                    {/* Support Tools */}
                    <div className="w-full flex flex-col items-center gap-3">
                        <div className="text-[9px] text-slate-600 uppercase tracking-widest font-bold mb-1 px-2">Supports</div>
                        <ToolButton
                            active={activeTool === 'pin'}
                            onClick={() => setActiveTool('pin')}
                            icon={<div className="text-[11px] font-extrabold tracking-tight">PIN</div>}
                            label="Pin Support"
                            color="text-cyan-400"
                        />
                        <ToolButton
                            active={activeTool === 'roller'}
                            onClick={() => setActiveTool('roller')}
                            icon={<div className="text-[11px] font-extrabold tracking-tight">ROL</div>}
                            label="Roller Support"
                            color="text-cyan-400"
                        />
                        <ToolButton
                            active={activeTool === 'fixed'}
                            onClick={() => setActiveTool('fixed')}
                            icon={<Lock size={20} />}
                            label="Fixed Support"
                            color="text-indigo-400"
                        />
                    </div>
                    
                    {/* Divider */}
                    <div className="w-12 h-[1px] bg-gradient-to-r from-transparent via-slate-700 to-transparent my-1" />
                    
                    {/* Load Tool */}
                    <div className="w-full flex flex-col items-center">
                        <div className="text-[9px] text-slate-600 uppercase tracking-widest font-bold mb-1 px-2">Loads</div>
                        <ToolButton
                            active={activeTool === 'load'}
                            onClick={() => {
                                if (activeTool === 'load') {
                                    setActiveTool('select');
                                } else {
                                    setActiveTool('load');
                                    setDistributedStartPos(null);
                                }
                            }}
                            icon={loadMode === 'point' ? (loadDirection === 'down' ? <ArrowDown size={22} /> : <ArrowUp size={22} />) : <GripVertical size={22} />}
                            label={loadMode === 'point' ? 'Point Load' : 'Distributed Load'}
                            color={loadDirection === 'down' ? "text-red-500" : "text-yellow-400"}
                        />
                    </div>
                </div>

                    {/* Main Canvas Area - Enhanced */}
                    <div 
                        className="flex-1 min-h-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-auto transition-all duration-300 relative"
                    >
                    {props.error ? (
                        <div className="h-full flex items-center justify-center p-8">
                            <div className="text-center p-10 bg-slate-900/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-red-500/30 max-w-lg animate-in fade-in-50 duration-300">
                                <div className="p-4 bg-red-500/10 rounded-full w-fit mx-auto mb-6">
                                    <AlertCircle size={48} className="text-red-400" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-100 mb-3">Calculation Error</h3>
                                <p className="text-sm text-slate-400 leading-relaxed">{props.error}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full relative">
                            {/* Canvas Background Pattern */}
                            <div className="absolute inset-0 opacity-5 pointer-events-none">
                                <div className="absolute inset-0" style={{
                                    backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
                                    backgroundSize: '20px 20px'
                                }}></div>
                            </div>
                            
                            {/* Interactive Canvas - Always Visible */}
                            <div 
                                className="h-full overflow-auto custom-scrollbar"
                                onWheel={(e) => {
                                    if (e.ctrlKey || e.metaKey) {
                                        e.preventDefault();
                                        const delta = -e.deltaY * 0.01;
                                        handleZoom(delta, 'canvas');
                                    }
                                }}
                            >
                                <div style={{ 
                                    transform: `scale(${canvasZoom})`,
                                    transformOrigin: 'top left',
                                    transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}>
                                    <InteractiveCanvas
                                        length={props.length}
                                        supports={props.supports}
                                        loads={props.loads}
                                        activeTool={activeTool}
                                        loadMode={loadMode}
                                        loadMag={loadMag}
                                        loadDirection={loadDirection}
                                        loadCategory={loadCategory}
                                        gridSnap={gridSnap}
                                        showGrid={showGrid}
                                        distributedStartPos={distributedStartPos}
                                        setDistributedStartPos={setDistributedStartPos}
                                        onAddSupport={props.addSupport}
                                        onRemoveSupport={props.removeSupport}
                                        onAddLoad={props.addLoad}
                                        onRemoveLoad={props.removeLoad}
                                        onUpdateLoadCategory={props.updateLoadCategory}
                                        results={props.results}
                                    />
                                </div>
                            </div>
                            
                            {/* Canvas Info Overlay */}
                            {!props.results && (
                                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl shadow-lg">
                                    <div className="flex items-center gap-4 text-xs text-slate-400">
                                        <span className="font-semibold">Grid Snap: {gridSnap}m</span>
                                        <span>•</span>
                                        <span>Zoom: {Math.round(canvasZoom * 100)}%</span>
                                        {activeTool !== 'select' && (
                                            <>
                                                <span>•</span>
                                                <span className="text-orange-400 font-semibold animate-pulse">
                                                    {activeTool === 'pin' && 'Click to add Pin Support'}
                                                    {activeTool === 'roller' && 'Click to add Roller Support'}
                                                    {activeTool === 'fixed' && 'Click to add Fixed Support'}
                                                    {activeTool === 'load' && loadMode === 'point' && `Click to add ${loadMag}kN Point Load`}
                                                    {activeTool === 'load' && loadMode === 'distributed' && distributedStartPos === null && `Click to set start position (${loadMag}kN/m)`}
                                                    {activeTool === 'load' && loadMode === 'distributed' && distributedStartPos !== null && 'Click to set end position'}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    </div>
                </div>

                {/* Results Panel - Below Editor */}
                {props.results && diagramData && (
                    <>
                        {/* Resize Handle - Horizontal */}
                        {showResultsPanel && (
                            <div
                                ref={resizeRef}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    setIsResizing(true);
                                }}
                                className={`h-2 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 hover:from-slate-600 hover:via-slate-500 hover:to-slate-600 cursor-row-resize z-20 transition-all group ${
                                    isResizing ? 'bg-slate-500 h-3' : ''
                                }`}
                            >
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-1 w-12 bg-slate-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </div>
                        )}

                        {/* Results Panel - Enhanced */}
                        <div
                            className={`bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-t border-slate-800/50 shadow-2xl overflow-hidden transition-all duration-300 z-10 ${
                                showResultsPanel ? 'opacity-100' : 'opacity-0 pointer-events-none h-0'
                            }`}
                            style={{ 
                                height: showResultsPanel ? `${resultsPanelHeight}px` : '0px'
                            }}
                        >
                            <div className="h-full flex flex-col">
                                {/* Panel Header - Enhanced */}
                                <div className="flex items-center justify-between p-5 border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                                            <CheckCircle2 size={18} className="text-emerald-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-slate-100 font-bold text-base">Analysis Results</h3>
                                            <p className="text-xs text-slate-500 mt-0.5">Structural analysis output</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 px-2 py-1.5 bg-slate-800/60 rounded-lg border border-slate-700/50">
                                            <button
                                                onClick={() => handleZoom(-0.1, 'diagram')}
                                                className="p-1.5 rounded-md text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-all"
                                                title="Zoom Out"
                                            >
                                                <ZoomOut size={14} />
                                            </button>
                                            <span className="text-xs text-slate-500 px-1 font-mono font-semibold min-w-[2.5rem] text-center">{Math.round(diagramZoom * 100)}%</span>
                                            <button
                                                onClick={() => handleZoom(0.1, 'diagram')}
                                                className="p-1.5 rounded-md text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-all"
                                                title="Zoom In"
                                            >
                                                <ZoomIn size={14} />
                                            </button>
                                            <button
                                                onClick={() => resetZoom('diagram')}
                                                className="p-1.5 rounded-md text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-all"
                                                title="Reset Zoom"
                                            >
                                                <Maximize2 size={14} />
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => setShowResultsPanel(!showResultsPanel)}
                                            className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all border border-slate-700/50"
                                            title={showResultsPanel ? "Hide Results" : "Show Results"}
                                        >
                                            {showResultsPanel ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Panel Content - Enhanced */}
                                <div 
                                    className="flex-1 overflow-auto p-6 custom-scrollbar bg-slate-950/50"
                                    onWheel={(e) => {
                                        if (e.ctrlKey || e.metaKey) {
                                            e.preventDefault();
                                            const delta = -e.deltaY * 0.01;
                                            handleZoom(delta, 'diagram');
                                        }
                                    }}
                                >
                                    <div style={{ 
                                        transform: `scale(${diagramZoom})`, 
                                        transformOrigin: 'top left',
                                        transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }}>
                                        <IntegratedDiagrams
                                            results={props.results}
                                            length={props.length}
                                            nodes={props.nodes}
                                            supports={props.supports}
                                            loads={props.processedLoads}
                                            material={props.material}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Toggle Button - When Results Panel is Hidden - Enhanced */}
                {props.results && diagramData && !showResultsPanel && (
                    <button
                        onClick={() => setShowResultsPanel(true)}
                        className="absolute bottom-6 right-6 p-4 bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 border border-slate-700/50 rounded-xl shadow-xl text-slate-300 hover:text-white transition-all z-30 group backdrop-blur-sm"
                        title="Show Results Panel"
                    >
                        <ChevronUp size={22} />
                        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-3 py-2 bg-slate-800/95 backdrop-blur-sm border border-slate-700/50 text-xs font-semibold text-slate-200 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none shadow-lg">
                            Show Results
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 border-t border-l border-slate-700/50 rotate-45"></div>
                        </div>
                    </button>
                )}
            </div>
        </div>
    );
};

const ToolButton = ({ 
    active, 
    onClick, 
    icon, 
    label, 
    color = "text-slate-400" 
}: { 
    active: boolean; 
    onClick: () => void; 
    icon: React.ReactNode; 
    label: string; 
    color?: string;
}) => (
    <button
        onClick={onClick}
        className={`
            w-14 h-14 rounded-xl flex items-center justify-center transition-all relative group
            ${active
                ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 scale-105'
                : 'bg-slate-800/60 hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 border border-slate-700/50 hover:border-slate-600 hover:scale-105'
            }
        `}
        title={label}
    >
        <div className={`${active ? 'text-white' : color} transition-colors`}>{icon}</div>
        {/* Enhanced Tooltip */}
        <span className="absolute left-full ml-3 px-3 py-2 bg-slate-800/95 backdrop-blur-sm border border-slate-700/50 text-slate-200 text-xs font-semibold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl transition-all duration-200">
            {label}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-slate-800 border-l border-b border-slate-700/50 rotate-45"></div>
        </span>
    </button>
);
