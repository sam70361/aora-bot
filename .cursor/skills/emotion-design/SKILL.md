---
name: emotion-design
description: 设计与新增 Emotion Ball 表情:眼环池选择、动画原语参数、关键帧序列、体色与双语文案规范。Use when adding or tuning emotions in js/emotions.js, designing new expression behaviors, choosing eye-ring pools, or adjusting the emotion ball's visual language.
---

# Emotion Ball 表情设计

## 视觉语言(硬约束)

- 表情差异只靠四件事表达:**眼环池轮换、目光方向、身体姿态(位移/旋转/缩放)、体色**。不新增图形元素(嘴、眉毛、手等)。
- 体色基准为陶瓷白 `#F3F0EA`;情绪色只用于强表达(生气/出错红 `#E4574A`、害羞粉 `#F4D3D0`),灰调降饱和用于低能量态(睡眠/休眠/失落)。
- 克制原则:单个表情叠加的 `anims` 不超过 3 条;振幅宁小勿大(目光 ±2~11,身体位移 ±1~9)。
- 特效是事件不是常态:`ribbons` / `confetti` 只在进入表情时触发一次;常驻效果仅有 `body.orbit`(思考环带)与 `body.zzz`(睡眠字母)。

## 眼环池速查(EXPRESSIONS 索引)

| 情绪族 | 索引 |
|---|---|
| 平静 | 0, 8 |
| 笑眼 | 2, 11, 17, 19 |
| 圆睁 | 3, 21 |
| 闭合 / 困倦 | 13, 22, 4 |
| 斜眼 / 无奈 | 14, 5, 23 |
| 怒目 | 7, 16 |
| 扫读 / 检索 | 15, 9, 20, 12, 18 |
| 聆听 | 10, 1 |
| 羞怯 | 24 |

## 配置字段

```js
{
  id: '10',                    // 两位字符串;00-07 生命周期,10-21 情绪,30-41 代理,50+ 自定义
  name: '开心', group: 'emotion',
  desc: '…', en: { name: 'Happy', desc: '…' },   // 双语文案必填
  transition: 380,             // 切入过渡 ms(兴奋类 180-400,低能量态 700-1200)
  gaze: true,                  // false = 不注视鼠标(睡眠/停止类)
  pool: [2, 11, 17, 19],       // 眼环索引池
  poolMs: [2500, 4500],        // 池内轮换间隔;poolSpeed: 10 用于高速轮换(检索)
  blinkMs: [2500, 5000],       // 眨眼间隔;null = 不眨(睡眠/加载类)
  openness: 1,                 // 常驻开合度(疲惫 0.55、睡眠 0.08)
  antics: true,                // 待机随机自旋/弹跳(仅放松类表情开启)
  body: { breathe: 0.012, color: '#F6EFE4', zzz: 0, orbit: 0, ribbons: 0, confetti: 0 },
  eyes: { both: {...}, left: {...}, right: {...} },
  anims: [...], sequence: {...}
}
```

## 动画原语(anims 条目)

| type | 效果 | 关键参数 |
|---|---|---|
| `sine` | 正弦漂移 | `amp, period, phase` |
| `glance` | 平滑方波,两端停留(左看看右看看/点头) | `amp, period` |
| `pulse` | 0→amp 节奏缩放 | `amp, period` |
| `jitter` | 伪噪声抖动,可衰减 | `amp, speed, decay(ms)` |
| `scan` | 三角波快速扫动 | `amp, period` |
| `blink` | 周期闭合(交替眨眼用 `phaseMs` 错峰) | `interval, dur, phaseMs` |

`target`: `eyes / body / left / right`;`prop`: `lookX / lookY / x / y / scale / open / rotate`。

## 关键帧序列(sequence)

- `settle: 'base'` 播完回落基础姿态(惊讶、接收任务);`'hold'` 定格末帧(害羞变粉、生气变红);`{ next: '02' }` 播完切换表情(唤醒 → 待机)。
- **缩略图一致性规则**:`settle: 'hold'` 且序列改变体色时,`body.color` 基础值必须等于序列终态色,否则静态缩略图与实际观感不一致。

## 新增表情工作流

```
- [ ] 选 id 分段与 group,name/desc/en 双语齐全
- [ ] 从眼环池速查表挑 2~5 个索引组成 pool
- [ ] 配 poolMs / blinkMs / openness / antics
- [ ] anims 不超过 3 条,振幅克制
- [ ] 如有 sequence,检查 settle 语义与体色一致性规则
- [ ] 浏览器验证:缩略图静态帧可辨识、悬停动画正确、主舞台切入过渡自然
```

引擎与渲染层(`js/engine.js` / `js/ball.js`)是稳定基座,新增表情只改 `js/emotions.js`;需要新动画原语时才扩展 `ANIM_TYPES`。
