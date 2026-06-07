# 主题系统

## 内置主题

FloatNote 内置 15 个主题：

| 主题 | ID | 风格 |
|------|-----|------|
| Obsidian Observatory | `midnight-ink` | 琥珀暖光 · 深色 |
| Dark Forest | `dark-forest` | 森林绿意 · 深色 |
| Cosmic Dusk | `cosmic-dusk` | 紫色黄昏 · 深色 |
| Morning Mist | `morning-mist` | 晨雾灰调 · 浅色 |
| Warm Parchment | `warm-parchment` | 羊皮纸暖调 · 浅色 |
| Pure Mono | `pure-mono` | 纯粹黑白 · 深色 |
| Inverse Void | `inverse-void` | 反色虚空 · 浅色 |
| Terminal Green | `terminal-green` | 终端绿光 · 深色 |
| Cyberpunk Neon | `cyberpunk-neon` | 赛博朋克 · 深色 |
| Executive Suite | `executive-suite` | 商务风格 · 深色 |
| Pastel Dream | `pastel-dream` | 柔和梦幻 · 浅色 |
| Zen Garden | `zen-garden` | 禅意花园 · 浅色 |
| High Contrast Dark | `high-contrast-dark` | 高对比度 · 深色 |
| Autumn Harvest | `autumn-harvest` | 秋收暖调 · 深色 |
| Arctic Frost | `arctic-frost` | 极地冰霜 · 浅色 |

## 主题结构

```typescript
interface Theme {
  id: string;
  name: string;
  description?: string;
  fonts: {
    editor: string;      // 编辑器字体
    preview: string;     // 预览字体
    ui: string;          // UI 字体
  };
  colors: {
    background: string;  // 背景色
    foreground: string;  // 前景色
    primary: string;     // 主色调
    secondary: string;   // 次要色
    accent: string;      // 强调色
    muted: string;       // 柔和色
    border: string;      // 边框色
  };
  editor: {
    background: string;
    foreground: string;
    lineHighlight: string;
    selection: string;
  };
  codeTheme: string;     // 代码高亮主题
}
```

## 自定义主题

### 创建主题

1. 复制现有主题配置
2. 修改颜色和字体
3. 保存到配置文件

### 主题文件位置

主题配置存储在应用配置中：

```json
{
  "appearance": {
    "theme": "midnight-ink",
    "customThemes": []
  }
}
```

## 字体配置

### 内置字体

| 字体 | 用途 |
|------|------|
| JetBrains Mono | 编辑器（等宽） |
| Source Serif 4 | 预览（衬线） |
| Outfit | UI（无衬线） |

### 自定义字体

支持系统字体，在设置中配置：
- 编辑器字体
- 预览字体
- 应用字体
- 字体大小
- 行高

## 代码高亮

使用 highlight.js 的 `atom-one-dark` 主题作为默认代码高亮样式。

支持的语言包括：
- JavaScript/TypeScript
- Python
- Rust
- Go
- Java
- C/C++
- 等 180+ 种语言
