import React, { useState, useMemo } from 'react';
import type { AnalysisResults } from '../../core/logic/FemSolver';
import type { DiagramViewMode, DiagramPoint } from '../../core/services/DiagramCalculator';
import { DiagramCalculator } from '../../core/services/DiagramCalculator';
import { BeamAnalysisService } from '../../core/services/BeamAnalysisService';
import type { Node } from '../../core/entities/Node';
import type { Load } from '../../core/entities/Load';
import type { SupportType } from '../../core/entities/Node';

interface IntegratedDiagramsProps {
    results: AnalysisResults;
    length: number;
    nodes: Node[];
    supports: Array<{ id: string, x: number, type: string }>;
    loads: Load[];
    material: { E: number, I: number };
}

type DiagramType = 'deflection' | 'sfd' | 'bmd' | 'reactions';

export const IntegratedDiagrams: React.FC<IntegratedDiagramsProps> = ({
    results,
    length,
    nodes,
    supports,
    loads,
    material
}) => {
    const [activeDiagram, setActiveDiagram] = useState<DiagramType>('deflection');
    const [viewMode, setViewMode] = useState<DiagramViewMode>('dead');
    const [hoverPoint, setHoverPoint] = useState<{ x: number, y: number, value: number, position: number } | null>(null);
    const svgRef = React.useRef<SVGSVGElement>(null);

    // Calculate reactions based on view mode (only Dead or Live, no superposition)
    const filteredReactions = useMemo(() => {
        if (!results || nodes.length === 0) return results?.reactions || {};
        
        try {
            // Filter loads by category and recalculate
            const filteredLoads = loads.filter(l => 
                viewMode === 'dead' ? l.category === 'Dead' : l.category === 'Live'
            );
            
            if (filteredLoads.length === 0) {
                // No loads of this category, return empty reactions
                return {};
            }
            
            const filteredInput = {
                length,
                E: material.E,
                I: material.I,
                supports: supports.map(s => ({ x: s.x, type: s.type as SupportType })),
                loads: filteredLoads.map(l => ({
                    id: l.id,
                    type: l.type,
                    magnitude: (l as any).magnitude,
                    x: (l as any).x,
                    startX: (l as any).startX,
                    endX: (l as any).endX,
                    category: l.category
                }))
            };
            const filteredResults = BeamAnalysisService.analyze(filteredInput);
            return filteredResults.reactions;
        } catch (err) {
            console.error('Error calculating filtered reactions:', err);
            return results.reactions;
        }
    }, [results, length, nodes, supports, loads, viewMode, material]);

    // Calculate diagrams based on view mode (only Dead or Live, no superposition)
    const diagramData = useMemo(() => {
        if (!results || nodes.length === 0) return null;
        try {
            // Single category view only
            return DiagramCalculator.calculateDiagrams(
                length,
                nodes,
                loads,
                filteredReactions,
                results.displacements,
                200,
                viewMode,
                viewMode === 'dead' ? ['Dead'] : ['Live']
            );
        } catch (err) {
            console.error('Error calculating diagrams:', err);
            return null;
        }
    }, [results, length, nodes, loads, viewMode, filteredReactions]);

    // Canvas dimensions
    const width = 800;
    const height = 500;
    const paddingX = 60;
    const paddingY = 40;
    const beamY = 150;
    const diagramHeight = 200;
    const diagramY = beamY + 80;

    const metersToPx = (m: number) => (m / length) * (width - paddingX * 2) + paddingX;
    const pxToMeters = (px: number) => ((px - paddingX) / (width - paddingX * 2)) * length;

    // Calculate scales - handle null diagramData
    const maxDeflection = diagramData ? Math.max(...diagramData.deformation.map((d: DiagramPoint) => Math.abs(d.value))) : 0;
    const maxShear = diagramData ? Math.max(...diagramData.shearForce.map((sf: DiagramPoint) => Math.abs(sf.value))) : 0;
    const maxMoment = diagramData ? Math.max(...diagramData.bendingMoment.map((bm: DiagramPoint) => Math.abs(bm.value))) : 0;
    
    const deflectionScale = maxDeflection > 0 ? (diagramHeight * 0.4) / maxDeflection : 1;
    const shearScale = maxShear > 0 ? (diagramHeight * 0.4) / maxShear : 1;
    const momentScale = maxMoment > 0 ? (diagramHeight * 0.4) / maxMoment : 1;

    // Generate diagram paths - handle null diagramData
    const generateDeflectionPath = () => {
        if (!diagramData) return '';
        let path = '';
        diagramData.deformation.forEach((point: DiagramPoint, i: number) => {
            const x = metersToPx(point.x);
            const y = diagramY - (point.value * deflectionScale);
            path += `${i === 0 ? 'M' : 'L'} ${x} ${y} `;
        });
        return path;
    };

    const generateShearPath = () => {
        if (!diagramData) return '';
        let path = '';
        const zeroY = diagramY;
        diagramData.shearForce.forEach((point: DiagramPoint, i: number) => {
            const x = metersToPx(point.x);
            const y = zeroY - (point.value * shearScale);
            path += `${i === 0 ? 'M' : 'L'} ${x} ${y} `;
        });
        return path;
    };

    const generateMomentPath = () => {
        if (!diagramData) return '';
        let path = '';
        const zeroY = diagramY;
        diagramData.bendingMoment.forEach((point: DiagramPoint, i: number) => {
            const x = metersToPx(point.x);
            // Invert moment diagram: positive moments go upward, negative downward
            const y = zeroY + (point.value * momentScale);
            path += `${i === 0 ? 'M' : 'L'} ${x} ${y} `;
        });
        return path;
    };

    const generateShearFill = () => {
        if (!diagramData) return '';
        const zeroY = diagramY;
        let path = generateShearPath();
        const lastPoint = diagramData.shearForce[diagramData.shearForce.length - 1] as DiagramPoint;
        const lastX = metersToPx(lastPoint.x);
        path += `L ${lastX} ${zeroY} L ${metersToPx(0)} ${zeroY} Z`;
        return path;
    };

    const generateMomentFill = () => {
        if (!diagramData) return '';
        const zeroY = diagramY;
        let path = generateMomentPath();
        const lastPoint = diagramData.bendingMoment[diagramData.bendingMoment.length - 1] as DiagramPoint;
        const lastX = metersToPx(lastPoint.x);
        path += `L ${lastX} ${zeroY} L ${metersToPx(0)} ${zeroY} Z`;
        return path;
    };

    // Find closest data point to mouse position
    const findClosestPoint = (mouseX: number, mouseY: number) => {
        if (!svgRef.current) return null;
        
        const rect = svgRef.current.getBoundingClientRect();
        const svgX = ((mouseX - rect.left) / rect.width) * width;
        const svgY = ((mouseY - rect.top) / rect.height) * height;
        
        // Only show tooltip if mouse is over diagram area
        if (svgX < paddingX || svgX > width - paddingX) return null;
        if (svgY < diagramY - diagramHeight || svgY > diagramY + 20) return null;
        
        const xMeters = pxToMeters(svgX);
        
        if (!diagramData) return null;
        
        let dataPoints: Array<{ x: number, value: number }> = [];
        let scale = 1;
        let zeroY = diagramY;
        
        if (activeDiagram === 'deflection') {
            dataPoints = diagramData.deformation;
            scale = deflectionScale;
        } else if (activeDiagram === 'sfd') {
            dataPoints = diagramData.shearForce;
            scale = shearScale;
        } else if (activeDiagram === 'bmd') {
            dataPoints = diagramData.bendingMoment;
            scale = momentScale;
        } else {
            return null; // No tooltip for reactions
        }
        
        // Find closest point
        let closest = dataPoints[0];
        let minDist = Math.abs(closest.x - xMeters);
        
        for (const point of dataPoints) {
            const dist = Math.abs(point.x - xMeters);
            if (dist < minDist) {
                minDist = dist;
                closest = point;
            }
        }
        
        const pointX = metersToPx(closest.x);
        // Moment diagram is inverted (positive moments go upward), others go downward
        const pointY = activeDiagram === 'bmd' 
            ? zeroY + (closest.value * scale)  // Inverted for moment
            : zeroY - (closest.value * scale); // Normal for deflection and shear
        
        return {
            x: pointX,
            y: pointY,
            value: closest.value,
            position: closest.x
        };
    };

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        const point = findClosestPoint(e.clientX, e.clientY);
        setHoverPoint(point);
    };

    const handleMouseLeave = () => {
        setHoverPoint(null);
    };

    if (!diagramData) {
        return (
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700/50 p-8 max-w-6xl mx-auto text-center text-slate-400">
                <p>Calculating diagrams...</p>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700/50 p-8 max-w-6xl mx-auto">
            <div className="mb-8">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-slate-100 text-2xl font-bold mb-2">Structural Analysis</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Interactive diagrams showing deflection, shear force, bending moment, and support reactions.
                        </p>
                    </div>
                </div>
                
                {/* Load Category View Mode - Show for all diagrams (Dead or Live only) */}
                <div className="mb-4 flex items-center gap-3">
                    <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">View Mode:</span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setViewMode('dead')}
                            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                                viewMode === 'dead'
                                    ? 'bg-slate-600 text-white shadow-md'
                                    : 'bg-slate-700/60 text-slate-400 hover:bg-slate-600/80'
                            }`}
                        >
                            Dead (D)
                        </button>
                        <button
                            onClick={() => setViewMode('live')}
                            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                                viewMode === 'live'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-slate-700/60 text-slate-400 hover:bg-slate-600/80'
                            }`}
                        >
                            Live (L)
                        </button>
                    </div>
                </div>
                
                {/* Diagram Type Buttons - Enhanced */}
                <div className="flex gap-3 flex-wrap">
                    {(['deflection', 'sfd', 'bmd', 'reactions'] as DiagramType[]).map((type) => {
                        const colors = {
                            deflection: { bg: 'bg-purple-500', hover: 'hover:bg-purple-600', shadow: 'shadow-purple-500/30', text: 'text-purple-400' },
                            sfd: { bg: 'bg-rose-500', hover: 'hover:bg-rose-600', shadow: 'shadow-rose-500/30', text: 'text-rose-400' },
                            bmd: { bg: 'bg-amber-500', hover: 'hover:bg-amber-600', shadow: 'shadow-amber-500/30', text: 'text-amber-400' },
                            reactions: { bg: 'bg-cyan-500', hover: 'hover:bg-cyan-600', shadow: 'shadow-cyan-500/30', text: 'text-cyan-400' }
                        };
                        const colorScheme = colors[type];
                        return (
                            <button
                                key={type}
                                onClick={() => setActiveDiagram(type)}
                                className={`px-6 py-3 text-sm font-bold rounded-xl transition-all ${
                                    activeDiagram === type
                                        ? `${colorScheme.bg} text-white shadow-lg ${colorScheme.shadow} scale-105`
                                        : 'bg-slate-700/60 text-slate-300 hover:bg-slate-600/80 border border-slate-600/50'
                                }`}
                            >
                                {type === 'deflection' ? 'Deflection' : 
                                 type === 'sfd' ? 'Shear Force (SFD)' : 
                                 type === 'bmd' ? 'Bending Moment (BMD)' : 'Reactions'}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Integrated Canvas - Enhanced */}
            <div className="bg-slate-950/80 backdrop-blur-sm rounded-xl p-6 border border-slate-700/30 relative shadow-inner">
                <svg
                    ref={svgRef}
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full h-auto cursor-crosshair relative z-0"
                    style={{ maxHeight: '500px' }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                >
                    <defs>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                            <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                        {/* Arrowhead marker removed - moments now use HTML/CSS instead of SVG */}
                    </defs>

                    {/* Beam - SAP2000 Style: Black */}
                    <line
                        x1={paddingX}
                        y1={beamY}
                        x2={width - paddingX}
                        y2={beamY}
                        stroke="#000000"
                        strokeWidth="4"
                        strokeLinecap="round"
                    />
                    <line
                        x1={paddingX}
                        y1={beamY}
                        x2={width - paddingX}
                        y2={beamY}
                        stroke="#1a1a1a"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />

                    {/* Supports - SAP2000 Style: Black with Yellow highlights */}
                    {/* Completely hide supports in reactions view to avoid visual clutter with large triangles */}
                    {/* Only render supports when NOT viewing reactions - this prevents the large Pin support triangles from appearing */}
                    {activeDiagram !== 'reactions' && Array.isArray(supports) && supports.length > 0 && supports.map(s => {
                        const x = metersToPx(s.x);
                        if (s.type === 'Pin') {
                            return (
                                <g key={s.id}>
                                    <path
                                        d={`M ${x} ${beamY} l -10 20 h 20 z`}
                                        fill="#000000"
                                        stroke="#fbbf24"
                                        strokeWidth="2.5"
                                    />
                                    <path
                                        d={`M ${x} ${beamY} l -8 16 h 16 z`}
                                        fill="#1a1a1a"
                                    />
                                </g>
                            );
                        } else if (s.type === 'Roller') {
                            return (
                                <g key={s.id}>
                                    <circle cx={x} cy={beamY + 10} r="8" fill="#000000" stroke="#fbbf24" strokeWidth="2.5" />
                                    <circle cx={x} cy={beamY + 10} r="6" fill="#1a1a1a" />
                                    <line x1={x - 8} y1={beamY + 18} x2={x + 8} y2={beamY + 18} stroke="#fbbf24" strokeWidth="2.5" />
                                </g>
                            );
                        } else if (s.type === 'Fixed') {
                            return (
                                <g key={s.id}>
                                    <rect x={x - 8} y={beamY} width="16" height="20" fill="#000000" stroke="#fbbf24" strokeWidth="2.5" />
                                    <rect x={x - 6} y={beamY + 2} width="12" height="16" fill="#1a1a1a" />
                                    <line x1={x - 6} y1={beamY + 5} x2={x - 2} y2={beamY + 12} stroke="#fbbf24" strokeWidth="2" />
                                    <line x1={x + 2} y1={beamY + 5} x2={x + 6} y2={beamY + 12} stroke="#fbbf24" strokeWidth="2" />
                                </g>
                            );
                        }
                        return null;
                    })}
                    
                    {/* No support symbols in reactions view - only show reaction arrows and values */}

                    {/* Loads - SAP2000 Style: Red (downward), Yellow (upward) */}
                    {/* Hide loads in reactions view to keep the display clean and focused on reactions */}
                    {activeDiagram !== 'reactions' && loads && Array.isArray(loads) && loads.length > 0 && loads.map(l => {
                        const isDownward = l.magnitude < 0;
                        const loadColor = isDownward ? "#dc2626" : "#fbbf24"; // Red for down, Yellow for up
                        const loadStroke = isDownward ? "#991b1b" : "#d97706"; // Darker outline
                        const arrowY1 = isDownward ? beamY - 50 : beamY + 50;
                        const arrowY2 = isDownward ? beamY - 5 : beamY + 5;
                        const arrowTipY = isDownward ? beamY - 10 : beamY + 10;
                        const labelY = isDownward ? beamY - 60 : beamY + 70;
                        
                        if (l.type === 'PointForce') {
                            const pf = l as { x: number, magnitude: number };
                            const x = metersToPx(pf.x);
                            return (
                                <g key={l.id}>
                                    <line x1={x} y1={arrowY1} x2={x} y2={arrowY2} stroke={loadColor} strokeWidth="3" />
                                    <line x1={x} y1={arrowY1} x2={x} y2={arrowY2} stroke={loadStroke} strokeWidth="1.5" opacity="0.5" />
                                    <path d={`M ${x-6} ${arrowTipY} L ${x} ${beamY} L ${x+6} ${arrowTipY}`} fill={loadColor} stroke={loadStroke} strokeWidth="1" />
                                    <rect x={x - 28} y={labelY - 9} width="56" height="18" rx="3" fill={loadColor} opacity="0.95" stroke={loadStroke} strokeWidth="1" />
                                    <text x={x} y={labelY + 2} textAnchor="middle" fill={isDownward ? "white" : "#000000"} fontSize="11" fontWeight="bold">
                                        {Math.abs(pf.magnitude)}kN
                                    </text>
                                </g>
                            );
                        } else if (l.type === 'DistributedForce') {
                            const df = l as { startX: number, endX: number, magnitude: number };
                            const startX = metersToPx(df.startX);
                            const endX = metersToPx(df.endX);
                            const arrowSpacing = 30;
                            const arrows = [];
                            for (let x = startX; x <= endX; x += arrowSpacing) {
                                arrows.push(x);
                            }
                            if (arrows[arrows.length - 1] !== endX) arrows.push(endX);
                            return (
                                <g key={l.id}>
                                    {arrows.map((x, i) => (
                                        <g key={i}>
                                            <line x1={x} y1={arrowY1} x2={x} y2={arrowY2} stroke={loadColor} strokeWidth="2.5" />
                                            <line x1={x} y1={arrowY1} x2={x} y2={arrowY2} stroke={loadStroke} strokeWidth="1.2" opacity="0.5" />
                                            <path d={`M ${x-4} ${arrowTipY} L ${x} ${beamY} L ${x+4} ${arrowTipY}`} fill={loadColor} stroke={loadStroke} strokeWidth="0.8" />
                                        </g>
                                    ))}
                                    <line x1={startX} y1={arrowY2} x2={endX} y2={arrowY2} stroke={loadColor} strokeWidth="2.5" />
                                    <line x1={startX} y1={arrowY2} x2={endX} y2={arrowY2} stroke={loadStroke} strokeWidth="1.2" opacity="0.5" />
                                    <rect x={(startX + endX) / 2 - 32} y={labelY - 8} width="64" height="16" rx="3" fill={loadColor} opacity="0.95" stroke={loadStroke} strokeWidth="0.8" />
                                    <text x={(startX + endX) / 2} y={labelY + 2} textAnchor="middle" fill={isDownward ? "white" : "#000000"} fontSize="10" fontWeight="bold">
                                        {Math.abs(df.magnitude)} kN/m
                                    </text>
                                </g>
                            );
                        }
                        return null;
                    })}

                    {/* Zero line for diagrams */}
                    <line
                        x1={paddingX}
                        y1={diagramY}
                        x2={width - paddingX}
                        y2={diagramY}
                        stroke="#64748b"
                        strokeWidth="1"
                        strokeDasharray="2,2"
                        opacity="0.5"
                    />

                    {/* Diagrams */}
                    {activeDiagram === 'deflection' && (
                        <>
                            <path
                                d={generateDeflectionPath()}
                                fill="none"
                                stroke="#a855f7"
                                strokeWidth="3"
                                filter="url(#glow)"
                            />
                        </>
                    )}

                    {activeDiagram === 'sfd' && (
                        <>
                            <path
                                d={generateShearFill()}
                                fill="#f43f5e"
                                fillOpacity="0.3"
                            />
                            <path
                                d={generateShearPath()}
                                fill="none"
                                stroke="#f43f5e"
                                strokeWidth="2"
                            />
                        </>
                    )}

                    {activeDiagram === 'bmd' && (
                        <>
                            <path
                                d={generateMomentFill()}
                                fill="#f59e0b"
                                fillOpacity="0.3"
                            />
                            <path
                                d={generateMomentPath()}
                                fill="none"
                                stroke="#f59e0b"
                                strokeWidth="2"
                            />
                        </>
                    )}

                    {activeDiagram === 'reactions' && (
                        <>
                            {Object.entries(filteredReactions).map(([nodeId, reaction]) => {
                                const node = nodes.find(n => n.id === nodeId);
                                if (!node || (Math.abs(reaction.fy) < 1e-6 && Math.abs(reaction.m) < 1e-6)) return null;
                                const x = metersToPx(node.x);
                                const reactionColor = "#06b6d4"; // Cyan for reactions
                                return (
                                    <g key={nodeId}>
                                        {reaction.fy !== 0 && (
                                            <>
                                                {/* Inverted reaction arrow: pointing upward (reactions oppose loads) */}
                                                <line x1={x} y1={beamY - 30} x2={x} y2={beamY - 60} stroke={reactionColor} strokeWidth="3" />
                                                <path d={`M ${x-5} ${beamY-55} L ${x} ${beamY-60} L ${x+5} ${beamY-55}`} fill={reactionColor} />
                                                <text x={x} y={beamY - 75} textAnchor="middle" fill={reactionColor} fontSize="12" fontWeight="bold">
                                                    {reaction.fy.toFixed(2)}kN
                                                </text>
                                            </>
                                        )}
                                        {reaction.m !== 0 && (
                                            <>
                                                {/* Simple moment label - just text below the beam */}
                                                <text x={x} y={beamY + 45} textAnchor="middle" fill={reactionColor} fontSize="12" fontWeight="bold">
                                                    {reaction.m > 0 ? '+' : ''}{reaction.m.toFixed(2)} kNm
                                                </text>
                                            </>
                                        )}
                                    </g>
                                );
                            })}
                        </>
                    )}

                    {/* Position labels */}
                    <text x={paddingX} y={beamY + 25} fill="#94a3b8" fontSize="10" textAnchor="middle">0</text>
                    <text x={width - paddingX} y={beamY + 25} fill="#94a3b8" fontSize="10" textAnchor="middle">{length.toFixed(1)}m</text>

                    {/* Hover indicator - crosshair */}
                    {hoverPoint && activeDiagram !== 'reactions' && (
                        <>
                            {/* Vertical line */}
                            <line
                                x1={hoverPoint.x}
                                y1={paddingY}
                                x2={hoverPoint.x}
                                y2={height - paddingY}
                                stroke={activeDiagram === 'deflection' ? '#a855f7' : activeDiagram === 'sfd' ? '#f43f5e' : '#f59e0b'}
                                strokeWidth="1.5"
                                strokeDasharray="4,4"
                                opacity="0.6"
                            />
                            {/* Point marker */}
                            <circle
                                cx={hoverPoint.x}
                                cy={hoverPoint.y}
                                r="5"
                                fill={activeDiagram === 'deflection' ? '#a855f7' : activeDiagram === 'sfd' ? '#f43f5e' : '#f59e0b'}
                                stroke="#fff"
                                strokeWidth="2"
                            />
                        </>
                    )}
                </svg>

                {/* Tooltip - Enhanced */}
                {hoverPoint && activeDiagram !== 'reactions' && (
                    <div
                        className="absolute bg-slate-800/95 backdrop-blur-sm border-2 rounded-xl px-4 py-3 shadow-2xl pointer-events-none z-50"
                        style={{
                            borderColor: activeDiagram === 'deflection' ? '#a855f7' : activeDiagram === 'sfd' ? '#f43f5e' : '#f59e0b',
                            left: `${(hoverPoint.x / width) * 100}%`,
                            top: `${((hoverPoint.y - 50) / height) * 100}%`,
                            transform: 'translate(-50%, -100%)',
                            minWidth: '140px'
                        }}
                    >
                        <div className="text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wider">
                            Position: {hoverPoint.position.toFixed(3)} m
                        </div>
                        <div className="text-base font-bold" style={{ color: activeDiagram === 'deflection' ? '#a855f7' : activeDiagram === 'sfd' ? '#f43f5e' : '#f59e0b' }}>
                            {activeDiagram === 'deflection' && `${(hoverPoint.value * 1000).toFixed(2)} mm`}
                            {activeDiagram === 'sfd' && `${hoverPoint.value.toFixed(2)} kN`}
                            {activeDiagram === 'bmd' && `${hoverPoint.value.toFixed(2)} kNm`}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
