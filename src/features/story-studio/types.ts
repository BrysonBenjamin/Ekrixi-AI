export type StudioStage = 'BLUEPRINT' | 'SPINE';

export type BlockType =
  | 'THESIS'
  | 'DELTA'
  | 'CONTEXT'
  | 'LATENT_UNIT'
  | 'ORACLE_PROMPT'
  | 'IMPORT_NODE'
  | 'LITERARY_APPROACH';

export interface StudioBlock {
  id: string;
  type: BlockType;
  data: Record<string, unknown>;
}

export type RightWidgetMode = 'CHAT' | 'LIBRARY' | 'NOTES' | null;

export interface LiteraryArchetype {
  id: string;
  label: string;
  type: 'Linear' | 'Nonlinear' | 'Expansionist' | 'Classical' | 'Non-Traditional';
  icon: React.ComponentType<{ size?: number; className?: string }>;
  desc: string;
  hook: string;
  slides: Array<{
    title: string;
    content: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    visual?: string;
  }>;
}
