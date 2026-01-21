import React, { useState, useMemo } from 'react';
import { ClipboardList, AlertTriangle, BarChart3, Waves, MapPin, LayoutGrid } from 'lucide-react';
import type { AnalysisResults } from '../../core/logic/FemSolver';
import { Diagrams } from './Diagrams';
import { DeformationPlot } from './DeformationPlot';
import { ReactionsDisplay } from './ReactionsDisplay';
import { IntegratedDiagrams } from './IntegratedDiagrams';
import { DiagramCalculator } from '../../core/services/DiagramCalculator';
import type { Node } from '../../core/entities/Node';
import type { Load } from '../../core/entities/Load';

interface ResultsPanelProps {
    results: AnalysisResults | null;
    error: string | null;
    length: number;
    nodes: Node[];
    loads: Load[];
    supports: Array<{ id: string, x: number, type: string }>;
}

type TabType = 'diagrams' | 'deformation' | 'reactions' | 'all';

export const ResultsPanel: React.FC<ResultsPanelProps> = ({ results, error, length, nodes, loads, supports }) => {
    const [activeTab, setActiveTab] = useState<TabType>('all');

    const diagramData = useMemo(() => {
        if (!results || nodes.length === 0) return null;
        
        try {
            return DiagramCalculator.calculateDiagrams(
                length,
                nodes,
                loads,
                results.reactions,
                results.displacements,
                200 // High resolution for smooth curves
            );
        } catch (err) {
            console.error('Error calculating diagrams:', err);
            return null;
        }
    }, [results, length, nodes, loads]);

    if (error) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-rose-400 gap-6 p-8">
                <div className="p-6 bg-gradient-to-br from-rose-500/10 to-red-500/10 rounded-2xl border-2 border-rose-500/30 shadow-2xl shadow-rose-500/10 animate-in fade-in-50 duration-300">
                    <AlertTriangle size={48} className="text-rose-400" />
                </div>
                <div className="text-center max-w-md">
                    <h3 className="font-bold text-2xl mb-3 text-rose-300">Calculation Error</h3>
                    <p className="text-sm text-rose-300/80 leading-relaxed bg-slate-900/50 p-4 rounded-lg border border-rose-500/20">{error}</p>
                </div>
            </div>
        );
    }

    if (!results) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-6 p-8">
                <div className="p-8 bg-slate-900/40 backdrop-blur-sm rounded-2xl border border-slate-700/30 shadow-xl">
                    <ClipboardList size={64} strokeWidth={1.5} className="mx-auto mb-4 text-slate-600" />
                    <div className="text-center">
                        <h3 className="font-bold text-xl mb-2 text-slate-400">No Results Yet</h3>
                        <p className="text-sm tracking-wider uppercase text-slate-600 mb-1">Results will appear here</p>
                        <p className="text-xs text-slate-700 mt-2">Click <span className="font-semibold text-emerald-400">SOLVE</span> to calculate</p>
                    </div>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'all' as TabType, label: 'All Views', icon: LayoutGrid },
        { id: 'diagrams' as TabType, label: 'Integrated View', icon: BarChart3 },
        { id: 'deformation' as TabType, label: 'Deformation', icon: Waves },
        { id: 'reactions' as TabType, label: 'Reactions', icon: MapPin },
    ];

    return (
        <div className="h-full flex flex-col p-6 max-w-7xl mx-auto w-full bg-gradient-to-br from-slate-950 to-slate-900">
            {/* Tab Navigation - Enhanced */}
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-800/50">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all
                                ${activeTab === tab.id
                                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 scale-105'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-700/50'
                                }
                            `}
                        >
                            <Icon size={16} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
                {activeTab === 'all' && (
                    <div className="space-y-6">
                        {/* Integrated Diagrams */}
                        {diagramData && results && (
                            <div className="flex items-center justify-center">
                                <IntegratedDiagrams
                                    results={results}
                                    diagramData={diagramData}
                                    length={length}
                                    nodes={nodes}
                                    supports={supports}
                                    loads={loads}
                                />
                            </div>
                        )}

                        {/* Deformation */}
                        {diagramData && (
                            <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm rounded-2xl border border-slate-700/30 p-6 shadow-xl">
                                <DeformationPlot 
                                    deformation={diagramData.deformation}
                                    length={length}
                                />
                            </div>
                        )}

                        {/* Reactions */}
                        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm rounded-2xl border border-slate-700/30 p-6 shadow-xl">
                            <ReactionsDisplay 
                                reactions={results.reactions}
                                nodes={nodes}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'diagrams' && diagramData && results && (
                    <div className="h-full flex items-center justify-center">
                        <IntegratedDiagrams
                            results={results}
                            diagramData={diagramData}
                            length={length}
                            nodes={nodes}
                            supports={supports}
                            loads={loads}
                        />
                    </div>
                )}

                {activeTab === 'deformation' && diagramData && (
                    <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm rounded-2xl border border-slate-700/30 p-6 h-full shadow-xl">
                        <DeformationPlot 
                            deformation={diagramData.deformation}
                            length={length}
                        />
                    </div>
                )}

                {activeTab === 'reactions' && (
                    <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm rounded-2xl border border-slate-700/30 p-6 h-full shadow-xl">
                        <ReactionsDisplay 
                            reactions={results.reactions}
                            nodes={nodes}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};