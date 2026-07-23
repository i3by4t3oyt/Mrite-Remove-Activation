# Mrite v2.1 — 移除激活码验证

双击运行，自动去除激活码验证，无需邀请码即可使用全部功能。

## 前置条件

- [Node.js](https://nodejs.org/) 16+（点进去下载安装即可）

## 使用方法

1. 将 `一键补丁.bat` 和 `patch.js` 放到 Mrite 安装目录下（跟 `win-unpacked` 同级，或放进 `win-unpacked/resources/` 里都行）
2. 关闭 Mrite（脚本也会自动帮你关）
3. 双击 `一键补丁.bat`，等待1-2分钟
4. 看到"补丁完成"后启动 Mrite.exe 即可

## 还原方法

补丁会自动备份原始文件为 `app_original.asar`。还原只需：

```
把 app_original.asar 重命名为 app.asar
```

## 补丁效果

- 启动无激活弹窗
- 所有面板自由使用
- 运行任务无需验证
- 设置页移除"软件授权"
- F12 开发者工具可用

## 文件说明

```
一键补丁.bat   — 双击运行（入口）
patch.js       — 补丁逻辑
README.md      — 本文件
```
## 新更新说明
```
现在会额外禁用：
  sendBundledReport — 心跳/用量上报（变成空操作）
  flushEvents — 事件队列发送
  pushEvent — 事件入队
  recordAppClose — 关闭上报
  report-usage / report-task-log / report-event / unified-report — 所有 IPC 上报接口
  get-server-usage / check-connection — 服务端查询
  启动时的 setTimeout 块（heartbeat/statusCheck/dataFlush）— 全部不再启动
  改完后软件不会跟 mirte.rzna.cloud 有任何通信，机器码也不会发出去。
```
