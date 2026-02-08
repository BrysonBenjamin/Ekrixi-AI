export const safeParseJson = <T>(text: string, fallback: T): T => {
  try {
    // 1. Try stripping markdown code blocks
    const cleaned = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    return JSON.parse(cleaned);
  } catch (e) {
    // 2. If that fails, try to extract the first JSON array or object
    try {
      const firstOpen = text.indexOf('[');
      const lastClose = text.lastIndexOf(']');
      if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
        const candidate = text.substring(firstOpen, lastClose + 1);
        return JSON.parse(candidate);
      }

      const firstOpenObj = text.indexOf('{');
      const lastCloseObj = text.lastIndexOf('}');
      if (firstOpenObj !== -1 && lastCloseObj !== -1 && lastCloseObj > firstOpenObj) {
        const candidate = text.substring(firstOpenObj, lastCloseObj + 1);
        return JSON.parse(candidate);
      }
    } catch (innerError) {
      console.warn('JSON Extraction Failed:', innerError);
    }

    console.warn('JSON Parse Warning:', e);
    return fallback;
  }
};
