---
name: emotion-integration
description: 将 Emotion Ball 集成到宿主应用:SDK 实例化选项、AI emotionId 协议、事件与方法、多实例性能、桌面宠物 / Electron 悬浮窗接入。Use when embedding the emotion ball in another page or app, wiring AI output to expressions, using the EmotionBall SDK, or building a desktop pet / floating assistant.
---

# Emotion Ball 集成实践

## 最小接入

按顺序引入四个脚本(无构建、无依赖),然后创建实例:

```html
<script src="js/rings.js"></script>
<script src="js/emotions.js"></script>
<script src="js/ball.js"></script>
<script src="js/engine.js"></script>
<div id="bot" style="width:200px;height:200px"></div>
<script>
  var ball = EmotionBall.create(document.getElementById('bot'), {
    emotion: '02', idle: true
  });
</script>
```

`js/i18n.js` 与 `js/app.js` 属于展示站,宿主接入不需要。

## AI 协议

AI 只输出一段 JSON,交给 `handleAIMessage`(接受对象或字符串):

```js
ball.handleAIMessage('{"emotionId":"30","tips":"正在思考用户问题"}');
```

- 未知 `emotionId`、JSON 解析失败、缺字段 → 触发 `error` 事件并自动回退待机(`fallbackId`,默认 `'02'`),永不白屏。
- `tips` 为可选的展示文案,通过 `tips` 事件透出,由宿主决定如何呈现。

## 创建选项

| 选项 | 默认 | 说明 |
|---|---|---|
| `emotion` | `'02'` | 初始表情 ID |
| `shape` | `'blob'` | 体型:`blob` 圆胖 / `wedge` 三角 / `gem` 菱形 |
| `color` / `eyeColor` | — | 主题实例体色 / 眼色,优先于表情配置的体色 |
| `eyeScale` | `1` | 眼睛放大倍率;小于 80px 的实例建议 `1.5~1.8` 保证可读 |
| `idle` | `false` | 待机行为(自动眨眼节律与偶发小动作) |
| `autostart` | `true` | `false` 时只渲染静态帧不进 rAF 循环(缩略图用) |
| `lite` | 跟随 autostart | 精简模式:关闭彩带 / 彩纸特效 |
| `fallbackId` | `'02'` | 未知 ID 的回退表情 |

## 事件与方法

```js
ball.on('change', e => {});         // { id, def, auto }
ball.on('tips',   e => {});         // { text }
ball.on('error',  e => {});         // { message, ... }

ball.setEmotion('21');
ball.setGaze(nx, ny);               // 归一化目光 [-1,1],宿主自行监听 pointermove
ball.setStyle({ sketch: 1 });       // 线稿模式
ball.spin(3); ball.burst(24); ball.bounce();
ball.startTour(ids, 2500); ball.stopTour();
ball.setActive(false);              // 视口外停帧省电,true 恢复
ball.renderStatic();                // 停帧状态下渲染一张当前表情静态帧
ball.registerEmotion(raw);          // 运行时注册自定义表情
ball.destroy();
EmotionBall.config.exportConfig();  // 导出 / 导入全部表情 JSON
```

## 鼠标注视接线

引擎不监听 DOM,由宿主换算归一化坐标(内部已做球面投影与平滑):

```js
addEventListener('pointermove', e => {
  var r = el.getBoundingClientRect(),
      cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  ball.setGaze(
    Math.max(-1, Math.min(1, (e.clientX - cx) / 300)),
    Math.max(-1, Math.min(1, (e.clientY - cy) / 300))
  );
});
```

滚动或布局变化后需重新取 rect;多实例共用一次 pointermove 分发即可。

## 多实例性能

- 所有实例共享同一个 rAF 心跳,实例数量不影响循环数。
- 缩略图墙:`autostart:false` 静态渲染,悬停时 `setActive(true)`、移出 `setActive(false)`。
- 用 IntersectionObserver 在视口外调 `setActive(false)`。

## 桌面宠物 / Electron 要点

- 窗口:`transparent:true, frame:false, alwaysOnTop:true, skipTaskbar:true, resizable:false`;页面背景透明,只留小球容器。
- 忽略鼠标事件穿透:`win.setIgnoreMouseEvents(true, { forwardMouseMove:true })`,配合 forwardMouseMove 仍可驱动 `setGaze`。
- AI 消息经主进程 IPC 转发:`ipcRenderer.on('emotion', (_, msg) => ball.handleAIMessage(msg))`。
- 托盘菜单映射常用状态(待机 / 睡眠 / 停止),退出前调 `ball.destroy()`。
- 小尺寸悬浮窗(≤120px)建议 `eyeScale: 1.5` 与 `lite: true`。
