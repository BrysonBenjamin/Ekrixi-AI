
import React, { useState, useEffect, useCallback } from 'react';
import { AppShell, AppView } from './components/layout/AppShell';
import { UniverseGeneratorFeature } from './features/universe-generator/UniverseGeneratorFeature';
import { ScannerFeature } from './features/scanner/ScannerFeature';
import { RefineryFeature, RefineryBatch } from './features/refinery/RefineryFeature';
import { StructureFeature } from './features/structure/StructureFeature';
import { SystemFeature } from './features/system/SystemFeature';
import { WikiFeature } from './features/wiki/WikiFeature';
import { DrilldownFeature } from './features/drilldown/DrilldownFeature';
import { ManuscriptAnalyzerFeature } from './features/manuscript-analyzer/ManuscriptAnalyzerFeature';
import { Library } from 'lucide-react';
import { NexusObject } from './types';
import { generateId } from './utils/ids';

export type ThemeMode = 'modern' | 'legacy' | 'vanilla-dark' | 'vanilla-light';

const LibraryPlaceholder = () => (
    <div className="flex flex-col items-center justify-center h-full text-nexus-muted">
        <Library size={64} className="mb-4 opacity-20" />
        <h2 className="text-2xl font-bold opacity-50">Global Knowledge Base</h2>
        <p className="text-sm">Neural Index v4.5 Required</p>
    </div>
);

export default function App() {
    // Default to GENERATOR view for onboarding flow
    const [currentView, setCurrentView] = useState<AppView>('GENERATOR');
    // Default to vanilla-light theme
    const [theme, setTheme] = useState<ThemeMode>('vanilla-light');
    
    useEffect(() => {
        document.body.setAttribute('data-theme', theme);
    }, [theme]);

    // Initial project state: Blank
    const [registry, setRegistry] = useState<Record<string, NexusObject>>({});
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [refineryBatches, setRefineryBatches] = useState<RefineryBatch[]>([]);

    // Bridge for lore injection from chat to scanner
    const [pendingScanText, setPendingScanText] = useState<string>('');

    const handleUpdateRegistryObject = useCallback((id: string, updates: Partial<NexusObject>) => {
        setRegistry(prev => {
            if (!prev[id]) return prev;
            return {
                ...prev,
                [id]: { ...prev[id], ...updates, last_modified: new Date().toISOString() } as any
            };
        });
    }, []);

    const handleBatchToRefinery = (items: NexusObject[]) => {
        const newBatch: RefineryBatch = {
            id: generateId(),
            name: `SCAN_${new Date().toLocaleTimeString().replace(/:/g, '')}`,
            timestamp: new Date().toISOString(),
            items: items,
            status: 'pending',
            source: 'SCANNER'
        };
        setRefineryBatches(prev => [newBatch, ...prev]);
        setCurrentView('REFINERY');
    };

    const handleCommitBatch = (batchId: string, items: NexusObject[]) => {
        setRegistry(prev => {
            const next = { ...prev };
            items.forEach(item => { next[item.id] = item; });
            return next;
        });
        setRefineryBatches(prev => prev.filter(b => b.id !== batchId));
        setCurrentView('DRILLDOWN');
    };

    const handleScanLore = (text: string) => {
        setPendingScanText(text);
        setCurrentView('SCANNER');
    };

    return (
        <AppShell 
            currentView={currentView} 
            onViewChange={setCurrentView}
            theme={theme}
        >
            {currentView === 'DRILLDOWN' && (
                <DrilldownFeature 
                    registry={registry} 
                    onSelectNote={(id) => {
                        setSelectedNoteId(id);
                        setCurrentView('WIKI');
                    }}
                />
            )}
            {currentView === 'ANALYZER' && (
                <ManuscriptAnalyzerFeature 
                    onCommitBatch={handleBatchToRefinery} 
                />
            )}
            {currentView === 'GENERATOR' && (
                <UniverseGeneratorFeature onScan={handleScanLore} registry={registry} />
            )}
            {currentView === 'SCANNER' && (
                <ScannerFeature 
                    onCommitBatch={handleBatchToRefinery} 
                    registry={registry} 
                    initialText={pendingScanText}
                    onClearPendingText={() => setPendingScanText('')}
                />
            )}
            {currentView === 'REFINERY' && (
                <RefineryFeature 
                    batches={refineryBatches}
                    onUpdateBatch={(id, items) => setRefineryBatches(prev => prev.map(b => b.id === id ? { ...b, items } : b))}
                    onDeleteBatch={(id) => setRefineryBatches(prev => prev.filter(b => b.id !== id))}
                    onCommitBatch={handleCommitBatch}
                />
            )}
            {currentView === 'STRUCTURE' && (
                <StructureFeature 
                    registry={registry}
                    onRegistryUpdate={setRegistry}
                    onNavigateToWiki={(id) => {
                        setSelectedNoteId(id);
                        setCurrentView('WIKI');
                    }}
                />
            )}
            {currentView === 'WIKI' && (
                <WikiFeature 
                    registry={registry}
                    selectedId={selectedNoteId}
                    onSelect={setSelectedNoteId}
                    onUpdateObject={handleUpdateRegistryObject}
                />
            )}
            {currentView === 'SETTINGS' && (
                <SystemFeature 
                    registry={registry}
                    onImport={(data) => setRegistry(data)}
                    onClear={() => setRegistry({})}
                    theme={theme}
                    onThemeChange={setTheme}
                />
            )}
            {currentView === 'LIBRARY' && <LibraryPlaceholder />}
        </AppShell>
    );
}
