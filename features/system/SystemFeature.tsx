
import React, { useRef, useMemo } from 'react';
import { 
    Database, 
    Download, 
    Upload, 
    Trash2, 
    HardDrive, 
    Share2, 
    FileJson, 
    Activity,
    AlertTriangle,
    CheckCircle,
    Monitor,
    Moon,
    Sun,
    Palette,
    Layers,
    Coffee
} from 'lucide-react';
import { NexusObject, isLink, isContainer } from '../../types';
import { ThemeMode } from '../../App';

interface SystemFeatureProps {
    registry: Record<string, NexusObject>;
    onImport: (data: Record<string, NexusObject>) => void;
    onClear: () => void;
    theme: ThemeMode;
    onThemeChange: (theme: ThemeMode) => void;
}

export const SystemFeature: React.FC<SystemFeatureProps> = ({ registry, onImport, onClear, theme, onThemeChange }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const stats = useMemo(() => {
        const allObjects = Object.values(registry) as NexusObject[];
        const nodes = allObjects.filter(n => !isLink(n));
        const links = allObjects.filter(n => isLink(n));
        const containers = nodes.filter(n => isContainer(n));
        const totalSize = JSON.stringify(registry).length;
        
        return {
            nodeCount: nodes.length,
            linkCount: links.length,
            containerCount: containers.length,
            sizeKB: (totalSize / 1024).toFixed(2)
        };
    }, [registry]);

    const handleExport = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(registry, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `nexus_export_${new Date().toISOString().slice(0,10)}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const fileObj = event.target.files && event.target.files[0];
        if (!fileObj) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result;
            if (typeof content === 'string') {
                try {
                    const imported = JSON.parse(content);
                    if (typeof imported === 'object' && imported !== null) {
                        onImport(imported);
                    } else {
                        alert('Invalid JSON structure');
                    }
                } catch (error) {
                    console.error(error);
                    alert('Failed to parse JSON file');
                }
            }
        };
        reader.readAsText(fileObj);
        event.target.value = '';
    };

    return (
        <div className="flex flex-col h-full bg-nexus-950 p-6 md:p-10 font-sans overflow-y-auto no-scrollbar">
            {/* Header */}
            <div className="mb-10">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-nexus-500/10 rounded-xl border border-nexus-500/20">
                        <Database className="text-nexus-accent" size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-display font-black text-white tracking-tight">SYSTEM <span className="text-nexus-500">CORE</span></h1>
                        <p className="text-xs text-slate-500 font-mono uppercase tracking-[0.2em] mt-1">
                            Mainframe Status: Online // Registry Verified
                        </p>
                    </div>
                </div>
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatCard label="Active Units" value={stats.nodeCount} icon={HardDrive} subtext="Nodes in Registry" />
                <StatCard label="Neural Links" value={stats.linkCount} icon={Share2} subtext="Active Associations" />
                <StatCard label="Volumes" value={stats.containerCount} icon={FileJson} subtext="Logical Hierarchies" />
                <StatCard label="System Payload" value={`${stats.sizeKB} KB`} icon={Activity} subtext="JSON Footprint" highlight />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                
                {/* Interface Configuration */}
                <div className="bg-nexus-900 border border-nexus-800 rounded-3xl p-8 shadow-xl">
                    <h2 className="text-lg font-display font-bold text-white mb-6 flex items-center gap-3">
                        <Palette size={20} className="text-nexus-500" />
                        Interface Protocols
                    </h2>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ThemeButton 
                            mode="modern" 
                            currentMode={theme} 
                            onSelect={onThemeChange}
                            title="Midnight"
                            sub="Default Nexus"
                            icon={Monitor}
                            color="text-nexus-accent"
                        />
                        <ThemeButton 
                            mode="legacy" 
                            currentMode={theme} 
                            onSelect={onThemeChange}
                            title="Arcane"
                            sub="Fantasy Mythos"
                            icon={Moon}
                            color="text-purple-400"
                        />
                        <ThemeButton 
                            mode="vanilla-dark" 
                            currentMode={theme} 
                            onSelect={onThemeChange}
                            title="Vanilla Dark"
                            sub="Pro Professional"
                            icon={Layers}
                            color="text-blue-500"
                        />
                        <ThemeButton 
                            mode="vanilla-light" 
                            currentMode={theme} 
                            onSelect={onThemeChange}
                            title="Vanilla Light"
                            sub="Academic Paper"
                            icon={Sun}
                            color="text-blue-600"
                        />
                    </div>
                </div>

                {/* I/O Panel */}
                <div className="bg-nexus-900 border border-nexus-800 rounded-3xl p-8 shadow-xl">
                    <h2 className="text-lg font-display font-bold text-white mb-6 flex items-center gap-3">
                        <Activity size={20} className="text-nexus-500" />
                        Data Synchronization
                    </h2>
                    
                    <div className="space-y-4">
                        <button 
                            onClick={handleExport}
                            className="w-full flex items-center justify-between p-4 bg-black/20 border border-nexus-800 hover:border-nexus-500 hover:bg-nexus-900 transition-all rounded-2xl group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-nexus-500/10 rounded-xl text-nexus-500 group-hover:text-nexus-accent transition-colors">
                                    <Download size={20} />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">Snapshot Registry</div>
                                    <div className="text-[10px] text-slate-500">Commit memory to local JSON backup</div>
                                </div>
                            </div>
                            <CheckCircle size={18} className="text-nexus-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>

                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full flex items-center justify-between p-4 bg-black/20 border border-nexus-800 hover:border-nexus-500 hover:bg-nexus-900 transition-all rounded-2xl group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-nexus-500/10 rounded-xl text-nexus-500 group-hover:text-nexus-accent transition-colors">
                                    <Upload size={20} />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">Inject External Core</div>
                                    <div className="text-[10px] text-slate-500">Restore registry from previous snapshot</div>
                                </div>
                            </div>
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-900/10 border border-red-900/30 rounded-3xl p-8 mb-10">
                <h2 className="text-lg font-display font-bold text-red-400 mb-4 flex items-center gap-3">
                    <AlertTriangle size={20} />
                    Kernel Reset
                </h2>
                <p className="text-sm text-red-300/60 mb-8 max-w-2xl leading-relaxed">
                    Initiating a system purge will permanently wipe the active registry memory. This action is irrecoverable unless a recent snapshot is available.
                </p>
                <button 
                    onClick={() => { if (window.confirm("CRITICAL: Final confirmation for system wipe required.")) onClear(); }}
                    className="w-full md:w-auto px-10 py-4 rounded-2xl bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 border border-red-500/30 font-display font-black uppercase tracking-[0.2em] text-[10px] transition-all flex items-center justify-center gap-3 shadow-xl"
                >
                    <Trash2 size={16} /> Purge Registry Active Memory
                </button>
            </div>
        </div>
    );
};

const ThemeButton = ({ mode, currentMode, onSelect, title, sub, icon: Icon, color }: any) => {
    const isActive = currentMode === mode;
    return (
        <button 
            onClick={() => onSelect(mode)}
            className={`
                flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group
                ${isActive ? 'bg-nexus-500/10 border-nexus-500' : 'bg-black/20 border-nexus-800 hover:border-nexus-700'}
            `}
        >
            <div className={`p-2.5 rounded-xl transition-colors ${isActive ? 'bg-nexus-500 text-white shadow-lg shadow-nexus-500/20' : 'bg-nexus-800 text-slate-500 group-hover:text-slate-300'}`}>
                <Icon size={20} />
            </div>
            <div>
                <div className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-400'}`}>{title}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">{sub}</div>
            </div>
            {isActive && <CheckCircle size={16} className={`ml-auto ${color}`} />}
        </button>
    );
};

const StatCard = ({ label, value, icon: Icon, subtext, highlight }: any) => (
    <div className={`p-6 rounded-3xl border ${highlight ? 'bg-nexus-500/10 border-nexus-500/40 shadow-[0_0_30px_rgba(6,182,212,0.1)]' : 'bg-nexus-900 border-nexus-800'} relative overflow-hidden group transition-all hover:translate-y-[-2px]`}>
        <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
                <Icon size={16} className={highlight ? 'text-nexus-accent' : 'text-slate-500'} />
                <span className={`text-[10px] font-display font-black uppercase tracking-widest ${highlight ? 'text-nexus-300' : 'text-slate-600'}`}>{label}</span>
            </div>
            <div className={`text-3xl font-display font-black tracking-tight ${highlight ? 'text-white' : 'text-slate-200'}`}>
                {value}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 font-medium italic">
                {subtext}
            </div>
        </div>
    </div>
);
