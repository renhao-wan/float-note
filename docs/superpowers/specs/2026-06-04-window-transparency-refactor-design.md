# 窗口透明度重构设计文档

**日期**：2026-06-04
**作者**：Claude Code
**状态**：已批准
**版本**：1.0

---

## 1. 概述

### 1.1 背景

FloatNote 是一个空间笔记应用，支持将笔记拖拽为独立的浮动窗口。当前透明度实现存在以下问题：

- 配置字段混乱（顶层 `opacity` 和 `appearance.windowOpacity` 并存）
- 仅支持 macOS（Windows/Linux 返回错误）
- 主窗口和分离窗口的透明度逻辑混合
- 代码结构不清晰，难以维护和扩展

### 1.2 目标

1. **删除主窗口透明度逻辑** - 简化架构
2. **为分离窗口实现跨平台透明度** - 支持 macOS、Windows、Linux
3. **使用策略模式** - 清晰的架构，易于扩展
4. **统一配置** - 消除字段混乱

### 1.3 范围

- ✅ 分离窗口透明度控制
- ❌ 主窗口透明度（删除相关逻辑）
- ✅ 三平台支持（macOS、Windows、Linux）
- ✅ 策略模式架构
- ✅ 配置迁移

---

## 2. 需求

### 2.1 功能需求

#### FR-1：分离窗口透明度控制
- **描述**：用户可以调整分离窗口的透明度
- **范围**：0.2（20%）到 1.0（100%）
- **默认值**：0.9（90%，轻微透明）
- **步长**：0.1（10% 一档）
- **UI**：标题栏滑块控件

#### FR-2：透明度持久化
- **描述**：每个分离窗口的透明度独立存储
- **行为**：
  - 新窗口使用全局默认值
  - 可单独覆盖某个窗口的透明度
  - 关闭窗口后重新打开，透明度保持
  - 重启应用后，透明度设置恢复

#### FR-3：跨平台支持
- **macOS**：使用 `NSWindow.setAlphaValue` API
- **Windows**：使用 `SetLayeredWindowAttributes` API
- **Linux**：使用 X11 `_NET_WM_WINDOW_OPACITY` 或 Wayland 透明度

#### FR-4：配置迁移
- **描述**：旧配置自动迁移到新结构
- **行为**：
  - 删除顶层 `opacity` 字段
  - 删除 `appearance.windowOpacity` 字段
  - 添加 `appearance.detachedWindowOpacity` 字段
  - 保留旧值用于迁移

### 2.2 非功能需求

#### NFR-1：性能
- 透明度变化应立即生效（< 100ms）
- 滑块拖动时不应有明显延迟
- 避免频繁调用系统 API（使用防抖）

**防抖实现**：
```typescript
// 在 DetachedWindowOpacitySlider 组件中
const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

const handleSliderChange = (value: number[]) => {
  const newOpacity = value[0];
  setOpacity(newOpacity); // 立即更新 UI
  
  // 防抖：停止拖动 100ms 后才应用透明度
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  
  const timer = setTimeout(() => {
    applyOpacity(newOpacity);
  }, 100);
  
  setDebounceTimer(timer);
};
```

#### NFR-2：可靠性
- 平台不支持时优雅降级
- 窗口关闭后操作不崩溃
- 错误时显示友好提示

#### NFR-3：可维护性
- 清晰的策略模式架构
- 各平台逻辑独立
- 易于扩展新平台

---

## 3. 架构设计

### 3.1 整体架构

```
src/lib/transparency/
├── types.ts                    # 策略接口和类型定义
├── strategy-manager.ts         # 策略管理器（单例）
├── strategies/
│   ├── macos.ts               # macOS 实现
│   ├── windows.ts             # Windows 实现
│   └── linux.ts               # Linux 实现
├── constants.ts               # 常量定义
└── index.ts                   # 统一导出
```

### 3.2 核心组件

#### 3.2.1 TransparencyStrategy 接口

```typescript
export interface TransparencyStrategy {
  /**
   * 设置窗口透明度
   * @param windowLabel 窗口标签（Tauri 窗口标识）
   * @param opacity 透明度值（0.2-1.0）
   */
  setOpacity(windowLabel: string, opacity: number): Promise<void>;
  
  /**
   * 获取窗口透明度
   * @param windowLabel 窗口标签
   * @returns 当前透明度值
   */
  getOpacity(windowLabel: string): Promise<number>;
  
  /**
   * 检查当前平台是否支持系统级透明
   */
  isSupported(): boolean;
  
  /**
   * 获取平台名称（用于日志和调试）
   */
  getPlatformName(): string;
}
```

#### 3.2.2 StrategyManager

```typescript
export class TransparencyStrategyManager {
  private strategy: TransparencyStrategy;
  private opacityStates: Map<string, WindowOpacityState> = new Map();
  
  constructor() {
    this.strategy = this.createStrategy();
  }
  
  /**
   * 根据当前平台创建策略实例
   */
  private createStrategy(): TransparencyStrategy {
    const platform = navigator.platform.toLowerCase();
    
    if (platform.includes('mac')) {
      return new MacOSTransparencyStrategy();
    } else if (platform.includes('win')) {
      return new WindowsTransparencyStrategy();
    } else if (platform.includes('linux')) {
      return new LinuxTransparencyStrategy();
    }
    
    // 默认回退到 macOS 策略（开发环境）
    console.warn('[TRANSPARENCY] Unknown platform, falling back to macOS strategy');
    return new MacOSTransparencyStrategy();
  }
  
  /**
   * 设置窗口透明度
   */
  async setOpacity(windowLabel: string, opacity: number): Promise<void> {
    const clampedOpacity = Math.max(
      TRANSPARENCY_CONFIG.range.min,
      Math.min(TRANSPARENCY_CONFIG.range.max, opacity)
    );
    
    await this.strategy.setOpacity(windowLabel, clampedOpacity);
    
    this.opacityStates.set(windowLabel, {
      windowLabel,
      opacity: clampedOpacity,
      isCustom: clampedOpacity !== TRANSPARENCY_CONFIG.defaultOpacity,
    });
  }
  
  /**
   * 获取窗口透明度
   */
  async getOpacity(windowLabel: string): Promise<number> {
    const state = this.opacityStates.get(windowLabel);
    if (state) {
      return state.opacity;
    }
    return TRANSPARENCY_CONFIG.defaultOpacity;
  }
  
  /**
   * 检查是否支持系统级透明
   */
  isSupported(): boolean {
    return this.strategy.isSupported();
  }
  
  /**
   * 获取当前平台名称
   */
  getPlatformName(): string {
    return this.strategy.getPlatformName();
  }
  
  /**
   * 重置窗口透明度为默认值
   */
  async resetOpacity(windowLabel: string): Promise<void> {
    await this.setOpacity(windowLabel, TRANSPARENCY_CONFIG.defaultOpacity);
  }
  
  /**
   * 获取所有窗口的透明度状态
   */
  getAllWindowStates(): WindowOpacityState[] {
    return Array.from(this.opacityStates.values());
  }
}

// 单例导出
export const transparencyManager = new TransparencyStrategyManager();
```

#### 3.2.3 平台策略实现

**macOS 策略**：
```typescript
export class MacOSTransparencyStrategy implements TransparencyStrategy {
  async setOpacity(windowLabel: string, opacity: number): Promise<void> {
    await invoke('set_detached_window_opacity', {
      windowLabel,
      opacity,
    });
  }
  
  async getOpacity(windowLabel: string): Promise<number> {
    return await invoke<number>('get_detached_window_opacity', {
      windowLabel,
    });
  }
  
  isSupported(): boolean {
    return true;
  }
  
  getPlatformName(): string {
    return 'macOS';
  }
}
```

**Windows 策略**：
```typescript
export class WindowsTransparencyStrategy implements TransparencyStrategy {
  async setOpacity(windowLabel: string, opacity: number): Promise<void> {
    await invoke('set_detached_window_opacity_windows', {
      windowLabel,
      opacity,
    });
  }
  
  async getOpacity(windowLabel: string): Promise<number> {
    return await invoke<number>('get_detached_window_opacity_windows', {
      windowLabel,
    });
  }
  
  isSupported(): boolean {
    return true;
  }
  
  getPlatformName(): string {
    return 'Windows';
  }
}
```

**Linux 策略**：
```typescript
export class LinuxTransparencyStrategy implements TransparencyStrategy {
  async setOpacity(windowLabel: string, opacity: number): Promise<void> {
    await invoke('set_detached_window_opacity_linux', {
      windowLabel,
      opacity,
    });
  }
  
  async getOpacity(windowLabel: string): Promise<number> {
    return await invoke<number>('get_detached_window_opacity_linux', {
      windowLabel,
    });
  }
  
  isSupported(): boolean {
    return true;
  }
  
  getPlatformName(): string {
    return 'Linux';
  }
}
```

### 3.3 数据流

```
用户拖动滑块 → UI 组件 → StrategyManager → 平台策略 → 系统 API
                                    ↓
                              更新 AppConfig
                                    ↓
                              持久化到磁盘
```

---

## 4. 配置设计

### 4.1 AppConfig 修改

**删除**：
```typescript
// 顶层字段
opacity: number;  // 删除

// appearance 中
windowOpacity?: number;  // 删除
```

**新增**：
```typescript
appearance: {
  // ... 现有字段
  detachedWindowOpacity?: number;  // 新增：分离窗口默认透明度
}
```

### 4.2 默认配置

```typescript
export const defaultConfig: AppConfig = {
  // 删除顶层 opacity
  alwaysOnTop: false,
  appearance: {
    // ... 现有默认值
    detachedWindowOpacity: 0.9,  // 新增默认值
  },
};
```

### 4.3 配置迁移

```typescript
export const migrateConfig = (config: any): AppConfig => {
  const migratedAppearance = {
    ...defaultConfig.appearance,
    ...(config.appearance || {}),
  };
  
  // 迁移旧的 opacity 字段到新位置
  if (config.opacity !== undefined && migratedAppearance.detachedWindowOpacity === undefined) {
    migratedAppearance.detachedWindowOpacity = config.opacity;
  }
  
  // 删除旧的 windowOpacity 字段
  delete migratedAppearance.windowOpacity;
  
  return {
    ...defaultConfig,
    ...config,
    appearance: migratedAppearance,
  };
};
```

### 4.4 config-store 修改

**删除**：
```typescript
updateOpacity: (opacity: number) => Promise<void>;
```

**新增**：
```typescript
updateDetachedWindowOpacity: (opacity: number) => Promise<void>;
```

---

## 5. UI 设计

### 5.1 DetachedWindowOpacitySlider 组件

**位置**：`src/components/windows/DetachedWindowOpacitySlider.tsx`

**功能**：
- 显示透明度滑块（0.2-1.0）
- 显示当前透明度百分比
- 显示透明度图标（眼睛）
- 实时预览透明度变化
- 拖动结束后应用并保存

**Props**：
```typescript
interface DetachedWindowOpacitySliderProps {
  windowLabel: string;
  initialOpacity?: number;
  onOpacityChange?: (opacity: number) => void;
}
```

**UI 结构**：
```
[眼睛图标] [滑块] [百分比]
```

### 5.2 DetachedNoteWindow 修改

**标题栏布局**：
```
[标题] [透明度滑块] [置顶] [最小化] [最大化] [关闭]
```

**集成方式**：
```typescript
<div className="flex items-center justify-between h-12 px-4">
  <div className="flex items-center gap-2">
    <TitleEditor ... />
  </div>
  
  <div className="flex items-center gap-2">
    <DetachedWindowOpacitySlider
      windowLabel={windowLabel}
      initialOpacity={opacity}
      onOpacityChange={(newOpacity) => setOpacity(newOpacity)}
    />
    {/* 其他控件 */}
  </div>
</div>
```

### 5.3 删除组件

**删除**：`src/components/settings/TransparencyControls.tsx`

**原因**：主窗口不需要透明度控制，分离窗口的透明度在标题栏直接控制。

---

## 6. 后端设计

### 6.1 Rust 命令

#### macOS 命令
```rust
#[tauri::command]
pub async fn set_detached_window_opacity(
    app: AppHandle,
    window_label: String,
    opacity: f64,
) -> Result<(), String> {
    let window = app.get_webview_window(&window_label)
        .ok_or("Window not found")?;
    
    #[cfg(target_os = "macos")]
    {
        let ns_window = window.ns_window().map_err(|e| e.to_string())? as id;
        unsafe {
            let _: () = msg_send![ns_window, setAlphaValue: opacity];
        }
        Ok(())
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        Err("Not implemented for this platform".to_string())
    }
}
```

#### Windows 命令
```rust
#[tauri::command]
pub async fn set_detached_window_opacity_windows(
    app: AppHandle,
    window_label: String,
    opacity: f64,
) -> Result<(), String> {
    let window = app.get_webview_window(&window_label)
        .ok_or("Window not found")?;
    
    #[cfg(target_os = "windows")]
    {
        // 使用 Windows API: SetLayeredWindowAttributes
        // 需要调用 user32.dll 的 SetLayeredWindowAttributes 函数
        // 实现细节在实施阶段完成
        todo!("Implement Windows opacity - 使用 Win32 API")
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        Err("Not Windows platform".to_string())
    }
}
```

#### Linux 命令
```rust
#[tauri::command]
pub async fn set_detached_window_opacity_linux(
    app: AppHandle,
    window_label: String,
    opacity: f64,
) -> Result<(), String> {
    let window = app.get_webview_window(&window_label)
        .ok_or("Window not found")?;
    
    #[cfg(target_os = "linux")]
    {
        // 使用 X11: _NET_WM_WINDOW_OPACITY 属性
        // 或 Wayland: wp_alpha 协议
        // 实现细节在实施阶段完成
        todo!("Implement Linux opacity - 使用 X11/Wayland API")
    }
    
    #[cfg(not(target_os = "linux"))]
    {
        Err("Not Linux platform".to_string())
    }
}
```

#### 获取透明度命令
```rust
#[tauri::command]
pub async fn get_detached_window_opacity(
    app: AppHandle,
    window_label: String,
) -> Result<f64, String> {
    let window = app.get_webview_window(&window_label)
        .ok_or("Window not found")?;
    
    #[cfg(target_os = "macos")]
    {
        let ns_window = window.ns_window().map_err(|e| e.to_string())? as id;
        let opacity: f64 = unsafe { msg_send![ns_window, alphaValue] };
        Ok(opacity)
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        // 其他平台从配置中读取
        Ok(1.0) // 默认不透明
    }
}
```

### 6.2 命令注册

在 `src-tauri/src/lib.rs` 中注册新命令：

```rust
.invoke_handler(tauri::generate_handler![
    // 现有命令
    set_window_opacity,  // 删除或保留用于其他用途
    set_window_always_on_top,
    
    // 新增命令
    set_detached_window_opacity,
    set_detached_window_opacity_windows,
    set_detached_window_opacity_linux,
])
```

---

## 7. 错误处理

### 7.1 错误类型

1. **平台不支持** - 回退到默认策略，静默失败
2. **窗口未找到** - 清理状态，记录警告
3. **权限错误** - 显示用户友好提示
4. **API 调用失败** - 记录错误，显示通用提示

### 7.2 回退策略

```typescript
private createDefaultStrategy(): TransparencyStrategy {
  return {
    setOpacity: async (windowLabel: string, opacity: number) => {
      console.warn('[TRANSPARENCY] Default strategy: opacity not supported');
      // 静默失败，不抛出错误
    },
    getOpacity: async (windowLabel: string) => {
      return TRANSPARENCY_CONFIG.defaultOpacity;
    },
    isSupported: () => false,
    getPlatformName: () => 'Default (Unsupported)',
  };
}
```

### 7.3 用户友好错误提示

```typescript
{error && (
  <div className="absolute top-full left-0 mt-1 p-2 bg-destructive/10 text-destructive text-xs rounded">
    {t('opacity.error')}
  </div>
)}
```

---

## 8. 测试策略

### 8.1 单元测试

**测试文件**：`src/lib/transparency/__tests__/strategy-manager.test.ts`

**测试用例**：
- 透明度范围限制（clamp）
- 窗口状态更新
- 默认值处理
- 重置透明度

### 8.2 集成测试

**测试文件**：`src/lib/transparency/__tests__/integration.test.ts`

**测试用例**：
- 真实窗口标签操作
- 多窗口独立透明度
- 配置持久化

### 8.3 手动测试清单

**基本功能**：
- [ ] 新分离窗口默认透明度为 90%
- [ ] 拖动滑块可以调整透明度（0.2-1.0）
- [ ] 透明度变化立即生效
- [ ] 透明度百分比显示正确

**持久化**：
- [ ] 关闭窗口后重新打开，透明度保持
- [ ] 重启应用后，透明度设置恢复
- [ ] 每个窗口的透明度独立存储

**边界情况**：
- [ ] 滑块拖到最小值（20%）时窗口仍可见
- [ ] 滑块拖到最大值（100%）时完全不透明
- [ ] 快速拖动滑块不会导致崩溃

**错误处理**：
- [ ] 窗口关闭后滑块操作不崩溃
- [ ] 平台不支持时显示友好提示
- [ ] 网络/权限错误时有错误提示

**平台特定**：
- [ ] macOS: 系统级透明正常工作
- [ ] Windows: 分层窗口透明正常工作
- [ ] Linux: X11/Wayland 透明正常工作

---

## 9. 实现计划

### 9.1 阶段 1：基础设施（优先级：高）
1. 创建透明度模块目录结构
2. 定义类型和常量
3. 实现策略管理器

### 9.2 阶段 2：平台策略（优先级：高）
1. macOS 策略（复用现有逻辑）
2. Windows 策略（Win32 API）
3. Linux 策略（X11/Wayland）

### 9.3 阶段 3：配置集成（优先级：高）
1. 修改 AppConfig 类型
2. 更新 config-store
3. 配置迁移

### 9.4 阶段 4：UI 组件（优先级：中）
1. 创建透明度滑块组件
2. 集成到分离窗口标题栏
3. 删除旧组件

### 9.5 阶段 5：清理和测试（优先级：中）
1. 删除主窗口透明度逻辑
2. 编写测试
3. 文档更新

### 9.6 时间估算

- **阶段 1-2**：2-3 小时（核心功能）
- **阶段 3**：1 小时（配置集成）
- **阶段 4**：1-2 小时（UI 组件）
- **阶段 5**：1-2 小时（清理和测试）

**总计**：5-8 小时

---

## 10. 风险和缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Windows API 调用失败 | 高 | 实现回退策略，使用 CSS 透明 |
| Linux 窗口管理器差异 | 中 | 检测桌面环境，适配不同 API |
| 旧配置迁移失败 | 中 | 保留旧字段兼容，渐进式迁移 |
| 性能问题（频繁调用） | 低 | 实现防抖，限制调用频率 |

---

## 11. 附录

### 11.1 术语表

- **分离窗口**：从主窗口拖拽出的独立浮动窗口
- **策略模式**：定义一系列算法，把它们一个个封装起来，并且使它们可互相替换
- **系统级透明**：使用操作系统原生 API 实现的窗口透明
- **CSS 透明**：使用 CSS 样式实现的视觉透明效果

### 11.2 参考资料

- Tauri v2 窗口 API 文档
- macOS NSWindow 文档
- Windows SetLayeredWindowAttributes 文档
- X11 _NET_WM_WINDOW_OPACITY 规范

### 11.3 变更历史

| 版本 | 日期 | 作者 | 描述 |
|------|------|------|------|
| 1.0 | 2026-06-04 | Claude Code | 初始设计文档 |

---

**文档结束**
