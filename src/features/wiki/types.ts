import { NexusObject, NexusCategory, NexusType, HierarchyType } from '../../types';

export type WikiViewMode = 'NOTE' | 'ENCYCLOPEDIA';

export interface WikiEditData {
  _type?: NexusType;
  verb?: string;
  verb_inverse?: string;
  hierarchy_type?: HierarchyType;
  gist?: string;
  prose_content?: string;
  encyclopedia_content?: string;
  weaving_protocol?: string;
  title?: string;
  aliases?: string[];
  tags?: string[];
  category_id?: NexusCategory;
  is_author_note?: boolean;
  background_url?: string;
}

export interface TocItem {
  id: string;
  title: string;
  depth: number;
}

export interface WikiConnection {
  linkId: string;
  verb: string;
  neighbor: NexusObject;
}
