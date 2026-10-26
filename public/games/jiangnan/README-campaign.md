# 江南 · 烟雨归航（战役扩展版）

复用现有 Blender 导出的 assets/jiangnan.glb、assets/tank.glb、Three.js、Draco 和 Water；不改动原模型，也不修改网站其他应用。

## 内容
200 × 154 游戏单位的地图边界，六个区域，27 处新增民居/仓库，三座 12 单位宽平桥；原台阶古桥继续禁行。地图、青岚镇及角色为虚构。

六章：雾中来电（清剿与抵达）、码头复电（清剿后占领）、绕桥南渡（过桥接应）、一车灯火（护送）、粮仓回响（重装守卫）、烟雨归航（两波守塔）。

四种敌车属性、独立炮塔、后坐力、履带、扫掠碰撞、前后侧伤害差别、敌车寻路、烟幕、修理包、战术/跟随视角、大小地图、暂停/失焦保护、失败重试、三星评分、章节解锁、装甲/装填/引擎升级、本地存档、三档难度、两档画质及自动降档。

本次升级沿用上述战役与原模型，增加：分步任务状态、依据真实 A* 导航网格绘制的行动路线、章节中途检查点、护送车就近修复、独立结算统计，以及 graphite / mint / coral / cyan HUD。工具按钮使用本地 Lucide 图标，授权见 HUD-ICONS-LICENSE.txt。没有新增 AI 服务或联网依赖。

烟幕是简化游戏规则：7 秒内敌车不锁定玩家，不会阻挡已经发射的炮弹。补给车与玩家相距 4.4–24 单位时移动；玩家挡路或离队都会等待。不是现实装甲和弹药系统模拟。

## 运行和回退
在仓库根目录执行 `python -m http.server 4173 --directory public`，打开 `http://localhost:4173/games/jiangnan/index.html`。Vite 下也必须使用完整的 index.html 地址，目录地址可能回退到网站首页。不能直接双击 HTML 使用 file 协议。

原版入口保存在 legacy.html，仍使用未改动的 game.js、physics.js 和 style.css。将 legacy.html 还原为 index.html 即可回退。campaign.html 与新版 index.html 相同。

## 操作
电脑：WASD/方向键驾驶，鼠标瞄准，按住左键或空格开火。Q 修理、E 烟幕、C 视角、M 全图、P/Esc 暂停。

触屏：左摇杆驾驶，右摇杆瞄准，方向相对当前相机；按住开火按钮连射，支持三指分别操作。抬手、取消触摸、失焦、暂停会释放输入。菜单可手动开关触控。每章无限普通弹、三个修理包、两次烟幕。

Q / 修理：默认修复自身 42 装甲。补给车在 12 米内且装甲比例比自身更低时，优先修复补给车，共用同一修理包及 6 秒冷却；满血不会消耗资源。护送车辆仍按原路线与真实战场碰撞前进，不会自动传送。地图青色虚线为静态地形可通行路线，不是自动驾驶，不会绕开临时车辆。

原保存键 jiangnan.campaign.v2 保持兼容，仍保存解锁章节、最高星级、补给点和升级。新增 jiangnan.checkpoint.v1 保存当前章节的玩家位置、朝向、装甲、弹药冷却、敌车状态、护送车位置与路段、任务计时/波次、修理/烟幕库存及伤害统计。

行动开始、每 8 秒、击毁敌车、修理/烟幕、暂停、打开地图及离场时保存检查点。刷新后可继续；失败可恢复最近检查点，也可从本章起点重开。成功结算会删除检查点，重玩不会重复发放星章奖励。难度与升级在有检查点时锁定；暂停菜单中的“结束行动并整备”会放弃本次中途进度并解锁难度/整备，保留已获星章与补给点。检查点校验版本、有限数值、解锁范围、整备配置、敌车类型/数量、波次、护送车生命/路段与地形碰撞，不可信或不兼容的数据不会直接恢复。

恢复时清除空中的炮弹/粒子，提供 3 秒重新接应时间；这不是逐帧回放。拒绝本地存储时显示提示，本次仍可游玩。无登录、云存档或联网对战。

结算显示行动时间、击毁、命中率、承受伤害、装甲和补给车保留比例。一星为完成章节；装甲保留至少 40% 加一星；非护送章留存至少一个修理包、护送章补给车保留至少 60% 再加一星。结算统计为本次行动，不是跨设备排行榜。

## 嵌入与生命周期
JiangnanGameApp 先验证入口 HTTP 状态与构建标识，再挂载 iframe。onLoad 只请求握手，只有真实 GLB / 导航载入并完成首次渲染才报告 ready。父子双方验证 postMessage 的 origin、source、协议和消息形状；不向 journal 发送完成事件，也不会把进入游戏当成通关。

资源失败、脚本失败、WebGL 上下文丢失会提供重新载入；入口握手有 120 秒超时，游戏资源有 90 秒超时。页面隐藏/失焦暂停战斗；暂停菜单降低渲染频率；离场保存、停止 RAF/音频并释放渲染资源，iframe 导航/卸载销毁其工作线程。重试不会删除原模型或已解锁章节。

## 文件职责
campaign-core.js 为纯规则、章节、存档校验、碰撞和 A*；campaign-session.js 为纯检查点校验、任务步骤、修复目标与评分规则；campaign-layout.js 为确定性布局与碰撞数据；campaign-world.js 渲染新增实例化模型；campaign-game.js 加载原 GLB，处理控制、战斗、任务、界面；campaign-bridge.js 管理嵌入协议和启动错误；campaign.css + campaign-hud.css / campaign.html 提供响应式界面。

新增建筑由实时程序化网格生成；这次没有重新编辑或交付新 Blender 工程。逐栋高精度美术、破坏系统、多人联机、云存档不在本次范围。

## 验证
`node --test tests/jiangnan/core.test.mjs` 包含 18 项规则/导航测试，优先读取真实 navigation.json；缺少资产时读取原版导航快照夹具。

`node --test tests/jiangnan/core.test.mjs tests/jiangnan/session.test.mjs` 同时运行新增的检查点、受损车辆修复优先级、评分阈值、相机相对触控方向、任务状态和消息验证测试。

使用独立 Playwright CLI 会话，在端口 8888 的 Vite 服务下运行：

```sh
PWCLI="$HOME/.codex/skills/playwright/scripts/playwright_cli.sh"
"$PWCLI" -s=jiangnan-upgrade open http://127.0.0.1:8888/games/jiangnan/index.html
"$PWCLI" -s=jiangnan-upgrade run-code "$(cat tests/jiangnan/browser-upgrade.mjs)"
```

browser-upgrade.mjs 检查真实 canvas 像素、键盘移动、炮弹伤害、暂停/地图、刷新恢复/失败重试/重开、六章条件、护送修复、三指输入释放、横竖屏布局，以及入口 404、伪握手、模型失败重试和卸载。tests/jiangnan/embed.html 只用来隔离验证 React 容器，不替换真实产品入口。截图位于 output/playwright/jiangnan-*.png。

`browser-touch.mjs` 是暂停后手指重新接管的专项回归，也在独立触控 context 内验证同时驾驶/瞄准/开火的真实位移、取消触摸和再次按下。运行方式与 browser-upgrade.mjs 相同。具体结果、截图索引与测试边界见 tests/jiangnan/VERIFICATION.md，不需要重复其他模块的验收。

安装 playwright==1.57.0 后执行 `python -m playwright install chromium`，再运行 `python tests/jiangnan/browser_smoke.py`。测试加载原 GLB，验证实际炮弹伤害、六章流程、护送、暂停、刷新恢复及 Chromium 多点触控事件，输出截图和 JSON。?test=1 是允许操纵本机测试进度的测试入口；普通入口仅提供状态读取。

GitHub Actions 输出 jiangnan-campaign-preview 工件。没有真实 iPad 硬件帧率数据，软件 WebGL 的 FPS 不应当作移动端性能承诺。
