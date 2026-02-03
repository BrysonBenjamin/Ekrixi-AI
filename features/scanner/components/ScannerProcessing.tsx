
import React, { useState, useEffect } from 'react';
import { BrainCircuit, Binary, Search } from 'lucide-react';

interface ScannerProcessingProps {
    customStatus?: string;
}

export const ScannerProcessing: React.FC<ScannerProcessingProps> = ({ customStatus }) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) return 98; // Hold at 98 until actual stage completion
                return prev + Math.random() * 0.8;
            });
        }, 150);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
            <div className="relative mb-12">
                <div className="absolute inset-0 bg-nexus-accent/10 rounded-full blur-[80px] animate-pulse"></div>
                <div className="relative w-32 h-32 rounded-[32px] bg-nexus-900 border border-nexus-accent/20 flex items-center justify-center shadow-2xl">
                    <BrainCircuit size={64} className="text-nexus-accent animate-pulse" />
                </div>
                
                {/* Orbiting Elements */}
                <div className="absolute -top-4 -right-4 w-12 h-12 rounded-2xl bg-nexus-800 border border-nexus-700 flex items-center justify-center animate-bounce duration-[2000ms] shadow-lg">
                    <Binary size={20} className="text-nexus-accent" />
                </div>
                <div className="absolute -bottom-6 -left-2 w-10 h-10 rounded-2xl bg-nexus-800 border border-nexus-700 flex items-center justify-center animate-bounce duration-[1500ms] delay-300 shadow-lg">
                    <Search size={16} className="text-nexus-accent" />
                </div>
            </div>

            <div className="w-full max-w-md space-y-8">
                <div>
                    <h2 className="text-3xl font-display font-black text-nexus-text mb-3 tracking-tighter uppercase min-h-[1.5em]">
                        {customStatus || 'Booting Extraction Kernel...'}
                    </h2>
                    <p className="text-[10px] text-nexus-muted font-mono font-bold uppercase tracking-[0.4em]">Neural Engine Phase: extraction_active</p>
                </div>

                <div className="relative h-2 w-full bg-nexus-800 rounded-full overflow-hidden border border-nexus-700 shadow-inner">
                    <div 
                        className="h-full bg-nexus-accent transition-all duration-300 shadow-[0_0_15px_var(--accent-color)] shadow-opacity-40"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <div className="grid grid-cols-3 gap-6 pt-4">
                    <ProcessIndicator label="Scout" active={progress > 10} />
                    <ProcessIndicator label="Architect" active={progress > 40} />
                    <ProcessIndicator label="Chronicler" active={progress > 75} />
                </div>
            </div>
        </div>
    );
};

const ProcessIndicator = ({ label, active }: { label: string, active: boolean }) => (
    <div className="flex flex-col items-center gap-3">
        <div className={`w-3 h-3 rounded-full transition-all duration-500 ${active ? 'bg-nexus-accent shadow-[0_0_8px_var(--accent-color)]' : 'bg-nexus-700'}`} />
        <span className={`text-[10px] font-display font-black uppercase tracking-widest transition-colors duration-500 ${active ? 'text-nexus-text' : 'text-nexus-muted opacity-40'}`}>{label}</span>
    </div>
);
