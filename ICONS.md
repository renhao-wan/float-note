# FloatNote 图标系统

## 概述

FloatNote 使用统一的品牌图标系统，所有图标都基于 SVG 源文件自动生成。

## 文件结构

```
float-note/
├── public/
│   ├── logo.svg          # 主品牌图标（高分辨率）
│   └── favicon.svg       # 简化版 favicon
├── src-tauri/icons/      # Tauri 应用图标
│   ├── 32x32.png
│   ├── 128x128.png
│   ├── 128x128@2x.png
│   ├── icon.png          # 512x512
│   ├── icon.ico          # Windows 图标
│   ├── icon.icns         # macOS 图标
│   └── icon.iconset/     # macOS 图标集
├── docs/                 # 文档站点图标
│   ├── favicon-32x32.png
│   ├── icon-128.png
│   └── icon.png
└── landing/public/       # Landing 页面
    ├── logo.svg
    └── logo.png
```

## 图标设计

新图标设计理念：
- **浮动窗口**：代表 FloatNote 的核心功能——浮动笔记窗口
- **蓝紫渐变**：与项目现有的配色方案一致
- **毛玻璃效果**：体现应用的现代美学
- **AI 星标**：暗示 AI 原生特性
- **浮动阴影**：强调空间感和浮动概念

## 重新生成图标

如果需要修改图标设计，按以下步骤操作：

1. 编辑 `public/logo.svg` 源文件
2. 运行生成脚本：
   ```bash
   python generate_icons.py
   ```
3. 在 macOS 上生成真正的 ICNS 文件（可选）：
   ```bash
   iconutil -c icns src-tauri/icons/icon.iconset -o src-tauri/icons/icon.icns
   ```

## macOS ICNS 文件

当前的 `icon.icns` 是使用 Pillow 生成的基础版本。为了获得最佳的 macOS 图标质量，建议在 macOS 系统上使用 `iconutil` 工具重新生成：

```bash
# 在 macOS 上执行
cd src-tauri/icons
iconutil -c icns icon.iconset -o icon.icns
```

这将生成包含所有必要分辨率的高质量 ICNS 文件。

## 更新记录

- 2026-06-04：完成图标系统重构
  - 删除旧的 Vite 默认图标和占位 logo
  - 设计新的品牌图标（浮动窗口概念）
  - 生成所有必要的图标尺寸
  - 更新所有引用位置
