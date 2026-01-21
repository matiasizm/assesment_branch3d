import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface DiagramPoint {
    x: number;
    value: number;
}

interface DiagramsProps {
    shearForce: DiagramPoint[];
    bendingMoment: DiagramPoint[];
    length: number;
}

export const Diagrams: React.FC<DiagramsProps> = ({ shearForce, bendingMoment, length }) => {
    // Combinar datos para el gráfico
    const chartData = shearForce.map((sf, i) => ({
        x: sf.x.toFixed(2),
        'Shear Force (kN)': sf.value.toFixed(2),
        'Bending Moment (kNm)': bendingMoment[i]?.value.toFixed(2) || '0.00'
    }));

    const maxShear = Math.max(...shearForce.map(sf => Math.abs(sf.value)));
    const maxMoment = Math.max(...bendingMoment.map(bm => Math.abs(bm.value)));

    return (
        <div className="h-full flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-cyan-400 font-bold text-xs tracking-[0.2em] uppercase flex items-center gap-2">
                    <TrendingUp size={16} />
                    Force & Moment Diagrams
                </h3>
                <div className="flex gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-rose-400 rounded"></div>
                        <span>Shear Force</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-cyan-400 rounded"></div>
                        <span>Bending Moment</span>
                    </div>
                </div>
            </div>

            {/* Charts Container */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Shear Force Diagram */}
                <div className="bg-slate-800/40 backdrop-blur rounded-xl border border-white/5 p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-slate-300 font-semibold text-sm flex items-center gap-2">
                            <TrendingDown size={14} className="text-rose-400" />
                            Shear Force Diagram
                        </h4>
                        <span className="text-xs text-slate-500 font-mono">
                            Max: {maxShear.toFixed(2)} kN
                        </span>
                    </div>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                                <XAxis 
                                    dataKey="x" 
                                    stroke="#64748b"
                                    style={{ fontSize: '10px' }}
                                    label={{ value: 'Position (m)', position: 'insideBottom', offset: -5, style: { fill: '#94a3b8', fontSize: '10px' } }}
                                />
                                <YAxis 
                                    stroke="#64748b"
                                    style={{ fontSize: '10px' }}
                                    label={{ value: 'Force (kN)', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: '10px' } }}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#1e293b', 
                                        border: '1px solid #334155',
                                        borderRadius: '8px',
                                        color: '#e2e8f0'
                                    }}
                                    labelStyle={{ color: '#94a3b8' }}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="Shear Force (kN)" 
                                    stroke="#f43f5e" 
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4, fill: '#f43f5e' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Bending Moment Diagram */}
                <div className="bg-slate-800/40 backdrop-blur rounded-xl border border-white/5 p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-slate-300 font-semibold text-sm flex items-center gap-2">
                            <TrendingUp size={14} className="text-cyan-400" />
                            Bending Moment Diagram
                        </h4>
                        <span className="text-xs text-slate-500 font-mono">
                            Max: {maxMoment.toFixed(2)} kNm
                        </span>
                    </div>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                                <XAxis 
                                    dataKey="x" 
                                    stroke="#64748b"
                                    style={{ fontSize: '10px' }}
                                    label={{ value: 'Position (m)', position: 'insideBottom', offset: -5, style: { fill: '#94a3b8', fontSize: '10px' } }}
                                />
                                <YAxis 
                                    stroke="#64748b"
                                    style={{ fontSize: '10px' }}
                                    label={{ value: 'Moment (kNm)', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: '10px' } }}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#1e293b', 
                                        border: '1px solid #334155',
                                        borderRadius: '8px',
                                        color: '#e2e8f0'
                                    }}
                                    labelStyle={{ color: '#94a3b8' }}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="Bending Moment (kNm)" 
                                    stroke="#22d3ee" 
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4, fill: '#22d3ee' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};
