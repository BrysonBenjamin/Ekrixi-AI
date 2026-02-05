
import React, { useMemo } from 'react';
import { Scale, Sparkles, Activity, CheckCircle2, AlertTriangle, Fingerprint, BarChart3, TrendingUp, Zap } from 'lucide-react';
import { NexusObject, StoryType, isLink } from '../../../types';

interface StudioValidationProps {
    delta: any;
    studioItems: NexusObject[];
    worldRegistry: Record<string, NexusObject>;
}

export const StudioValidation: React.FC<StudioValidationProps> = ({ delta, studioItems, worldRegistry }) => {
    
    const chapters = studioItems.filter(i => (i as any).story_type === StoryType.CHAPTER);
    const mentions = useMemo(() => {
        const allText = studioItems.map(i => (i as any).prose_content || '').join(' ');
        const worldNodes = (Object.values(worldRegistry) as NexusObject[]).filter(n => !isLink(n));
        return worldNodes.filter(n => allText.includes(`[[${(n as any).title}]]`));
    }, [studioItems, worldRegistry]);

    const progressPercent = Math.min(100, Math.floor((chapters.length / 5) * 100)); // Arbitrary target 5 ch for demo

    return (
        <div className="h-full bg-nexus-950 p-12 overflow-y-auto no-scrollbar animate-in fade-in duration-1000">
            <div className="max-w-5xl mx-auto space-y-12">
                
                <header className="text-center space-y-4 mb-20">
                    <div className="flex justify-center mb-6">
                        <div className="p-4 bg-nexus-ruby/10 rounded-full border border-nexus-ruby/30 text-nexus-ruby shadow-[0_0_40px_rgba(225,29,72,0.2)] animate-pulse">
                            <Fingerprint size={48} />
                        </div>
                    </div>
                    <h2 className="text-5xl font-display font-black text-nexus-text tracking-tighter uppercase leading-none">The Soul <span className="text-nexus-ruby">Audit.</span></h2>
                    <p className="text-nexus-muted text-lg font-serif italic max-w-2xl mx-auto opacity-70 leading-relaxed">
                        "Measuring the distance between Alpha and Omega. Validating thematic consistency across reified logic bridges."
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    
                    {/* Mass Movement Metric */}
                    <div className="bg-nexus-900 border border-nexus-800 p-8 rounded-[40px] shadow-xl space-y-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                             <TrendingUp size={100} />
                        </div>
                        <div className="flex items-center gap-3">
                            <Scale size={20} className="text-nexus-ruby" />
                            <span className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest">Narrative Mass Delta</span>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <div className="text-4xl font-display font-black text-nexus-text tracking-tighter">{delta?.startWeight} → {delta?.endWeight}</div>
                                <div className="text-[10px] font-mono text-nexus-essence font-bold">ESTIMATED GAIN: +400%</div>
                            </div>
                            <div className="w-full h-1.5 bg-nexus-950 rounded-full overflow-hidden border border-nexus-800">
                                <div className="h-full bg-nexus-ruby shadow-[0_0_10px_rgba(225,29,72,0.5)]" style={{ width: `${progressPercent}%` }} />
                            </div>
                        </div>
                    </div>

                    {/* World Integration Metric */}
                    <div className="bg-nexus-900 border border-nexus-800 p-8 rounded-[40px] shadow-xl space-y-6">
                        <div className="flex items-center gap-3">
                            <Zap size={20} className="text-nexus-accent" />
                            <span className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest">Registry Synchronization</span>
                        </div>
                        <div className="text-4xl font-display font-black text-nexus-text tracking-tighter">{mentions.length} Nodes</div>
                        <p className="text-xs text-nexus-muted font-medium leading-relaxed">
                            {mentions.length > 5 ? "High causal density. World nodes are properly influencing the narrative arc." : "Low density. Consider referencing more world signatures to anchor the lore."}
                        </p>
                    </div>

                    {/* Thematic Metric */}
                    <div className="bg-nexus-900 border border-nexus-800 p-8 rounded-[40px] shadow-xl space-y-6">
                        <div className="flex items-center gap-3">
                            <Sparkles size={20} className="text-nexus-essence" />
                            <span className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest">Thematic Integrity</span>
                        </div>
                        <div className="text-4xl font-display font-black text-nexus-text tracking-tighter">94.2%</div>
                        <div className="flex items-center gap-2 text-nexus-essence text-[10px] font-bold uppercase tracking-widest">
                            <CheckCircle2 size={12} /> Thesis Consistently Reified
                        </div>
                    </div>
                </div>

                <div className="bg-nexus-900/40 border border-nexus-800 rounded-[48px] p-12 space-y-8">
                    <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <Activity size={20} className="text-nexus-ruby" />
                            <h3 className="text-sm font-display font-black text-nexus-text uppercase tracking-widest">Structural Insights</h3>
                         </div>
                    </div>

                    <div className="space-y-6">
                        <InsightItem 
                            type="WARNING"
                            icon={AlertTriangle}
                            title="Logic Drift Detected in Chapter 2"
                            content="The 'Iron Docks' were mentioned but not connected via transition. Inheritance chain broken."
                        />
                        <InsightItem 
                            type="SUCCESS"
                            icon={CheckCircle2}
                            title="Pivot Node Acceleration Valid"
                            content="Subject 'Elara Vance' is accumulating mass at the predicted rate for the Hero's Journey arc."
                        />
                    </div>
                </div>

            </div>
        </div>
    );
};

const InsightItem = ({ type, icon: Icon, title, content }: any) => (
    <div className={`p-6 rounded-3xl border flex items-start gap-6 transition-all hover:bg-nexus-950/40 ${type === 'WARNING' ? 'border-red-500/20 bg-red-500/5' : 'border-nexus-essence/20 bg-nexus-essence/5'}`}>
        <div className={`p-3 rounded-2xl ${type === 'WARNING' ? 'bg-red-500/10 text-red-500' : 'bg-nexus-essence/10 text-nexus-essence'}`}>
            <Icon size={20} />
        </div>
        <div>
            <h4 className="text-sm font-display font-bold text-nexus-text uppercase tracking-tight mb-1">{title}</h4>
            <p className="text-[11px] text-nexus-muted leading-relaxed font-serif italic">"{content}"</p>
        </div>
    </div>
);
