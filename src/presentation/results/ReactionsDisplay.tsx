import React from 'react';
import { ArrowUp, ArrowDown, RotateCw, MapPin } from 'lucide-react';
import type { AnalysisResults } from '../../core/logic/FemSolver';

interface ReactionsDisplayProps {
    reactions: Record<string, { fy: number, m: number }>;
    nodes: Array<{ id: string, x: number }>;
}

export const ReactionsDisplay: React.FC<ReactionsDisplayProps> = ({ reactions, nodes }) => {
    const reactionEntries = Object.entries(reactions)
        .map(([id, reaction]) => {
            const node = nodes.find(n => n.id === id);
            return {
                id,
                x: node?.x || 0,
                ...reaction
            };
        })
        .filter(r => r.fy !== 0 || r.m !== 0)
        .sort((a, b) => a.x - b.x);

    const totalVerticalForce = reactionEntries.reduce((sum, r) => sum + r.fy, 0);
    const totalMoment = reactionEntries.reduce((sum, r) => sum + r.m, 0);

    return (
        <div className="h-full flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-emerald-400 font-bold text-xs tracking-[0.2em] uppercase flex items-center gap-2">
                    <MapPin size={16} />
                    Support Reactions
                </h3>
                <div className="flex gap-4 text-xs text-slate-500">
                    <span className="font-mono">
                        ΣFy = {totalVerticalForce.toFixed(2)} kN
                    </span>
                    <span className="font-mono">
                        ΣM = {totalMoment.toFixed(2)} kNm
                    </span>
                </div>
            </div>

            {/* Reactions Grid */}
            <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reactionEntries.map((reaction) => (
                        <div 
                            key={reaction.id}
                            className="bg-slate-800/40 backdrop-blur rounded-xl border border-white/5 p-4 hover:border-emerald-500/30 transition-all group"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                                    <span className="text-slate-400 font-mono text-xs">{reaction.id}</span>
                                </div>
                                <span className="text-slate-500 text-xs font-mono">
                                    x = {reaction.x.toFixed(2)} m
                                </span>
                            </div>
                            
                            <div className="space-y-3">
                                {/* Vertical Force */}
                                {reaction.fy !== 0 && (
                                    <div className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            {reaction.fy > 0 ? (
                                                <ArrowUp size={14} className="text-emerald-400" />
                                            ) : (
                                                <ArrowDown size={14} className="text-rose-400" />
                                            )}
                                            <span className="text-slate-400 text-xs">Vertical Force</span>
                                        </div>
                                        <span className={`font-mono font-bold ${
                                            reaction.fy > 0 ? 'text-emerald-400' : 'text-rose-400'
                                        }`}>
                                            {reaction.fy > 0 ? '+' : ''}{reaction.fy.toFixed(2)} kN
                                        </span>
                                    </div>
                                )}

                                {/* Moment */}
                                {reaction.m !== 0 && (
                                    <div className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <RotateCw size={14} className="text-cyan-400" />
                                            <span className="text-slate-400 text-xs">Moment</span>
                                        </div>
                                        <span className={`font-mono font-bold ${
                                            reaction.m > 0 ? 'text-cyan-400' : 'text-amber-400'
                                        }`}>
                                            {reaction.m > 0 ? '+' : ''}{reaction.m.toFixed(2)} kNm
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {reactionEntries.length === 0 && (
                    <div className="h-full flex items-center justify-center text-slate-500">
                        <div className="text-center">
                            <MapPin size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No reactions calculated</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
