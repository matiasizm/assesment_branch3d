import React from 'react';
import { ClipboardList, AlertTriangle } from 'lucide-react';
import type { AnalysisResults } from '../../core/logic/FemSolver';

interface ResultsPanelProps {
    results: AnalysisResults | null;
    error: string | null;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({ results, error }) => {
    if (error) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-rose-400 gap-4">
                <div className="p-4 bg-rose-500/10 rounded-full border border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.2)]">
                    <AlertTriangle size={32} />
                </div>
                <div className="text-center">
                    <h3 className="font-bold text-lg mb-1">Calculation Error</h3>
                    <p className="text-sm text-rose-300/70 max-w-md">{error}</p>
                </div>
            </div>
        );
    }

    if (!results) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4 opacity-60">
                <ClipboardList size={48} strokeWidth={1} />
                <p className="text-sm tracking-wider uppercase">Results will appear here</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col p-6 max-w-6xl mx-auto">
            <h3 className="text-cyan-400 font-bold text-xs tracking-[0.2em] uppercase mb-6 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></span>
                Analysis Report
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 h-full overflow-hidden">
                
                {/* --- Tabla Reacciones --- */}
                <div className="flex flex-col min-h-0">
                    <h4 className="text-slate-400 text-xs font-bold uppercase mb-4 pl-2 border-l-2 border-slate-700">Support Reactions</h4>
                    <div className="overflow-auto pr-2 custom-scrollbar">
                        <table className="w-full text-sm">
                            <thead className="text-slate-500 border-b border-white/5 text-xs uppercase">
                                <tr>
                                    <th className="pb-3 text-left pl-4 font-normal">Node ID</th>
                                    <th className="pb-3 text-right font-normal">Fy (kN)</th>
                                    <th className="pb-3 text-right pr-4 font-normal">Moment (kNm)</th>
                                </tr>
                            </thead>
                            <tbody className="text-slate-300">
                                {Object.entries(results.reactions).map(([id, r]) => (
                                    <tr key={id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                        <td className="py-3 pl-4 font-mono text-slate-500 group-hover:text-cyan-400 transition-colors">{id}</td>
                                        <td className={`py-3 text-right font-mono ${r.fy !== 0 ? "text-emerald-400 font-bold" : "opacity-30"}`}>
                                            {r.fy.toFixed(2)}
                                        </td>
                                        <td className={`py-3 pr-4 text-right font-mono ${r.m !== 0 ? "text-emerald-400 font-bold" : "opacity-30"}`}>
                                            {r.m.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* --- Tabla Desplazamientos --- */}
                <div className="flex flex-col min-h-0">
                    <h4 className="text-slate-400 text-xs font-bold uppercase mb-4 pl-2 border-l-2 border-slate-700">Displacements</h4>
                    <div className="overflow-auto pr-2 custom-scrollbar">
                        <table className="w-full text-sm">
                            <thead className="text-slate-500 border-b border-white/5 text-xs uppercase">
                                <tr>
                                    <th className="pb-3 text-left pl-4 font-normal">Node ID</th>
                                    <th className="pb-3 text-right font-normal">Deflection Y (mm)</th>
                                    <th className="pb-3 text-right pr-4 font-normal">Rotation (rad)</th>
                                </tr>
                            </thead>
                            <tbody className="text-slate-300">
                                {Object.entries(results.displacements).map(([id, d]) => (
                                    <tr key={id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="py-3 pl-4 font-mono text-slate-500">{id}</td>
                                        <td className={`py-3 text-right font-mono ${Math.abs(d.y) > 0.0001 ? "text-cyan-300" : "opacity-30"}`}>
                                            {(d.y * 1000).toFixed(3)}
                                        </td>
                                        <td className="py-3 pr-4 text-right font-mono opacity-60">
                                            {d.rotation.toFixed(5)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};