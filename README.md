# PMX on Web

本项目是一个基于 WebGL 的 PMX 渲染器，可以在浏览器中加载 PMX 模型并进行渲染。

> 本项目模型来自 [原神官方提供的素材](https://www.aplaybox.com/u/680828836/model)，使用时请遵守其相关协议。

### TODO

- [ ] 模型表情区域的设计：
    + `开始说话`(点击后)->[按钮变红]`暂停说话`(点击后)->`继续说话`
    + 原 `暂停说话` 变为 `加载音频`，用户可以自己加载音频进行说话表情测试（加载后，`开始说话` 按钮无论 innerHTML 变成什么都变回 *开始说话*）

- [ ] 说话测试时的音频 demo 更换

- [ ] 音频转表情的算法

- [ ] new branch: 在网页底部可以拖起一个对话框，用于和模型对话
    + 对话基于 openai api 获取回复文本
    + 文本基于 VITS 训练特定模型人物的音频
    + 加载音频并自动播放

### 模型动作

<img src="assets/motion.gif" alt="motion" style="zoom:20%;" />

### 模型姿势

<img src="assets/pose.png" alt="pose" style="zoom:20%;" />

### 模型表情

<img src="assets/face.png" alt="face" style="zoom:20%;" />
