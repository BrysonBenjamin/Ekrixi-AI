import { useState } from 'react';
import { useLLM } from '../../system/hooks/useLLM';
import { GEMINI_MODELS } from '../../../core/llm';
import {
  NexusObject,
  SimpleNote,
  SimpleLink,
  isLink,
  isReified,
  WikiArtifact,
} from '../../../types';

interface UseWikiGenerationProps {
  registry: Record<string, NexusObject>;
  currentObject: NexusObject | null;
  selectedId: string | null;
  onUpdateObject: (id: string, updates: Partial<NexusObject>) => void;
}

export const useWikiGeneration = ({
  registry,
  currentObject,
  selectedId,
  onUpdateObject,
}: UseWikiGenerationProps) => {
  const { generateContent } = useLLM();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingBg, setIsGeneratingBg] = useState(false);
  const [artifacts, setArtifacts] = useState<Record<string, WikiArtifact>>({});

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

  // Helper to commit artifact to node
  const commitEncyclopediaToNode = () => {
    if (selectedId && artifacts[selectedId] && currentObject) {
      const artifact = artifacts[selectedId];
      onUpdateObject(currentObject.id, {
        encyclopedia_content: artifact.content,
        weaving_protocol: artifact.weaving_protocol || '',
        last_modified: new Date().toISOString(),
      });
      return true;
    }
    return false;
  };

  return {
    isGenerating,
    isGeneratingBg,
    artifacts,
    handleGenerateBg,
    handleGenerateEncyclopedia,
    commitEncyclopediaToNode,
  };
};
