# Aora Bot 架构

本文是仓库的结构契约：每个目录放什么、层与层之间怎么依赖、新增一个"风格系列"要动哪里。
改动结构前先改这里。

## 1. 分层

```
@aora-bot/engine     纯 TypeScript，无 React。几何、模拟、风格系列与渲染器
      ↑
@aora-bot/react      React 原语：CharacterMark、共享舞台、头像、选择器、HUD、外观上下文、tokens
      ↑
@aora-bot/surfaces   产品/演示面：引导页、场景、模板发布、占用列表、群像舞台
      ↑
docs/                Rspress 站点：theme/ 只是外壳，app/ 是首页控制台、打赏页和文档里的演示这些应用页
```

依赖只能向上指。`docs/` 可以用任何包；包之间不能反向依赖；`docs/` 里的东西不能被包引用。
一个概念如果在 `docs/` 里被三个以上页面共享，或者是"角色是什么"的定义，就应该下沉到包里。

## 2. 引擎：模拟 → 帧快照 → 渲染器

```
CharacterOptions ──► Simulation ──step(dt)──► FrameSnapshot ──► Renderer(style).draw()
                     (状态机、弹簧、          (纯数据：点、数值、     (SVG DOM / SVG 字符串 /
                      行为、belt、HUD、        颜色描述，不含任何      像素栅格 …)
                      粒子、表情循环)          SVG 字符串)
```

- **Simulation**（`src/sim/simulation.ts`，`createSimulation(options)`）：状态机、弹簧、行为、眨眼与表情调度、belt、HUD、粒子，以及 `update()` 里的状态变更。
  它不碰 DOM，可以在 Node 里逐帧跑：`step(dt)` 推进，`snapshot()` 取帧，另有 `update / spin / bounce / burst / settle / hold / dispose`。
  同一个 seed 加同样的输入得到同样的帧；这由 `test/simulation.test.ts` 在 Node 环境里保证。宿主注入的只有三样：`followGaze`（把视口像素换成注视，模拟看不到视口）、`scheduler`（眨眼后两相的延时，默认走模拟自己的时钟）、`displaySizePx`（HUD 的最小可读尺寸判断）。
- **FrameSnapshot**（`src/sim/snapshot.ts`）：一帧角色的完整描述。几何一律是 shape space 里的点（`Point[]`、`Ring`）和变换参数，
  不是路径字符串。颜色是描述（ink 的 flat / gradient、token 名），由渲染器决定怎么落地。唯一带 SVG 假设的是字形（铅笔、感叹号）：快照只给出种类与位置，轮廓路径由渲染器按种类取。
- **Renderer**（`src/render/<style>/`）：消费快照。每个风格系列提供两个实现，共用同一套"场景构建"代码（vector 是 `render/vector/build.ts`，产出 `SceneNode` 树）：
  - live（`LiveRenderer`）：挂到宿主元素上，`draw(frame)` 把场景树增量对账进 DOM（`render/dom.ts`，按索引与标签复用节点，只写变化的属性）；
  - static（`StaticRenderer`）：把同一棵场景树序列化成字符串（`render/scene.ts`；SSR、data URL、导出）。
- **createCharacter**（`src/render/character.ts`）：是公开入口，只负责把 Simulation、所选风格的 Renderer、ticker、autoPause 接在一起。
- **静态渲染**（`renderStaticSvg`）：建一个 `still` 模拟（无随机、无运动、belt 取固定相位），`settle()` 后取一帧，交给所选风格的 `renderStatic`。因此 static 与 live 读的是同一份几何，不各算一遍。静态不做眼睛的形状补偿（`compensateEyes: false`），以保持输出字节稳定；live 做补偿，所以对 scale ≠ 1 的形状两者眼睛大小不同。

几何模块（`face/placement`、`motion/belts`、`hud/dials`、`shapes`）只输出点和数值。把点拼成 `d="..."` 是 SVG 渲染器的事。

### 形状阵容与多部件（parts）

- **阵容**：`SHAPE_IDS`（`core/types.ts`）是在役角色的目录，按家族分组、`mochi` 打头（默认形状）；每个角色在 `shapes/characters/<家族>.ts` 里有一份图纸（身体路径或采样环、脸的位置提示、可选 parts；`FamilyArt` 让编译器拦下列进家族却没画的角色，`index.ts` 汇总成 `CHARACTERS`），在 `core/cast.ts` 里有且只有一个具名成员。
  能直接用的路径原样写入图纸；稠密轮廓采样成 `shapes/loops.ts` 里的点环，再由 `smoothLoop`（Catmull-Rom）重建。
- **主环**：`ShapeDef.ring`（96 点）是形变、脸部拟合、belt 与 span 表的唯一依据。耳朵、叶子、天线这类附件不进主环，放在可选的 `ShapeDef.parts: { tone: 'body' | 'leaf' | 'inner'; outline: Point[] }[]` 里，
  与身体共用同一次归一化（外框取身体与 parts 的并集，面积取身体）。
- **快照**：`FrameSnapshot.body.parts` 带着身体的姿态变换，每个 part 附一个 `opacity`；换形状时旧 parts 淡出、新 parts 淡入（`partsFade` 弹簧），所以形变过程中不会有附件突然消失。
- **渲染**：画法都在各自的模块里，`build.ts` / 像素栅格只留最小的挂钩。
  - 向量（`render/vector/parts.ts`）：`body` 与身体同色同渐变；`leaf` 用 `--aora-leaf`（`#34B36B`，绿色身体上是 `#7BCB5A`，宿主设同名自定义属性，静态渲染直接写入十六进制）；`inner` 是 ink 与 45% 白的混合。
    `outline` / `glass` 里 body 调的 parts 与身体做多边形并集（`unionOutline`，按身体环的身份缓存）后统一描边，不留接缝；并集失败或淡入淡出途中退回逐个描边。`sticker` 的纸边与 `paper` 的硬阴影把 parts 一并包进去。`soft` 与 `riso` 多遍叠绘，body 调的 parts 每一遍都跟着身体走（`bodyPieces`）：soft 的径向高光渐变按身体外框取 `userSpaceOnUse`，耳朵吃到的明暗与它在整个形象上的位置一致，地面阴影按「身体加 body 调 parts」的外框定宽度和落点；riso 的第二色、白色提亮和网点都覆盖到 parts，leaf / inner 配件按各自颜色盖在印刷层之上。
    画材变体（`render/vector/media.ts`）不用 `partLayers`，自己从轮廓重画身体和每个 part：线描画材（pencil / neon / chalk）与 outline 一样把 body 调的 parts 并进身体轮廓、不画 inner；涂色画材（marker / crayon / watercolor）把 body 调的 parts 画在身体下面，leaf / inner / hair 用各自颜色和同一支笔画在上面。折纸（origami，几何在 `render/vector/origami.ts`）同涂色画材的分层，每个 piece 拉直成多边形后从一点折到各角，按面的朝向和山折谷折交替叠白或叠黑，折法按轮廓缓存。
  - 像素（`render/pixel/parts.ts`）：body 调的 parts 写进身体的蒙版；leaf / inner 作为带 tint 的配件按 paint id 绘制，三个变体通用。

### 主题的涂鸦、签名动作与分层绘制

- **数据与画法分开**：主题入口用 `ThemePackage.decor`（`DecorSpec`，按心情或状态排的涂鸦）和 `ThemePackage.motions`（美术部件点名的签名动作）带来自己的装饰和动作。画法在共享的 `themes/extras/` 里，打成独立的 `themes/extras.js`，由主题的 `extras: EXTRAS` 带进来；核心只留挂钩 `themes/extras-hook.ts`，主包和 `/static` 都不含画法（`test/extras.test.ts` 检查）。
- **分层绘制**：live 角色只要穿主题皮肤，或播放主题的涂鸦和动作，就分层绘制（`drawsInLayers`）。根 SVG 自己的组只留最底层，其余图层由 `themes/extras/stage.ts` 写进根 SVG 里的一个 `<foreignObject>`，每层是 HTML 盒子里的一个 SVG。身体的弹簧运动是承载图层的盒子的 transform，签名动作和涂鸦是内部盒子的 CSS 动画，所以浏览器只做合成，不重画带纹理的皮肤。关键帧写进每个文档或 shadow root 共用的一个 `<style data-aora-motion>`，按帧内容的哈希命名。
- **WebKit 的约束**：WebKit 合成 `<foreignObject>` 里的 HTML 时不套用 SVG 自身的变换。所以 `<foreignObject>` 放在根 SVG 的原点、尺寸等于显示尺寸，用它自己的 transform 抵消 viewBox，让其中一个单位等于一个 CSS 像素；只有这个变换的净效果为零，各浏览器才画在同一个位置。
- **静态输出不变**：`test/static-golden.test.ts` 钉住了分层之前的逐字节输出。

## 3. 风格系列（Style Series）

"风格系列"是比 `variant` 更高的一层：它决定角色**用什么画法**被画出来。同一个状态、同一个表情、同一个形状在每个系列里都存在，
新增状态或形状时所有系列自动获得。

| 系列 id   | 画法                                                                                                                                                             | 变体（variant）                                                                                                                                                                                                                                                                                          | 参数示例                                                                                             |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `vector`  | 平滑 SVG 路径                                                                                                                                                    | `solid`（纯色，玻璃之外都是平涂） / `outline` / `glass`（半透明着色、细边，剪影内一层光泽与高光） / `sticker` / `paper` / `soft`（径向渐变、高光、地面投影） / `riso`（错位第二色、半调网点、正片叠底） / 画材 `pencil` / `marker` / `crayon` / `watercolor` / `neon` / `chalk` / 折纸 `origami`（见下） | 线宽、贴纸边宽与投影、剪纸阴影偏移/角度/倾斜、软萌投影与高光、孔版错位与半调、手抖、纸纹、排线、辉光 |
| `pixel`   | 把快照栅格化到网格，输出合并后的 `<path>` + `crispEdges`                                                                                                         | `crisp`（实心方块） / `dot`（圆点 LED） / `block`（带缝方块）                                                                                                                                                                                                                                            | 网格分辨率、缝宽、明暗阶数、运动量化帧率、外框、辉光                                                 |
| `kaomoji` | 不画身体，用 SVG `<text>` 写颜文字：形状决定括号（`render/kaomoji/table.ts` 的 `SHAPE_WRAPPERS`，没有条目的形状用 `DEFAULT_WRAPPER` 圆括号），状态决定表情和尾巴 | `plain`（纯文字） / `bubble`（衬一块淡墨色胶囊）                                                                                                                                                                                                                                                         | 字重、是否带情绪符号                                                                                 |

注册方式（`src/styles/`）：

```ts
defineStyle({
  id: 'pixel',
  label: 'Pixel',
  variants: ['crisp', 'dot', 'block'],
  defaultVariant: 'crisp',
  defaults: { grid: 24, gap: 0.16, shades: 3, fps: 12, outline: true, glow: true },
  params: {
    grid: { type: 'number', min: 8, max: 64, step: 1 },
    // 每个 defaults 的键都必须有 params 条目，否则 defineStyle 抛错
  },
  createRenderer(host, ctx) { … },   // (host, { seed, sourceId?, styleOptions }) => LiveRenderer
  renderStatic(frame, ctx) { … },     // (FrameSnapshot, { color, uid, flat?, eyeColor?, sizePx?, colorScheme?, styleOptions }) => string
});
```

配套 API：`getStyle(id)`（未知 id 抛错并列出已注册的）、`hasStyle`、`listStyles`（内置系列按 `STYLE_IDS` 的固定顺序在前，宿主注册的按注册顺序在后；内置系列在模块加载时注册，所以顺序不能取决于导入顺序）、`STYLE_IDS` 与 `DEFAULT_STYLE_ID`（`styles/ids.ts`，默认系列 `vector` 的唯一出处，各包与站点都从这里取，不各写字面量）、`resolveStyleOptions(style, input)`（与 defaults 合并，数值夹到范围内并吸附到 step，类型不对回落默认，未知键丢弃）、`validateStyleOptions`（报告 resolve 会静默修正的问题，供宿主校验用户输入）。`CharacterOptions` 与 `StaticOptions` 用 `style` / `styleOptions` 选择系列，默认 `DEFAULT_STYLE_ID`。

参数只对部分变体生效时，在 `StyleParam.variants` 里写明；`paramsForVariant(style, variant)` 返回当前变体读到的参数（没写 `variants` 的参数对所有变体生效）。参数面板、文档里的演示都从它取，不要在 UI 里手写"哪个变体有哪些参数"。`controller.update({ style, variant, styleOptions })` 可以在运行时切换系列：换掉 renderer、保留 Simulation（状态、弹簧、待定的眨眼都不重来），新系列没有的 `variant` 回落到它的默认值。

### 脸（face style）

`FACE_STYLES` 是三种基础脸 `cute`、`eyes`、`line` 加上十种手绘脸（`DRAWN_FACE_STYLES`），默认 `cute`。脸是模拟的一部分，不属于某个系列，每种脸在每个系列里都有画法：

- `cute`：脸涂在身体上（圆点眼、小嘴、粉色腮红），44 个状态各有一组眼型 / 嘴型 / 腮红（`STATE_CUTE_EYES`、`STATE_CUTE_MOUTH`、`STATE_BLUSH`），单位是点半径；部分状态带情绪特效（`STATE_FX`：Zz、金色闪光、红色感叹号、三道线、粉心、泪滴、右上角转圈的小弧），特效是 `motion/fx.ts` 里时间的纯函数，随快照的 `fx` 字段交给渲染器，各变体用同一组颜色。belt 状态（16 个）在 `cute` 脸下**不把身体缩成小圆点**：整个角色连同脸都留着，belt 说的事改由 `motion/fx-activity.ts` 的活动特效在身体旁边说（见下表），同样走快照的 `fx`，向量、像素、颜文字三个系列自动一致。特效一律不绕着身体画：贴着轮廓的环读起来像选中框而不像角色在做事，小尺寸下还是整个角色上最抢眼的东西；加载轮、进度条、雷达波、小轨道这些「仪表」都放在右上角（`CORNER_X` / `CORNER_Y`，`motion/fx-units.ts`），和思考的三个点、Zz 同一个位置。

  | 状态          | `cute` 脸下的表达                                                                    | `eyes` / `line` 脸下的 belt |
  | ------------- | ------------------------------------------------------------------------------------ | --------------------------- |
  | thinking      | `dots`：右上角三个点依次起伏                                                         | dots                        |
  | waiting       | `ellipsis`：右上角三个点轮流抬起                                                     | orbit                       |
  | loading       | `spinner`：右上角八个点围成的加载轮，亮点转圈、身后的点渐暗                          | whirl                       |
  | progress      | `progress`：右上角一根小进度条慢慢填满再重来；HUD 给了数值时让位于 HUD               | progress                    |
  | orbit         | `orbit`：右上角一颗小行星，一颗带拖尾的卫星沿倾斜轨道绕它转                          | orbit                       |
  | messaging     | `bubbles`：两个气泡从肩上先后飘起                                                    | orbit                       |
  | radar         | `ripple`：右上角一个点向外发出两圈雷达波                                             | radar                       |
  | dictating     | `waves`：右上角三道声波依次亮起                                                      | wave                        |
  | uploading     | `rise`：两个向上的箭头升起                                                           | dock                        |
  | receiving     | `fall`：两个向下的箭头落下                                                           | receive                     |
  | sending       | `send`：一颗带拖线的点射向右上角                                                     | send                        |
  | spawning      | `gather`：金色小星从外向身体聚拢                                                     | gather                      |
  | writing       | `pencil`：右上角一支铅笔在划线（2:1 利萨如轨迹）                                     | pencil                      |
  | alerting      | `bang`：红色感叹号，和 error 同一个                                                  | bang                        |
  | powering-down | 身体变暗（`body.coreOpacity`），眼睛闭上，不出特效                                   | standby                     |
  | bouncing      | 身体自己弹跳（belt 的落体曲线以 `BELT_BODY_SHARE` 的比例作用在整个身体上），不出特效 | ball                        |

  活动特效和情绪特效同属 `FxFrame`：时间的纯函数，`settled` 帧给静态输出和减弱动效，渲染器只认 `dot` / `arc` / `line` / `pencil` 等几种图元。`beltBlend` 弹簧在 `cute` 脸下目标为 0，所以 `snapshot.belt` 为 `null`、`body.outline` 就是图纸原样。belt 只在 `eyes` / `line` 脸下接管身体（这两种脸没有特效这一套），代码在 `motion/belts.ts`；没有选项能在 `cute` 脸下启用它。

- `eyes` / `line`：另外两种脸，有各自的眼型表、嘴型表和摆放逻辑。`cute` 与它们之间用 `cuteBlend` 弹簧过渡，运行时切换不跳变。
- 手绘脸（`brow`、`glossy`、`sparkle`、`button`、`shades`、`droopy`、`bigmouth`、`pie`、`screen`、`symbol`）：cute 一族（`isCuteFamily`），沿用 cute 的点半径、眼线、腮红、特效和保留身体的腰带规则。每种脸是 `face/drawn/designs/<id>.ts` 里的一张 `FaceDesign`：布局、按名字的表情（每个表情是一组数字，19 个 cute 名字都有自己的画法）、状态表、嘴型表、颜色角色、要静音的特效、颜文字字形，以及把数字变成图层的构建函数；共用 cute 的表时在数据里直接写出来。模拟在 cute 眼睛之外再跑一对手绘眼睛（同一个 `eyeMorph` 弹簧），换脸时用 `faceFade` 交叉淡化。几何是 `FaceGeometry.drawn`：每只眼、面盘、嘴里的若干图层，每层是闭合轮廓加颜色角色（`face`、`pupil`、`feature`、`glint`、`iris`、强调色、`light`），由各渲染器按变体和配色解释（向量 `render/vector/drawn.ts`，像素 `render/pixel/drawn.ts`，颜文字 `drawnFaceText`）。放上身体前先量外廓、按头部投影检查，放不下就同时缩小并下移（`face/drawn/place.ts`）。
- 脸色是 CSS 变量：`--aora-face`（色相身体上为白，黑色身体上缺省，回落为页面底色，等于挖空）、`--aora-face-soft`（soft、crayon、watercolor 的深色脸，也是手绘脸画在身体上的眉毛和眼睛）、`--aora-face-pupil` / `--aora-face-glint`（手绘脸的瞳孔与身体上眼睛的高光，只有黑色身体需要写）、`--aora-ink2`（riso 的第二色，粉色改用金色）。宿主用 `getInkVars(color)` 一次写全，不要只写 `--aora-fg`。

约束：

- 每个系列都输出 SVG 根元素，这样 `CharacterMarkMirror` 的 `<use>`、共享舞台和静态渲染都不用分叉。canvas 输出可以作为同一系列的另一种 target。
- 风格参数只影响"画法"，不影响模拟。同一个 seed 在不同系列里眨眼时机相同。
- 网格分辨率是相对 shape space 的，不是像素；`sizePx` 变化时网格数不变，保证 16px 和 120px 是同一个像素角色。
- 颜色来自 palette 的 ink；像素系列把 ink 量化成 `shades` 阶明暗，不引入新的颜色 id。

## 4. 角色描述与分享链接

引擎里没有"角色规格"这一层：一个角色就是一份 `CharacterOptions`（运行时）或 `StaticOptions`（静态输出），React 的外观上下文（`AppearanceProvider`）提供其中外观部分的默认值。

首页控制台能设置的东西叫 `Preset`（shape、color、style、variant、state），它和分享链接的编码都只属于站点，放在 `docs/app/shared/share.ts`：

- 分享参数 `?s=` 的前缀带版本号（`aorabot1.`）；解码对每个字段做校验，注册表不认识的字段回落默认值（系列回落到 `DEFAULT_STYLE_ID`），链接不会坏。
- 代码片段（`snippet.ts`）与首页注册表（`home/registry.ts`）读同一个 `Preset`。
- 站点专属的东西（UI 状态）留在 `docs/app/`，不往引擎里塞；如果别的宿主也需要同一份描述，再下沉到引擎，而不是复制。

### 主题展的两面角色墙

主题展（`docs/app/themes/`）不写任何主题的名字。书架页 `/themes/` 的角色墙和卡册页 `/themes/<id>` 的贴纸墙都从引擎数据派生：格子数和位置来自 `THEME_MANIFEST` 的 `cards`（主题加载前就能排好、预留尺寸），每个格子里的角色由 `themeLook`（经 `catalog.ts` 的 `buildAlbum`）决定形状、颜色、皮肤和脸，再用 `renderStaticSvg` 画成静态 SVG；底色、布纹和强调色来自站点的 `looks/<id>.ts`。所以一个主题进了引擎的清单、有了自己的入口和 look 文件，两面墙就自动带上它，不用改墙的代码；引擎改进了画法，墙也跟着变。墙上的角色一律是图片（`walls/images.ts`）：静态 SVG 连同它读的页面变量、`color-scheme: light dark`，以及贴纸的白边和投影（SVG 滤镜，按贴纸格子的像素换算）一起写进一份自带样式的 SVG 文档，转成 blob URL，`decode()` 之后才以 CSS `border-image` 显示（不用 `<img>` 或背景图，装饰就不会变成页面的 LCP 元素），所以换一张只是换图，滤镜只在解码时算一次。页面已经画过的图（卡片、书册窗口的静态图，经 `walls/still.ts` 的缓存）直接拿来用；其余的在 `walls/stills.worker.ts` 的 Worker 里画，Worker 在第一次需要它时才启动（引擎的 static 入口和主题入口都能在 Worker 里跑，用的是页面已经缓存的同一批 chunk，引擎那部分和首页控制台的 Worker 共用一个 chunk），Worker 起不来时退回主线程的空闲时间片。书架墙自己不加载主题，只用书册已经装好的主题、书册窗口已经画过的图（经 `walls/still.ts` 的缓存），排行只用已经到齐的图，所以缺主题时也是均匀铺满；贴纸墙的贴纸接近视口才画，每张两层图片交叉淡入，只有屏幕上的贴纸计时，窄屏或四核以下的设备轮换的贴纸更少、换得更慢，切到后台、离开视口和减弱动效时都停下。

## 5. React 层

- **外观上下文**：`<AppearanceProvider styleId="pixel" face="line" …>` 给子树里所有角色提供默认外观；
  组件 props 覆盖上下文，嵌套的 Provider 逐字段合并。组件上的 prop 叫 `styleId`，因为 `style` 已经是内联 CSS。
  只有 `mark/` 和 `stage/` 读上下文。新增一个全局外观维度只改 Provider 和 `CharacterMark` / `StagedMark`，不用穿过几十个组件。
- **共享舞台**：外观键包含 style、variant 和 styleOptions（只取与默认值不同的参数，`{}` 与默认值共用一个源），不同系列的角色不会共用同一个源。
- 根元素输出 `data-style`、`data-variant`，供宿主 CSS 选择。
- `CharacterMark` 的 `variant` 没有固定默认值，由所选系列的 `defaultVariant` 决定。
- `@aora-bot/react` 只放通用原语。截图式场景、引导流程、带业务语义的对话框放 `@aora-bot/surfaces`。

## 6. 样式与设计令牌

- **唯一的令牌源**：`packages/react/src/styles/tokens.css`。颜色（oklch）、间距、字号、圆角、阴影、动效时长与缓动、层级都在这里。
  文档站使用同一套令牌，自己只补 `--site-*` 前缀的站点专属值。
- **深色模式只有一种机制**：令牌一律写成 `light-dark()`；页面通过 `color-scheme` 决定明暗。
  `:root` 默认 `color-scheme: light dark` 跟随系统，`.dark` / `[data-theme=dark]` / `.rp-dark` 强制 dark，`.light` / `[data-theme=light]` 强制 light。
  角色的 ink 本来就用 `light-dark()`，所以 UI 和角色永远一致。
- **类名前缀**：库用 `aora-`，站点用 `site-`，`@aora-bot/surfaces` 用 `aora-s-`。站点不得复用库的类名来定义自己的组件。
- **层**：库在 `@layer aora.*` 里；站点在 `@layer site.*` 里，并且排在库之后。不用 `!important`，对 Rspress 的覆盖除外，且要集中在一个文件里。
  完整顺序在 `docs/theme/styles/site-tokens.css` 第一行声明：`rp-base, aora.tokens, aora.base, aora.components, aora.surfaces, site.shell, site.components, site.pages`。
  Rspress 自己的 CSS 不在任何层里，普通声明会压过所有层内规则；层内的 `!important` 反过来压过未分层规则。因此对 Rspress 变量和选择器的覆盖只放在 `rspress-overrides.css`，并用 `!important`。
- **站点 CSS 文件**（都由 `docs/theme/index.tsx` 导入）：`site-tokens.css`（`--site-*`、层声明、`--aora-bg-base` 的唯一映射）、
  `rspress-overrides.css`、`shell.css`（背景、焦点环、`.site-capsule`、`.site-glow`）、`controls.css`（`.site-btn/field/menu/swatch/demo` 和滑块等共用控件）、
  `doc-components.css`（API / token / 概览 / 协议 / 图 / 状态矩阵）、`pages/{home,sponsor}.css`。
- **浮动胶囊**：站点的导航栏与首页的左 / 右 / 下三条边都是同一种胶囊：半透明纸色加 `backdrop-filter` 模糊、1px 全周环线、柔和投影，全圆角，离视口边缘 `--site-capsule-gap`。
  这套表面只在 `site-tokens.css` 的 `--site-capsule-*` 里写一次，`.site-capsule`（`shell.css`）与 `.rp-nav`（`rspress-overrides.css`）都读它们，不要在页面里另写一份。
- **站点定制库组件**：在容器上设自定义属性（如 `--aora-mark-filter`、`--aora-hud-value-size`、`--aora-bg-base`），不写 `.site-x .aora-mark {…}` 这类后代覆盖。
- **构建要求**：rslib 与 rspress 都必须设 `overrideBrowserslist` 指向支持 `light-dark()` / oklch / 嵌套的浏览器，否则 lightningcss 会把它们降级，破坏 `color-scheme` 切换。
- **静态 SVG 的明暗**：静态 SVG 自己带墨水深浅色，由 `StaticOptions.colorScheme` 选机制（共用 `render/scheme.ts`，三个系列都走它）。
  `system`（默认）写 `@media (prefers-color-scheme: dark)`，跟系统走，适合 `<img>`、data URL 和导出文件，因为 SVG 文档在这些场合看不到宿主页面。
  `page` 写 `light-dark()`，跟内联处最近的 `color-scheme` 走，适合直接内联进有自己主题开关的页面。内联进页面的调用点一律用 `page`，否则站点是浅色、系统是深色时，黑色角色会画成白色落在浅色底上。
  `page` 会进 uid 哈希，同一个角色两种方案同时出现在一页里也不会共用样式。注意 `<img>` 里的 SVG 无论如何只能跟系统走。
- 组件用容器查询做内部响应式，不用视口媒体查询。
- **不允许布局抖动**：交互状态（hover / focus / 选中 / 当前 / 展开）只改颜色、背景、`outline`、`box-shadow`（全周）、`transform`、`opacity`，
  不改 `font-weight`、`font-size`、`padding`、`margin`、边框宽度、尺寸。`transition` 只写具体的非布局属性，不写 `all`。
  会变的数字用 `tabular-nums`；异步内容和图片预留尺寸；`html` 设 `scrollbar-gutter: stable`。
- **不允许单侧加粗边框**：不用 `border-left/inline-start: 3px` 一类的色条，也不用 `inset 2px 0 0` 一类的单边内阴影。
  强调状态改用整圈细边框着色、背景着色或填充反色；下划线用 `text-decoration`。分隔线用 1px 的 `--aora-line`。

## 7. 代码约定

- **默认值只有一个出处**：默认系列是 `DEFAULT_STYLE_ID`，内置系列表是 `STYLE_IDS`（都在引擎 `styles/ids.ts`）。包与站点引用它们，不写 `'vector'` 之类的字面量；工具类（`cx`、`prefersReducedMotion`、`mulberry32`）各只有一份，surfaces 与站点从 react / engine 引入。
- **文档站的导入**：`docs/` 在运行时把 `@aora-bot/*` 别名到各包的 `src`（改包立刻生效），但 `tsc` 从各包的 `dist` 取类型，所以文档站类型检查前先 `build:lib`。站内用 `@app`（`docs/app`）与 `@theme`（`docs/theme`）别名，不写跨目录的相对路径。
- **两套 i18n，各管一边**：站点壳（导航、控制台文案、`docs/i18n.json`）用 Rspress 的 `useI18n`；角色与场景相关的名字（形状、颜色、状态、表情、系列、变体、状态分组、脸、鼻子）用 react 的 `useLocale` / `useLabel`。`useLabel` 的访问器覆盖所有这些 id 族，调用方不写 `as LocaleKey`、不自己拼 `shape.${id}` 键。只在站内、一句中英对照的数据（表格里的说明）用 `useLocalized()`，不在组件里写 `isZh ? … : …`。
- **派生状态不用 effect**：由 props 派生的值直接在渲染里算；"值变了才更新"用 `utils/hooks.ts` 的 `useStable(value, keyOf)`，"回调总是最新的"用 `useLatest(value)`；props 变化后要重置的 state，用"渲染期间调整 state"的写法（比较上一次的值，`setState` 在渲染里），不写 `useEffect(() => setState(…), [prop])`。
- **lint 例外**：只有 effect 真的在桥接外部系统（`EventSource` 连接状态、动画触发）时才允许关规则，写成 `// oxlint-disable-next-line <规则> -- 原因`，一行、带原因、只盖一行；不写整文件或整块的 disable。规则以 oxlint 的 react-compiler 规则为准。
- **测试**：每个包的 `test/` 与源码目录同构；react 与 surfaces 在 `vitest.config.ts` 里指向 `test/setup.ts`，由它统一设 `IS_REACT_ACT_ENVIRONMENT`，测试文件里不各写一份。
- **构建配置**：三个包的 `tsconfig.json` 继承根目录 `tsconfig.base.json`；rslib / rspress 共用的浏览器目标与 React 库配置在 `scripts/build-shared.ts`。
- **注释**：只写代码本身说不出的约束与原因；不写"这里在做什么"，不留 `TODO` / `FIXME`。

## 8. 目录

```
packages/engine/src/
  core/          types、palette、cast、leaf、options（CharacterOptions / StaticOptions）
  math/          弹簧、缓动、哈希、pose（含切线变换）、path-builder、polyline、round
  shapes/        角色图纸（characters、loops、svg-path）、注册表、脸部拟合
  face/          眼睛拓扑、变形、鼻子与嘴、布局（输出点）
  motion/        状态表、行为、belt、glyph
  hud/           spec、dials（输出图元）、format
  agent/         情绪协议、仲裁、适配器、通道、精灵清单
  sim/           simulation（createSimulation）、snapshot（FrameSnapshot）、particle-frames
  styles/        ids（STYLE_IDS、DEFAULT_STYLE_ID）、types、registry（defineStyle 等）、各系列定义（vector / pixel / kaomoji）
  render/        renderer（LiveRenderer / StaticRenderer 接口）、scene（SceneNode 与序列化）、
                 scheme（静态 SVG 的深浅色）、dom（对账）、vector/、pixel/、kaomoji/、
                 static-svg.ts、character.ts（装配）
  effects/       confetti
packages/react/src/
  mark/ stage/ avatar/ picker/ hud/ activity/ agent/ sprite/ editor/ effects/   原语
  appearance/ locale/ styles/ utils/                                           外观上下文、i18n、令牌与样式、通用 hooks
packages/surfaces/src/     walkthrough/ scenes/ template/ occupancy/ cast/ locale/ styles/
docs/theme/                Rspress 外壳与文档内嵌组件（components/：ApiTable、StateMatrix、StyleParamsDemo …；styles/；generated/）
docs/app/                  home/（控制台 + 角色墙） themes/（主题展：书架、卡册、looks/、walls/） sponsor/ shared/（share、snippet、i18n、families …）
docs/content/{en,zh}/      mdx（两种语言的页面一一对应，构建时检查）
```

## 9. 新增一个风格系列的清单

1. `engine/src/render/<id>/`：live renderer 与 static renderer，只读 `FrameSnapshot`。
2. `engine/src/styles/<id>.ts`：`defineStyle` 注册，声明 variants、defaults、参数范围。
3. 测试：每个 `CHARACTER_STATES` 配至少 3 个形状的静态输出快照；live renderer 的生命周期测试。
4. 参数校验（`validateStyleOptions`）自动覆盖（基于 defaults 与范围声明）；只对部分变体生效的参数写 `variants`。
5. 首页控制台的风格栏根据注册表自动出现，不需要手写 UI。
6. `docs/content/{en,zh}/design/styles/<id>.mdx`。
