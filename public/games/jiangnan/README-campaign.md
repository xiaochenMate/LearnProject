# 江南 · 烟雨归航（战役扩展版）

复用现有 Blender 导出的 assets/jiangnan.glb、assets/tank.glb、Three.js、Draco 和 Water；不改动原模型，也不修改网站其他应用。

## 内容
200 × 154 游戏单位的地图边界，六个区域，27 处新增民居/仓库，三座 12 单位宽平桥；原台阶古桥继续禁行。地图、青岚镇及角色为虚构。

六章：雾中来电（清剿与抵达）、码头复电（清剿后占领）、绕桥南渡（过桥接应）、一车灯火（护送）、粮仓回响（重装守卫）、烟雨归航（两波守塔）。

四种敌车属性、独立炮塔、后坐力、履带、扫掠碰撞、前后侧伤害差别、敌车寻路、烟幕、修理包、战术/跟随视角、大小地图、暂停/失焦保护、失败重试、三星评分、章节解锁、装甲/装填/引擎升级、本地存档、三档难度、两档画质及自动降档。

烟幕是简化游戏规则：7 秒内敌车不锁定玩家，不会阻挡已经发射的炮弹。补给车与玩家相距 4.4–24 单位时移动；玩家挡路或离队都会等待。不是现实装甲和弹药系统模拟。

## 运行和回退
在仓库根目录执行 `python -m http.server 4173 --directory public`，打开 `http://localhost:4173/games/jiangnan/`。不能直接双击 HTML 使用 file 协议。

原版入口保存在 legacy.html，仍使用未改动的 game.js、physics.js 和 style.css。将 legacy.html 还原为 index.html 即可回退。campaign.html 与新版 index.html 相同。

## 操作
电脑：WASD/方向键驾驶，鼠标瞄准，按住左键或空格开火。Q 修理、E 烟幕、C 视角、M 全图、P/Esc 暂停。

触屏：左摇杆驾驶，右摇杆瞄准，按住开火按钮连射；支持三指分别操作。菜单可手动开关触控。每章无限普通弹、三个修理包、两次烟幕。

保存的是解锁章节、最高星级、补给点和升级，不是章节中途的位置与装甲。保存键 jiangnan.campaign.v2。拒绝本地存储时显示提示。无登录、云存档或联网对战。

## 文件职责
campaign-core.js 为纯规则、章节、存档校验、碰撞和 A*；campaign-layout.js 为确定性布局与碰撞数据；campaign-world.js 渲染新增实例化模型；campaign-game.js 加载原 GLB，处理控制、战斗、任务、界面；campaign.css/campaign.html 提供响应式界面。

新增建筑由实时程序化网格生成；这次没有重新编辑或交付新 Blender 工程。逐栋高精度美术、破坏系统、多人联机、云存档不在本次范围。

## 验证
`node --test tests/jiangnan/core.test.mjs` 包含 18 项规则/导航测试，优先读取真实 navigation.json；缺少资产时读取原版导航快照夹具。

安装 playwright==1.57.0 后执行 `python -m playwright install chromium`，再运行 `python tests/jiangnan/browser_smoke.py`。测试加载原 GLB，验证实际炮弹伤害、六章流程、护送、暂停、刷新恢复及 Chromium 多点触控事件，输出截图和 JSON。?test=1 是允许操纵本机测试进度的测试入口；普通入口仅提供状态读取。

GitHub Actions 输出 jiangnan-campaign-preview 工件。没有真实 iPad 硬件帧率数据，软件 WebGL 的 FPS 不应当作移动端性能承诺。
