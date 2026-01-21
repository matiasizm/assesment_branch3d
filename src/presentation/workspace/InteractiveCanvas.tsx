import React, { useRef, useState } from 'react';
import type { SupportType } from '../../core/entities/Node';
import type { LoadType, LoadCategory } from '../../core/entities/Load';
import type { AnalysisResults } from '../../core/logic/FemSolver';

interface InteractiveCanvasProps {
    length: number;
    supports: { id: string, x: number, type: SupportType }[];
    loads: any[];
    activeTool: string;
    loadMode: 'point' | 'distributed';
    loadMag: number;
    loadDirection: 'up' | 'down';
    loadCategory: LoadCategory;
    gridSnap: number;
    showGrid: boolean;
    distributedStartPos: number | null;
    setDistributedStartPos: (pos: number | null) => void;
    onAddSupport: (x: number, type: SupportType) => void;
    onRemoveSupport: (id: string) => void;
    onAddLoad: (type: LoadType, mag: number, x?: number, startX?: number, endX?: number, direction?: 'up' | 'down', category?: LoadCategory) => void;
    onRemoveLoad: (id: string) => void;
    onUpdateLoadCategory?: (id: string, category: LoadCategory) => void;
    results: AnalysisResults | null;
}

export const InteractiveCanvas: React.FC<InteractiveCanvasProps> = ({
    length,
    supports,
    loads,
    activeTool,
    loadMode,
    loadMag,
    loadDirection,
    loadCategory,
    gridSnap,
    showGrid,
    distributedStartPos,
    setDistributedStartPos,
    onAddSupport,
    onRemoveSupport,
    onAddLoad,
    onRemoveLoad,
    onUpdateLoadCategory,
    results
}) => {
    const [hoverPosition, setHoverPosition] = useState<{ x: number, snapped: number } | null>(null);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const width = 1000;
    const height = 300;
    const paddingX = 80;
    const beamY = 150;

    const metersToPx = (m: number) => (m / length) * (width - paddingX * 2) + paddingX;
    const pxToMeters = (px: number) => {
        const raw = ((px - paddingX) / (width - paddingX * 2)) * length;
        const snapped = Math.round(raw / gridSnap) * gridSnap;
        return Math.max(0, Math.min(length, snapped));
    };

    const handleCanvasClick = (e: React.MouseEvent) => {
        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const xPx = e.clientX - rect.left;
        const xM = pxToMeters(xPx);

        if (activeTool === 'pin') {
            onAddSupport(xM, 'Pin');
            return;
        }
        if (activeTool === 'roller') {
            onAddSupport(xM, 'Roller');
            return;
        }
        if (activeTool === 'fixed') {
            onAddSupport(xM, 'Fixed');
            return;
        }
        
        if (activeTool === 'load') {
            if (loadMode === 'point') {
                onAddLoad('PointForce', loadMag, xM, undefined, undefined, loadDirection, loadCategory);
            } else {
                if (distributedStartPos === null) {
                    setDistributedStartPos(xM);
                } else {
                    const startX = Math.min(distributedStartPos, xM);
                    const endX = Math.max(distributedStartPos, xM);
                    if (endX > startX) {
                        onAddLoad('DistributedForce', loadMag, undefined, startX, endX, loadDirection, loadCategory);
                    }
                    setDistributedStartPos(null);
                }
            }
        }
    };

    return (
        <div className="flex-1 min-h-0 bg-slate-950 border-b border-slate-700 relative overflow-auto">
            <div className="p-8">
                <svg
                    ref={svgRef}
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full h-auto cursor-crosshair"
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
                    {/* Grid */}
                    {showGrid && Array.from({ length: Math.floor(length / gridSnap) + 1 }).map((_, i) => {
                        const x = i * gridSnap;
                        if (x > length) return null;
                        const xPx = metersToPx(x);
                        const isMajor = (x % (gridSnap * 5) === 0) || x === 0 || Math.abs(x - length) < 0.01;
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
                                    opacity="0.5"
                                />
                            </g>
                        );
                    })}

                    {/* Beam - SAP2000 Style: Black */}
                    <line
                        x1={paddingX}
                        y1={beamY}
                        x2={width - paddingX}
                        y2={beamY}
                        stroke="#000000"
                        strokeWidth="5"
                        strokeLinecap="round"
                    />
                    <line
                        x1={paddingX}
                        y1={beamY}
                        x2={width - paddingX}
                        y2={beamY}
                        stroke="#1a1a1a"
                        strokeWidth="3"
                        strokeLinecap="round"
                    />

                    {/* Supports - SAP2000 Style: Black with Yellow highlights */}
                    {supports.map(s => {
                        const x = metersToPx(s.x);
                        return (
                            <g key={s.id} onClick={(e) => { e.stopPropagation(); onRemoveSupport(s.id); }} className="cursor-pointer hover:opacity-90 transition-opacity group/support">
                                {s.type === 'Pin' ? (
                                    <>
                                        <path d={`M ${x} ${beamY} l -10 20 h 20 z`} fill="#000000" stroke="#fbbf24" strokeWidth="2.5" />
                                        <path d={`M ${x} ${beamY} l -8 16 h 16 z`} fill="#1a1a1a" />
                                    </>
                                ) : s.type === 'Roller' ? (
                                    <>
                                        <circle cx={x} cy={beamY + 10} r="9" fill="#000000" stroke="#fbbf24" strokeWidth="2.5" />
                                        <circle cx={x} cy={beamY + 10} r="7" fill="#1a1a1a" />
                                        <line x1={x - 9} y1={beamY + 19} x2={x + 9} y2={beamY + 19} stroke="#fbbf24" strokeWidth="2.5" />
                                    </>
                                ) : s.type === 'Fixed' ? (
                                    <>
                                        <rect x={x - 8} y={beamY} width="16" height="25" fill="#000000" stroke="#fbbf24" strokeWidth="2.5" />
                                        <rect x={x - 6} y={beamY + 2} width="12" height="21" fill="#1a1a1a" />
                                        <line x1={x - 6} y1={beamY + 5} x2={x - 2} y2={beamY + 15} stroke="#fbbf24" strokeWidth="2" />
                                        <line x1={x + 2} y1={beamY + 5} x2={x + 6} y2={beamY + 15} stroke="#fbbf24" strokeWidth="2" />
                                    </>
                                ) : null}
                                <text x={x} y={beamY - 18} textAnchor="middle" fill="#fbbf24" fontSize="10" fontFamily="monospace" fontWeight="bold" className="opacity-0 group-hover/support:opacity-100 transition-opacity">
                                    {s.x.toFixed(2)}m
                                </text>
                            </g>
                        );
                    })}

                    {/* Loads - SAP2000 Style: Red (downward), Yellow (upward) */}
                    {loads.map(l => {
                        const isDownward = l.magnitude < 0;
                        const loadColor = isDownward ? "#dc2626" : "#fbbf24"; // Red for down, Yellow for up (SAP2000 style)
                        const loadStroke = isDownward ? "#991b1b" : "#d97706"; // Darker outline
                        const arrowY1 = isDownward ? beamY - 50 : beamY + 50;
                        const arrowY2 = isDownward ? beamY - 5 : beamY + 5;
                        const arrowTipY = isDownward ? beamY - 10 : beamY + 10;
                        const labelY = isDownward ? beamY - 65 : beamY + 75;
                        
                        if (l.type === 'PointForce' && typeof l.x === 'number') {
                            const x = metersToPx(l.x);
                            const category = l.category || 'Live';
                            const categoryColor = category === 'Dead' ? '#64748b' : '#3b82f6';
                            return (
                                <g key={l.id} className="cursor-pointer hover:opacity-90 group/load">
                                    <line x1={x} y1={arrowY1} x2={x} y2={arrowY2} stroke={loadColor} strokeWidth="4" />
                                    <line x1={x} y1={arrowY1} x2={x} y2={arrowY2} stroke={loadStroke} strokeWidth="2" opacity="0.5" />
                                    <path d={`M ${x-7} ${arrowTipY} L ${x} ${beamY} L ${x+7} ${arrowTipY}`} fill={loadColor} stroke={loadStroke} strokeWidth="1" />
                                    <rect x={x - 32} y={labelY - 11} width="64" height="22" rx="4" fill={loadColor} opacity="0.95" stroke={loadStroke} strokeWidth="1.5" />
                                    <text x={x} y={labelY + 3} textAnchor="middle" fill={isDownward ? "white" : "#000000"} fontSize="11" fontWeight="bold">
                                        {Math.abs(l.magnitude)}kN
                                    </text>
                                    {/* Category badge */}
                                    <rect x={x - 10} y={labelY - 25} width="20" height="12" rx="2" fill={categoryColor} opacity="0.9" className="opacity-0 group-hover/load:opacity-100 transition-opacity" />
                                    <text x={x} y={labelY - 17} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" className="opacity-0 group-hover/load:opacity-100 transition-opacity">
                                        {category === 'Dead' ? 'D' : category === 'Live' ? 'L' : category[0]}
                                    </text>
                                    {/* Category toggle on click */}
                                    {onUpdateLoadCategory && (
                                        <rect 
                                            x={x - 10} 
                                            y={labelY - 25} 
                                            width="20" 
                                            height="12" 
                                            rx="2" 
                                            fill="transparent" 
                                            className="opacity-0 group-hover/load:opacity-100 cursor-pointer"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onUpdateLoadCategory(l.id, category === 'Dead' ? 'Live' : 'Dead');
                                            }}
                                        />
                                    )}
                                </g>
                            );
                        } else if (l.type === 'DistributedForce' && typeof l.startX === 'number' && typeof l.endX === 'number') {
                            const startX = metersToPx(l.startX);
                            const endX = metersToPx(l.endX);
                            const category = l.category || 'Live';
                            const categoryColor = category === 'Dead' ? '#64748b' : '#3b82f6';
                            const arrowSpacing = 40;
                            const arrows = [];
                            for (let x = startX; x <= endX; x += arrowSpacing) {
                                arrows.push(x);
                            }
                            if (arrows[arrows.length - 1] !== endX) arrows.push(endX);
                            return (
                                <g key={l.id} className="cursor-pointer hover:opacity-90 group/load">
                                    {arrows.map((x, i) => (
                                        <g key={i}>
                                            <line x1={x} y1={arrowY1} x2={x} y2={arrowY2} stroke={loadColor} strokeWidth="3" />
                                            <line x1={x} y1={arrowY1} x2={x} y2={arrowY2} stroke={loadStroke} strokeWidth="1.5" opacity="0.5" />
                                            <path d={`M ${x-5} ${arrowTipY} L ${x} ${beamY} L ${x+5} ${arrowTipY}`} fill={loadColor} stroke={loadStroke} strokeWidth="1" />
                                        </g>
                                    ))}
                                    <line x1={startX} y1={arrowY2} x2={endX} y2={arrowY2} stroke={loadColor} strokeWidth="3" />
                                    <line x1={startX} y1={arrowY2} x2={endX} y2={arrowY2} stroke={loadStroke} strokeWidth="1.5" opacity="0.5" />
                                    <rect x={(startX + endX) / 2 - 35} y={labelY - 9} width="70" height="18" rx="3" fill={loadColor} opacity="0.95" stroke={loadStroke} strokeWidth="1" />
                                    <text x={(startX + endX) / 2} y={labelY + 2} textAnchor="middle" fill={isDownward ? "white" : "#000000"} fontSize="10" fontWeight="bold">
                                        {Math.abs(l.magnitude)} kN/m
                                    </text>
                                    {/* Category badge */}
                                    <rect x={(startX + endX) / 2 - 10} y={labelY - 23} width="20" height="12" rx="2" fill={categoryColor} opacity="0.9" className="opacity-0 group-hover/load:opacity-100 transition-opacity" />
                                    <text x={(startX + endX) / 2} y={labelY - 15} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" className="opacity-0 group-hover/load:opacity-100 transition-opacity">
                                        {category === 'Dead' ? 'D' : category === 'Live' ? 'L' : category[0]}
                                    </text>
                                    {/* Category toggle on click */}
                                    {onUpdateLoadCategory && (
                                        <rect 
                                            x={(startX + endX) / 2 - 10} 
                                            y={labelY - 23} 
                                            width="20" 
                                            height="12" 
                                            rx="2" 
                                            fill="transparent" 
                                            className="opacity-0 group-hover/load:opacity-100 cursor-pointer"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onUpdateLoadCategory(l.id, category === 'Dead' ? 'Live' : 'Dead');
                                            }}
                                        />
                                    )}
                                </g>
                            );
                        }
                        return null;
                    })}

                    {/* Hover Indicator - SAP2000 Style: Yellow */}
                    {hoverPosition && activeTool !== 'select' && (
                        <g>
                            <line
                                x1={hoverPosition.x}
                                y1={paddingX}
                                x2={hoverPosition.x}
                                y2={height - paddingX}
                                stroke="#fbbf24"
                                strokeWidth="2"
                                strokeDasharray="4,4"
                                opacity="0.8"
                            />
                            <circle cx={hoverPosition.x} cy={beamY} r="6" fill="#fbbf24" opacity="0.9" stroke="#d97706" strokeWidth="1.5" />
                            <rect x={hoverPosition.x - 30} y={beamY - 35} width="60" height="18" rx="4" fill="#fbbf24" opacity="0.95" stroke="#d97706" strokeWidth="1" />
                            <text x={hoverPosition.x} y={beamY - 22} textAnchor="middle" fill="#000000" fontSize="10" fontFamily="monospace" fontWeight="bold">
                                {hoverPosition.snapped.toFixed(2)}m
                            </text>
                        </g>
                    )}

                    {/* Distributed Load Placement Indicator */}
                    {activeTool === 'load' && loadMode === 'distributed' && distributedStartPos !== null && hoverPosition && (
                        <g>
                            <line
                                x1={metersToPx(distributedStartPos)}
                                y1={beamY - 50}
                                x2={hoverPosition.x}
                                y2={beamY - 50}
                                stroke="#f97316"
                                strokeWidth="2"
                                strokeDasharray="4,4"
                                opacity="0.6"
                            />
                            <rect
                                x={Math.min(metersToPx(distributedStartPos), hoverPosition.x) - 40}
                                y={beamY - 70}
                                width="80"
                                height="18"
                                rx="4"
                                fill="#f97316"
                                opacity="0.8"
                            />
                            <text
                                x={(metersToPx(distributedStartPos) + hoverPosition.x) / 2}
                                y={beamY - 58}
                                textAnchor="middle"
                                fill="white"
                                fontSize="10"
                                fontFamily="monospace"
                            >
                                {Math.abs(distributedStartPos - hoverPosition.snapped).toFixed(2)}m
                            </text>
                        </g>
                    )}

                    {/* Position Labels */}
                    <text x={paddingX} y={beamY + 30} fill="#94a3b8" fontSize="11" fontFamily="monospace" textAnchor="middle">0</text>
                    <text x={width - paddingX} y={beamY + 30} fill="#94a3b8" fontSize="11" fontFamily="monospace" textAnchor="middle">{length.toFixed(1)}m</text>
                </svg>
            </div>
        </div>
    );
};
