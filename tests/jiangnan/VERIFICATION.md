# 烟雨江南升级验收

日期：2026-10-26。仅验收江南；没有操作主浏览器 exbeam-product，会话名为 jiangnan-upgrade。其他 18 个模块不在本记录内，不需要据此重复测试。

## 实装功能

- 保留原 Three.js、jiangnan.glb、tank.glb、导航碰撞、六章战役与护送路线。战场始终为全幅三维世界，没有换成说明卡片。
- graphite 半透明 HUD，mint / coral / cyan 状态，所有面板边角不超过 8px、字距为 0；本地 Lucide 图标与工具提示，不重复父级产品标题。
- 分步任务、真实 A* 路线、装填/装甲/烟幕状态和命中反馈；遮挡下仍能识别玩家位置与车体朝向。
- 暂停、地图暂停、失焦保护、从本章重开、结束行动后返回整备；暂停和离场停止战斗、释放触控，隐藏时不渲染，菜单降低渲染频率。
- 每 8 秒与关键操作保存章节内检查点，恢复玩家/敌车/护送车/资源/波次/任务计时；保留原 v2 解锁存档。
- 护送车在 12 米内且受损比例更高时可共享修理包修复；过远或挡路会等待，不传送。
- 真实行动结算：时间、击毁、命中、承受伤害、装甲与补给车保留比例，明确三星阈值。
- 入口 HTTP/构建标识验证、ready 握手、超时/资源失败/WebGL 丢失后的重试，卸载释放 RAF、音频、图形资源。

## 已通过的操作证据

| 范围 | 操作与实际断言 |
| --- | --- |
| 原有规则 | core.test.mjs 的 18 项全部通过；4389 个导航格、56 个碰撞体、27 处新增建筑；六章与桥梁连通性正常。 |
| 新增规则 | session.test.mjs 的 10 项全部通过；包含坏存档、锁定章节、错误整备、非法敌车/波次、护送车生命/路段、修复优先级、评分阈值、触控方向和消息来源。合计 28/28。 |
| 实际三维像素 | 1440×900 WebGL readPixels：80810 个亮色采样、806 种量化颜色；原 GLB 战场非空白。 |
| 键盘驾驶 | 真实 keydown / keyup W，玩家实际位移大于 0.5 游戏单位；地图存在非空导航路线。 |
| 炮弹与补给 | 实际 fire / 扫掠弹道命中：侦察车血量低于 52、hits 增加；Q 将玩家 35 装甲修到 77；E 消耗一次烟幕，库存 2 → 1。 |
| 暂停与恢复 | P 与 M 打开时模拟时间保持不变；刷新后提供“从检查点继续”，恢复位置、77 装甲和烟幕库存；失败可恢复该检查点；重开时间归零、满甲、shots 归零。 |
| 六章条件 | 清敌并到达目标、8 秒占领、南岸到达、完整护送路径、粮仓清剿、40 秒两波守塔均进入对应结算；通关删除检查点。 |
| 救援与护送 | 补给车装甲 60 → 102，修理包 3 → 2；离队会等待；刷新恢复 102 装甲、当前路段及位置，再沿原路径抵达。 |
| 三指触控 | CDP 真实多点事件同时送达两个摇杆与开火键。专项最终测试从 (-68,-36) 移动到约 (-59.197,-35.788)，位移 8.81 游戏单位，shots=1，瞄准输入同时非零。 |
| 暂停后重新接管 | 按住三指时 P 暂停，move/aim 全归零、fire=false；取消触摸、继续行动后，两个摇杆和开火键均可重新接管；最终抬手全部归零。已修复旧 pointer 捕获残留导致无法再次接管的问题。 |
| 响应式 | 1440×900、1024×768、390×844、844×390、390×600 均检查任务、地图、状态、按钮、摇杆的边界与互相重叠，全部通过；横屏地图/开火键重叠已修复，紧凑竖屏使用全图按钮保留地图访问。 |
| 入口 404 | 模拟入口 404，父容器显示重试，不挂载错误 iframe。 |
| 假成功 | 有构建标识但没有游戏的页面触发 onLoad 后仍在 loading；错误 origin、错误 source、非法 detail 的 ready 消息均不能改变为成功。 |
| 资源失败 | 模拟 tank.glb 503，显示错误并移除失败 iframe；解除故障后点击重新进入，真实资源与握手成功。该轮控制台的 404/503 为有意注入，不是未解释的线上错误。 |
| WebGL 恢复 | 实际调用 WEBGL_lose_context，父容器出现错误并移除旧 frame；重新进入后 ready=true、disposed=false。 |
| 离场 | 卸载 React 容器，子页面 pagehide 调用 dispose，测试标记写入本机，iframe 数量变为 0。 |
| 静态检查 | JiangnanGameApp.tsx 独立 TypeScript 检查通过；campaign-game.js 语法检查通过；限定范围 git diff --check 无输出。两个入口新增 EOF 空行已移除。 |

## 截图索引

以下为真实浏览器截图，不是设计稿：

- [桌面战斗与任务 HUD](../../output/playwright/jiangnan-desktop.png)
- [1024×768 平板与双摇杆](../../output/playwright/jiangnan-tablet.png)
- [390×844 手机竖屏](../../output/playwright/jiangnan-portrait.png)
- [844×390 手机横屏](../../output/playwright/jiangnan-landscape.png)
- [390×600 紧凑窗口](../../output/playwright/jiangnan-compact.png)
- [触控位移与暂停后重新接管专项](../../output/playwright/jiangnan-touch-motion.png)
- [章节结算面板](../../output/playwright/jiangnan-results.png)

## 文件清单

修改：

- components/JiangnanGameApp.tsx
- public/games/jiangnan/index.html
- public/games/jiangnan/campaign.html
- public/games/jiangnan/campaign-game.js
- public/games/jiangnan/campaign-core.js（仅光圈颜色描述）
- public/games/jiangnan/README-campaign.md

新增：

- public/games/jiangnan/campaign-session.js
- public/games/jiangnan/campaign-bridge.js
- public/games/jiangnan/campaign-hud.css
- public/games/jiangnan/hud-icons.svg
- public/games/jiangnan/HUD-ICONS-LICENSE.txt
- tests/jiangnan/session.test.mjs
- tests/jiangnan/browser-upgrade.mjs
- tests/jiangnan/browser-touch.mjs
- tests/jiangnan/embed.html
- tests/jiangnan/VERIFICATION.md

没有更改共享 App、共享 CSS、package 或其他模块，没有删除/替换原 GLB、legacy.html、game.js、physics.js，没有 commit/push，没有还原其他脏文件。

## 父级接口与边界

本次不需要新增 journal 桥接，没有把打开游戏或 ready 当成通关，也不向 journal 发送完成记录。

生命周期接口已在 JiangnanGameApp 内接通：

```js
// 子 → 父，仅状态，不是学习/通关证据
{ type: 'jiangnan:status', protocol: 1,
  status: 'loading' | 'ready' | 'error', detail: '最多 300 字符的状态' }

// 父 → 子
{ type: 'jiangnan:command', protocol: 1,
  command: 'hello' | 'suspend' | 'dispose' }
```

双方校验同源 origin、准确的 iframe/parent source 和 payload；targetOrigin 为明确的 location.origin。hello 请求当前状态，suspend 保存并暂停，dispose 保存并释放。握手超时 120 秒，资源超时 90 秒。

验收边界：

- 六章条件使用 ?test=1 定位、清敌和加速检查真实任务逻辑，不是宣称人工完整打通六章；结算截图来自测试档，不能作为真实用户完成证据。普通入口不暴露 test 操纵方法。
- 图形与触控验收使用桌面 Chromium 及 CDP 多点触控，不是 iPhone/iPad 实机 Safari，也不承诺硬件帧率。没有进行长时间 GPU/内存压力测试。
- 检查点是本机保存，恢复时不保留空中炮弹/粒子，有 3 秒重新接应时间；浏览器拒绝存储会明确提示。没有云存档、联网对战或抗本地篡改承诺。
- 全仓类型/构建由主级整合验收，本轮只声明江南独立组件的类型检查通过，不替代其他模块结果。
