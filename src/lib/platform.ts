// src/lib/platform.ts

/**
 * 检测当前平台是否为 macOS
 */
export const isMac = (): boolean => {
  return navigator.platform.includes('Mac');
};

/**
 * 检测主修饰键（macOS: Cmd, Windows/Linux: Ctrl）
 */
export const isPrimaryModifier = (e: KeyboardEvent): boolean => {
  return isMac() ? e.metaKey : e.ctrlKey;
};

/**
 * 获取平台对应的修饰键符号（macOS: ⌘, Windows/Linux: Ctrl）
 */
export const getModifierSymbol = (): string => {
  return isMac() ? '⌘' : 'Ctrl';
};

/**
 * 获取平台对应的快捷键显示文本
 * @param key - 按键字母（如 'N', 'K'）
 * @param modifiers - 修饰键数组（如 ['shift', 'alt']）
 */
export const getShortcutDisplay = (key: string, modifiers: string[] = []): string => {
  const parts: string[] = [getModifierSymbol()];
  if (modifiers.includes('shift')) parts.push('⇧');
  if (modifiers.includes('alt')) parts.push(isMac() ? '⌥' : 'Alt');
  parts.push(key);
  return parts.join('');
};
