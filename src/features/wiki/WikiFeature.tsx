import React, { useMemo, useState, useRef } from 'react';
import { useLLM } from '../system/hooks/useLLM';
import { GEMINI_MODELS } from '../../core/llm';
import {
  NexusObject,
  isLink,
  isReified,
  WikiArtifact,
  NexusCategory,
  HierarchyType,
  NexusType,
  SimpleNote,
  SimpleLink,
} from '../../types';
import { FileCheck } from 'lucide-react';
import { WikiNavigation } from './components/WikiNavigation';
import { WikiHeader } from './components/WikiHeader';
import { WikiRegistryView } from './components/WikiRegistryView';
import { WikiEncyclopediaView } from './components/WikiEncyclopediaView';
import { WikiSection } from './components/WikiSection';
import { WikiEditData, WikiViewMode } from './types';

interface WikiFeatureProps {
  registry: Record<string, NexusObject>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onUpdateObject: (id: string, updates: Partial<NexusObject>) => void;
}

export const WikiFeature: React.FC<WikiFeatureProps> = ({
  registry,
  selectedId,
  onSelect,
  onUpdateObject,
}) => {
  const { generateContent } = useLLM();
  const [viewMode, setViewMode] = useState<WikiViewMode>('NOTE');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingBg, setIsGeneratingBg] = useState(false);
  const [artifacts, setArtifacts] = useState<Record<string, WikiArtifact>>({});
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [editData, setEditData] = useState<WikiEditData>({});
  const articleRef = useRef<HTMLDivElement>(null);

  const currentObject = useMemo(() => {
    if (!selectedId) return null;
    return registry[selectedId] || null;
  }, [selectedId, registry]);

  const handleStartEdit = (obj: NexusObject) => {
    if (isLink(obj) && !isReified(obj)) {
      const link = obj as SimpleLink & {
        hierarchy_type?: HierarchyType;
        gist?: string;
        prose_content?: string;
        encyclopedia_content?: string;
        weaving_protocol?: string;
      };
      setEditData({
        _type: obj._type as NexusType,
        verb: link.verb,
        verb_inverse: link.verb_inverse,
        hierarchy_type: link.hierarchy_type || HierarchyType.PARENT_OF,
        gist: link.gist || '',
        prose_content: link.prose_content || '',
        encyclopedia_content: link.encyclopedia_content || '',
        weaving_protocol: link.weaving_protocol || '',
      });
    } else {
      const note = obj as SimpleNote;
      setEditData({
        title: note.title || (note as unknown as SimpleLink).verb,
        gist: note.gist || '',
        prose_content: note.prose_content || '',
        encyclopedia_content: note.encyclopedia_content || '',
        weaving_protocol: note.weaving_protocol || '',
        aliases: [...(note.aliases || [])],
        tags: [...(note.tags || [])],
        category_id: note.category_id || NexusCategory.CONCEPT,
        is_author_note: note.is_author_note || false,
      });
    }
    setEditingNodeId(obj.id);
  };

  const handleSaveEdit = (id: string) => {
    onUpdateObject(id, editData);
    setEditingNodeId(null);
  };

  const currentArtifact = selectedId ? artifacts[selectedId] : null;

  const handleGenerateBg = async () => {
    if (!currentObject) return;
    setIsGeneratingBg(true);
    try {
      const response = await generateContent({
        model: GEMINI_MODELS.PRO,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `A cinematic high-quality background illustration for a first-class logical unit titled "${(currentObject as SimpleNote).title || (currentObject as SimpleLink).verb}". Description: ${(currentObject as SimpleNote).gist}. Atmospheric, evocative, slightly abstract conceptual art.`,
              },
            ],
          },
        ],
      });

      const result = await response.response;
      let imgUrl = '';
      const parts = result.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if ('inlineData' in part && part.inlineData) {
          imgUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
      if (imgUrl) {
        onUpdateObject(currentObject.id, { background_url: imgUrl });
      }
    } catch (err) {
      console.error('Background Generation Error:', err);
    } finally {
      setIsGeneratingBg(false);
    }
  };

  const handleScrollToSection = (id: string) => {
    const element = document.getElementById(`section-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleGenerateEncyclopedia = async () => {
    if (!selectedId || !currentObject) return;
    setIsGenerating(true);
    try {
      const projectSummary = (Object.values(registry) as NexusObject[])
        .filter((n) => !isLink(n) || isReified(n))
        .map((n) => {
          const note = n as SimpleNote;
          const link = n as unknown as SimpleLink;
          return `- ${note.title || link.verb}: ${note.gist}`;
        })
        .join('\n');

      const systemInstruction = `
                ACT AS: The Grand Chronicler of the Ekrixi AI Nexus.
                TASK: Write a definitive, high-fidelity encyclopedia entry for the logical unit known as "${(currentObject as SimpleNote).title || (currentObject as SimpleLink).verb}".
                Knowledge Context: Summary: ${(currentObject as SimpleNote).gist}. Records: ${(currentObject as SimpleNote).prose_content || 'N/A'}.
                Project Scope: ${projectSummary}
            `;

      const response = await generateContent({
        model: GEMINI_MODELS.PRO,
        systemInstruction: systemInstruction,
        contents: [{ role: 'user', parts: [{ text: 'Write the encyclopedia entry.' }] }],
        generationConfig: { temperature: 0.2 },
      });

      const result = await response.response;
      const artifact: WikiArtifact = {
        node_id: selectedId,
        content: result.text() || 'Connection lost.',
        generated_at: new Date().toISOString(),
        context_depth: 2,
        graph_version: `v1`,
        weaving_protocol: systemInstruction,
      };
      setArtifacts((prev) => ({ ...prev, [selectedId]: artifact }));
    } catch (error) {
      console.error('Encyclopedia Generation Error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCommitToRegistry = () => {
    if (currentArtifact && currentObject) {
      onUpdateObject(currentObject.id, {
        encyclopedia_content: currentArtifact.content,
        weaving_protocol: currentArtifact.weaving_protocol || '',
        last_modified: new Date().toISOString(),
      });
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000);
      // We stay in ENCYCLOPEDIA view to see the result, or toggle back?
      // User said "separate from the note", so staying in encyclopedia makes sense.
    }
  };

  const handleSelect = (id: string) => {
    if (selectedId) {
      setHistory((prev) => [...prev, selectedId]);
    }
    onSelect(id);
  };

  const handleGoBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory((p) => p.slice(0, -1));
      onSelect(prev);
    } else {
      onSelect('');
    }
  };

  const handleBackToDirectory = () => {
    setHistory([]);
    onSelect('');
  };

  if (!selectedId || !currentObject) {
    return <WikiRegistryView registry={registry} onSelect={handleSelect} />;
  }

  const isL = isLink(currentObject) && !isReified(currentObject);

  return (
    <div className="flex flex-col h-full bg-nexus-950 overflow-hidden md:flex-row relative font-sans">
      {(currentObject as SimpleNote).background_url && (
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
          <img
            src={(currentObject as SimpleNote).background_url}
            alt="Ambient"
            className="w-full h-full object-cover blur-[80px] scale-125"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-nexus-950/40 via-nexus-950/60 to-nexus-950" />
        </div>
      )}

      <WikiNavigation
        registry={registry}
        selectedId={selectedId}
        currentObject={currentObject}
        onSelect={handleSelect}
        onBack={handleGoBack}
        handleScrollToSection={handleScrollToSection}
      />

      <article
        ref={articleRef}
        className="flex-1 overflow-y-auto no-scrollbar scroll-smooth relative z-10"
      >
        <div className="max-w-5xl mx-auto px-8 py-20 lg:px-24 lg:py-24 pb-64">
          <WikiHeader
            currentObject={currentObject}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onUpdateObject={onUpdateObject}
            handleGenerateBg={handleGenerateBg}
            isGeneratingBg={isGeneratingBg}
            onBack={handleGoBack}
            onBackToDirectory={handleBackToDirectory}
          />

          {isL ? (
            <WikiSection
              node={currentObject}
              depth={0}
              visited={new Set()}
              registry={registry}
              editingNodeId={editingNodeId}
              editData={editData}
              currentObject={currentObject}
              onSelect={handleSelect}
              handleStartEdit={handleStartEdit}
              handleSaveEdit={handleSaveEdit}
              setEditData={setEditData}
              setEditingNodeId={setEditingNodeId}
            />
          ) : viewMode === 'NOTE' ? (
            <div className="relative">
              {showSaveSuccess && (
                <div className="absolute -top-12 right-0 bg-nexus-essence text-white px-6 py-2 rounded-full text-[10px] font-display font-black uppercase tracking-widest shadow-lg shadow-nexus-essence/20 animate-in slide-in-from-bottom-2 duration-300 flex items-center gap-2">
                  <FileCheck size={14} /> Records Synchronized
                </div>
              )}
              <WikiSection
                node={currentObject}
                depth={0}
                visited={new Set()}
                registry={registry}
                editingNodeId={editingNodeId}
                editData={editData}
                currentObject={currentObject}
                onSelect={handleSelect}
                handleStartEdit={handleStartEdit}
                handleSaveEdit={handleSaveEdit}
                setEditData={setEditData}
                setEditingNodeId={setEditingNodeId}
              />
            </div>
          ) : (
            <WikiEncyclopediaView
              currentArtifact={currentArtifact}
              currentObject={currentObject}
              isGenerating={isGenerating}
              handleCommitToRegistry={handleCommitToRegistry}
              handleGenerateEncyclopedia={handleGenerateEncyclopedia}
              registry={registry}
              onSelect={handleSelect}
              onBack={handleGoBack}
            />
          )}
        </div>
      </article>
    </div>
  );
};
