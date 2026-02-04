
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
import { PlaygroundFeature } from './features/playground/PlaygroundFeature';
import { Library } from 'lucide-react';
import { NexusObject, isLink, NexusType, NexusCategory, ContainmentType, DefaultLayout } from './types';
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
    const [currentView, setCurrentView] = useState<AppView>('PLAYGROUND');
    const [theme, setTheme] = useState<ThemeMode>('vanilla-light');
    
    useEffect(() => {
        document.body.setAttribute('data-theme', theme);
    }, [theme]);

    const [registry, setRegistry] = useState<Record<string, NexusObject>>({});
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [refineryBatches, setRefineryBatches] = useState<RefineryBatch[]>([]);
    const [pendingScanText, setPendingScanText] = useState<string>('');

    const [integrityFocus, setIntegrityFocus] = useState<{ linkId: string, path?: string[], mode: 'CENTER' | 'DRILL' } | null>(null);

    const handleUpdateRegistryObject = useCallback((id: string, updates: Partial<NexusObject>) => {
        setRegistry(prev => {
            if (!prev[id]) return prev;
            return {
                ...prev,
                [id]: { ...prev[id], ...updates, last_modified: new Date().toISOString() } as any
            };
        });
    }, []);

    const handleBatchToRefinery = (items: NexusObject[], source: RefineryBatch['source'] = 'SCANNER', name?: string) => {
        const newBatch: RefineryBatch = {
            id: generateId(),
            name: name || `${source}_${new Date().toLocaleTimeString().replace(/:/g, '')}`,
            timestamp: new Date().toISOString(),
            items: items,
            status: 'pending',
            source: source
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

    const handleResolveAnomaly = (linkId: string, action: 'DELETE' | 'REIFY' | 'IGNORE') => {
        if (action === 'DELETE') {
            setRegistry(prev => {
                const next = { ...prev };
                delete next[linkId];
                return next;
            });
        } else if (action === 'REIFY') {
            setRegistry(prev => {
                const link = prev[linkId];
                if (!link || !isLink(link)) return prev;
                const source = prev[link.source_id];
                const target = prev[link.target_id];
                if (!source || !target) return prev;

                const reifiedUnit: NexusObject = {
                    ...link,
                    _type: link._type === NexusType.HIERARCHICAL_LINK ? NexusType.AGGREGATED_HIERARCHICAL_LINK : NexusType.AGGREGATED_SEMANTIC_LINK,
                    is_reified: true,
                    title: `${(source as any).title || 'Origin'} → ${(target as any).title || 'Terminal'}`,
                    gist: `Logic: ${link.verb}`,
                    prose_content: `Relationship between ${(source as any).title} and ${(target as any).title}.`,
                    category_id: NexusCategory.META,
                    children_ids: [],
                    containment_type: ContainmentType.FOLDER,
                    is_collapsed: false,
                    default_layout: DefaultLayout.GRID,
                    is_ghost: false,
                    aliases: [],
                    tags: ['reified'],
                } as any;
                return { ...prev, [linkId]: reifiedUnit };
            });
        }
        setIntegrityFocus(null);
    };

    return (
        <div className="relative h-full w-full">
            <AppShell 
                currentView={currentView} 
                onViewChange={setCurrentView}
                theme={theme}
            >
                {currentView === 'PLAYGROUND' && (
                    <PlaygroundFeature 
                        onSeedRefinery={(items, name) => handleBatchToRefinery(items, 'IMPORT', name)}
                        onSeedRegistry={(items) => setRegistry(prev => ({...prev, ...items}))}
                    />
                )}
                {currentView === 'DRILLDOWN' && (
                    <DrilldownFeature 
                        registry={registry} 
                        onRegistryUpdate={setRegistry}
                        integrityFocus={integrityFocus}
                        onSetIntegrityFocus={setIntegrityFocus}
                        onResolveAnomaly={handleResolveAnomaly}
                        onSelectNote={(id) => {
                            setSelectedNoteId(id);
                            setCurrentView('WIKI');
                        }}
                    />
                )}
                {currentView === 'ANALYZER' && (
                    <ManuscriptAnalyzerFeature 
                        onCommitBatch={(items) => handleBatchToRefinery(items, 'MANUAL', 'BLUEPRINT_DRAFT')} 
                    />
                )}
                {currentView === 'GENERATOR' && (
                    <UniverseGeneratorFeature onScan={handleScanLore} registry={registry} />
                )}
                {currentView === 'SCANNER' && (
                    <ScannerFeature 
                        onCommitBatch={(items) => handleBatchToRefinery(items, 'SCANNER')} 
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
        </div>
    );
}
