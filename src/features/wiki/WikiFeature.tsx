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
} from '../../types';
import { FileCheck } from 'lucide-react';
import { WikiNavigation } from './components/WikiNavigation';
import { WikiHeader } from './components/WikiHeader';
import { WikiRegistryView } from './components/WikiRegistryView';
import { WikiEncyclopediaView } from './components/WikiEncyclopediaView';
import { WikiSection } from './components/WikiSection';

interface WikiFeatureProps {
  registry: Record<string, NexusObject>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onUpdateObject: (id: string, updates: Partial<NexusObject>) => void;
}

type WikiViewMode = 'NOTE' | 'ENCYCLOPEDIA';

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
  const [editData, setEditData] = useState<any>({});
  const articleRef = useRef<HTMLDivElement>(null);

  const currentObject = useMemo(() => {
    if (!selectedId) return null;
    return registry[selectedId] || null;
  }, [selectedId, registry]);

  const handleStartEdit = (obj: NexusObject) => {
    if (isLink(obj) && !isReified(obj)) {
      setEditData({
        _type: obj._type,
        verb: obj.verb,
        verb_inverse: obj.verb_inverse,
        hierarchy_type: (obj as any).hierarchy_type || HierarchyType.PARENT_OF,
        gist: (obj as any).gist || '',
        prose_content: (obj as any).prose_content || '',
      });
    } else {
      setEditData({
        title: (obj as any).title || (obj as any).verb,
        gist: (obj as any).gist || '',
        prose_content: (obj as any).prose_content || '',
        aliases: [...((obj as any).aliases || [])],
        tags: [...((obj as any).tags || [])],
        category_id: (obj as any).category_id || NexusCategory.CONCEPT,
        is_author_note: (obj as any).is_author_note || false,
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
            parts: [
              {
                text: `A cinematic high-quality background illustration for a first-class logical unit titled "${(currentObject as any).title || (currentObject as any).verb}". Description: ${(currentObject as any).gist}. Atmospheric, evocative, slightly abstract conceptual art.`,
              },
            ],
          },
        ],
      });

      const result = await response.response;
      let imgUrl = '';
      const parts = result.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if ((part as any).inlineData) {
          imgUrl = `data:image/png;base64,${(part as any).inlineData.data}`;
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
        .map((n: any) => `- ${n.title || n.verb}: ${n.gist}`)
        .join('\n');

      const systemInstruction = `
                ACT AS: The Grand Chronicler of the Ekrixi AI Nexus.
                TASK: Write a definitive, high-fidelity encyclopedia entry for the logical unit known as "${(currentObject as any).title || (currentObject as any).verb}".
                Knowledge Context: Summary: ${(currentObject as any).gist}. Records: ${(currentObject as any).prose_content || 'N/A'}.
                Project Scope: ${projectSummary}
            `;

      const response = await generateContent({
        model: GEMINI_MODELS.PRO,
        systemInstruction: systemInstruction,
        contents: [{ parts: [{ text: 'Write the encyclopedia entry.' }] }],
        generationConfig: { temperature: 0.2 },
      });

      const result = await response.response;
      const artifact: WikiArtifact = {
        node_id: selectedId,
        content: result.text() || 'Connection lost.',
        generated_at: new Date().toISOString(),
        context_depth: 2,
        graph_version: `v1`,
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
        prose_content: currentArtifact.content,
        last_modified: new Date().toISOString(),
      });
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000);
      setViewMode('NOTE');
    }
  };

  if (!selectedId || !currentObject) {
    return <WikiRegistryView registry={registry} onSelect={onSelect} />;
  }

  const isL = isLink(currentObject) && !isReified(currentObject);

  return (
    <div className="flex flex-col h-full bg-nexus-950 overflow-hidden md:flex-row relative font-sans">
      {(currentObject as any).background_url && (
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
          <img
            src={(currentObject as any).background_url}
            alt="Ambient"
            className="w-full h-full object-cover blur-[80px] scale-125"
            onError={(e) => {
              (e.target as any).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-nexus-950/40 via-nexus-950/60 to-nexus-950" />
        </div>
      )}

      <WikiNavigation
        registry={registry}
        selectedId={selectedId}
        currentObject={currentObject}
        onSelect={onSelect}
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
              onSelect={onSelect}
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
                onSelect={onSelect}
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
              onSelect={onSelect}
            />
          )}
        </div>
      </article>
    </div>
  );
};
