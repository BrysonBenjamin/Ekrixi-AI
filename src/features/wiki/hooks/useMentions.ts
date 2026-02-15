import { useState, useMemo } from 'react';
import { NexusObject, SimpleNote, isLink } from '../../../types';

interface ScryMenuState {
  query: string;
  pos: number;
}

export const useMentions = (registry: Record<string, NexusObject>) => {
  const [atMenu, setAtMenu] = useState<ScryMenuState | null>(null);

  const checkMentionTrigger = (text: string, cursorPosition: number) => {
    const beforeCursor = text.slice(0, cursorPosition);
    const lastAt = beforeCursor.lastIndexOf('@');

    // Check if @ is recent and not followed by a space (unless it's part of the query?)
    // Actually legacy logic was: !beforeCursor.slice(lastAt).includes(' ')
    // This implies we stop searching if there's a space.
    // But names have spaces. The legacy logic might have been restrictive or intended for "start of mention".
    // Let's stick to simple logic: Trigger if @ is the last "token" start.

    if (lastAt !== -1) {
      const query = beforeCursor.slice(lastAt + 1);
      // Allow spaces in query? Legacy used `replace(/_/g, ' ')`.
      // If we want to support spaces in names, we need a better trigger strategy or just allow it until a newline or special char.
      // For now, let's replicate legacy behavior: if no space in between @ and cursor (OR maybe legacy allowed it? wait)

      // Legacy: !beforeCursor.slice(lastAt).includes(' ')
      // This means NO spaces allowed in the query string while typing.
      // So user types @My_Page to find "My Page".

      if (!beforeCursor.slice(lastAt).includes(' ')) {
        setAtMenu({ query: query, pos: cursorPosition });
        return;
      }
    }

    setAtMenu(null);
  };

  const suggestions = useMemo(() => {
    if (!atMenu) return [];

    // Legacy logic: query.replace(/_/g, ' ') to match against titles with spaces
    const q = atMenu.query.replace(/_/g, ' ').toLowerCase();
    const allItems = Object.values(registry) as NexusObject[];

    return allItems
      .filter((n) => !isLink(n) && (n as SimpleNote).title?.toLowerCase().includes(q))
      .slice(0, 15) as SimpleNote[];
  }, [atMenu, registry]);

  const insertMention = (
    originalText: string,
    mentionTitle: string,
    currentCursorPos: number,
  ): { newText: string; newCursorPos: number } => {
    if (!atMenu) return { newText: originalText, newCursorPos: currentCursorPos };

    const before = originalText.slice(0, atMenu.pos);
    const after = originalText.slice(atMenu.pos);
    const lastAt = before.lastIndexOf('@');

    if (lastAt === -1) return { newText: originalText, newCursorPos: currentCursorPos };

    const linkText = `[[${mentionTitle}]]`;
    const newText = before.slice(0, lastAt) + linkText + after;

    setAtMenu(null);
    return {
      newText,
      newCursorPos: lastAt + linkText.length,
    };
  };

  return {
    atMenu,
    suggestions,
    checkMentionTrigger,
    insertMention,
    closeMenu: () => setAtMenu(null),
  };
};
