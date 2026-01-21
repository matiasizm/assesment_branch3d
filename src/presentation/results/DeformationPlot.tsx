import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Waves } from 'lucide-react';

interface DiagramPoint {
    x: number;
    value: number;
}

interface DeformationPlotProps {
    deformation: DiagramPoint[];
    length: number;
}

export const DeformationPlot: React.FC<DeformationPlotProps> = ({ deformation, length }) => {
    const chartData = deformation.map(d => ({
        x: d.x.toFixed(2),
        'Deformation (m)': (d.value * 1000).toFixed(3), // Convert to mm
        'Original Position': 0
    }));

    const maxDeflection = Math.max(...deformation.map(d => Math.abs(d.value)));
    const maxDeflectionPos = deformation.find(d => Math.abs(d.value) === maxDeflection)?.x || 0;

    return (
        <div className="h-full flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-cyan-400 font-bold text-xs tracking-[0.2em] uppercase flex items-center gap-2">
                    <Waves size={16} />
                    Deformation Profile
                </h3>
                <div className="flex gap-4 text-xs text-slate-500">
                    <span className="font-mono">
                        Max Deflection: {(maxDeflection * 1000).toFixed(3)} mm
                    </span>
                    <span className="font-mono">
                        at x = {maxDeflectionPos.toFixed(2)} m
                    </span>
                </div>
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-0 bg-slate-800/40 backdrop-blur rounded-xl border border-white/5 p-4">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
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
                            label={{ value: 'Deflection (mm)', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: '10px' } }}
                        />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: '#1e293b', 
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                color: '#e2e8f0'
                            }}
                            labelStyle={{ color: '#94a3b8' }}
                            formatter={(value: string) => [`${value} mm`, 'Deflection']}
                        />
                        <ReferenceLine y={0} stroke="#64748b" strokeDasharray="2 2" opacity={0.5} />
                        <Line 
                            type="monotone" 
                            dataKey="Deformation (m)" 
                            stroke="#22d3ee" 
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 5, fill: '#22d3ee' }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Info Panel */}
            <div className="grid grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-800/40 backdrop-blur rounded-lg border border-white/5 p-3">
                    <div className="text-slate-500 mb-1">Maximum Deflection</div>
                    <div className="text-cyan-400 font-mono font-bold text-lg">
                        {(maxDeflection * 1000).toFixed(3)} mm
                    </div>
                </div>
                <div className="bg-slate-800/40 backdrop-blur rounded-lg border border-white/5 p-3">
                    <div className="text-slate-500 mb-1">Location</div>
                    <div className="text-slate-300 font-mono font-bold text-lg">
                        {maxDeflectionPos.toFixed(2)} m
                    </div>
                </div>
                <div className="bg-slate-800/40 backdrop-blur rounded-lg border border-white/5 p-3">
                    <div className="text-slate-500 mb-1">Span Length</div>
                    <div className="text-slate-300 font-mono font-bold text-lg">
                        {length.toFixed(2)} m
                    </div>
                </div>
            </div>
        </div>
    );
};
