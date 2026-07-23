#!/usr/bin/env node
// Mrite v2.1 — 一键移除激活码验证
// 用法: node patch.js [resources目录路径]

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const resDir = (process.argv[2] || '.').replace(/[\\/]+$/, '');
const asarPath = path.resolve(resDir, 'app.asar');
const extractDir = path.resolve(resDir, '_patch_tmp');
const backupPath = path.resolve(resDir, 'app_original.asar');

function log(msg) { console.log(`  [*] ${msg}`); }
function ok(msg) { console.log(`  [OK] ${msg}`); }
function die(msg) { console.error(`  [错误] ${msg}`); process.exit(1); }

// ──────────────────────────────────────────
// 检查
// ──────────────────────────────────────────
if (!fs.existsSync(asarPath)) {
  die(`找不到 ${asarPath}`);
}

// 确保 asar 可用
try {
  execSync('npx asar --version', { stdio: 'pipe' });
} catch {
  log('安装 @electron/asar...');
  try {
    execSync('npm install -g @electron/asar', { stdio: 'inherit' });
  } catch {
    die('asar 安装失败，请手动运行: npm install -g @electron/asar');
  }
}

// ──────────────────────────────────────────
// 备份
// ──────────────────────────────────────────
if (!fs.existsSync(backupPath)) {
  log('备份 → app_original.asar');
  fs.copyFileSync(asarPath, backupPath);
} else {
  log('备份已存在，跳过');
}

// ──────────────────────────────────────────
// 解包
// ──────────────────────────────────────────
log('解包 app.asar...');
if (fs.existsSync(extractDir)) {
  fs.rmSync(extractDir, { recursive: true, force: true });
}
try {
  execSync(`npx asar extract "${asarPath}" "${extractDir}"`, { stdio: 'pipe' });
} catch (e) {
  die('解包失败: ' + e.message);
}
ok('解包完成');

// ──────────────────────────────────────────
// 补丁工具
// ──────────────────────────────────────────
function patchFile(relPath, operations) {
  const fp = path.join(extractDir, relPath);
  if (!fs.existsSync(fp)) {
    log(`跳过 (不存在): ${relPath}`);
    return 0;
  }
  let content = fs.readFileSync(fp, 'utf-8');
  let count = 0;
  for (const op of operations) {
    const before = content;
    if (op.regex) {
      content = content.replace(op.regex, op.to);
    } else if (op.from) {
      content = content.split(op.from).join(op.to);
    }
    if (content !== before) count++;
  }
  if (count > 0) {
    fs.writeFileSync(fp, content, 'utf-8');
    ok(`${relPath} (${count}处)`);
  }
  return count;
}

// ──────────────────────────────────────────
// 应用所有补丁
// ──────────────────────────────────────────
log('应用补丁...');
let total = 0;

// 1. renderer/state.js
total += patchFile('renderer/state.js', [
  { from: 'isActivated: false,', to: 'isActivated: true,' },
  { from: 'inviteVerified: false,', to: 'inviteVerified: true,' },
  {
    regex: /\/\/ ★ 初始化许可证计时系统[\s\S]*?Mrite\.showActivation\(\);\s*\}/,
    to: '// 激活验证已禁用\n          Mrite.STATE.settings.inviteVerified = true;\n          Mrite.STATE.isActivated = true;'
  },
]);

// 2. renderer/license-timer.js
total += patchFile('renderer/license-timer.js', [
  {
    regex: /init: function\(expiresAt, onExpire\) \{[\s\S]*?\n    \},/,
    to: 'init: function(expiresAt, onExpire) {\n      // 计时器已禁用\n    },'
  },
  {
    regex: /isExpired: function\(\) \{[\s\S]*?return checkExpired\(\);\s*\}/,
    to: 'isExpired: function() {\n      return false;\n    }'
  },
]);

// 3. renderer/ui.js
total += patchFile('renderer/ui.js', [
  {
    regex: /\s*\/\/ ★ 未激活时只允许访问设置页\s*\n\s*if \(!S\.settings\.inviteCode\)[\s\S]*?return;\s*\}\s*\}/,
    to: ''
  },
  {
    regex: /\s*\/\/ ★ 已过期时拦截\s*\n\s*if \(S\.settings\.inviteVerified && Mrite\._isExpired[\s\S]*?return;\s*\}/,
    to: ''
  },
  {
    regex: /Mrite\.showActivation = function\(\) \{[\s\S]*?\n\};/,
    to: '// 激活遮罩（已禁用）\nMrite.showActivation = function() {};'
  },
]);

// 4. renderer/toolbar.js
total += patchFile('renderer/toolbar.js', [
  {
    regex: /Mrite\._isExpired = function\(\) \{[\s\S]*?\n\};/,
    to: 'Mrite._isExpired = function() {\n  return false;\n};'
  },
  {
    regex: /\/\/ ★ 未激活\s*\n\s*if \(!S\.settings\.inviteCode[\s\S]*?\}\)\(\);/,
    to: ''
  },
  {
    from: "dot.classList.add('status-error');\n      txt.textContent = '未激活';",
    to: "dot.classList.add('status-ok');\n      txt.textContent = '就绪';"
  },
]);

// 5. renderer/panels/settings.js
total += patchFile('renderer/panels/settings.js', [
  {
    regex: /Mrite\._onLicenseExpired = function\(\) \{[\s\S]*?\n\};/,
    to: '// 许可证过期处理（已禁用）\nMrite._onLicenseExpired = function() {};'
  },
]);

// 6. renderer/index.html
total += patchFile('renderer/index.html', [
  {
    regex: /\s*<div class="set-nav-item[^"]*" data-section="invite"[^>]*>[^<]*<\/div>/,
    to: ''
  },
  {
    from: '<div class="set-nav-item" data-section="usage"',
    to: '<div class="set-nav-item active" data-section="usage"'
  },
  {
    regex: /\s*<div class="set-section-panel[^"]*" data-section="invite">[\s\S]*?<\/div>\s*(?=<div class="set-section-panel")/,
    to: '\n          '
  },
  {
    from: '<div class="set-section-panel" data-section="usage">',
    to: '<div class="set-section-panel active" data-section="usage">'
  },
]);

// 7. main.js
total += patchFile('main.js', [
  {
    from: 'applySecurity(mainWindow);',
    to: '// 安全加固已禁用\n  // applySecurity(mainWindow);'
  },
]);

// 8. src/services/auth-service.js — disable all backend communication
total += patchFile('src/services/auth-service.js', [
  {
    regex: /ipcMain\.handle\('verify-invite-code', async \(event, \{ code, apiUrl \}\) => \{[\s\S]*?\n  \}\);/,
    to: `ipcMain.handle('verify-invite-code', async (event, { code, apiUrl }) => {\n    return { success: true, valid: true, data: { activatedAt: new Date().toISOString(), expiresAt: '2099-12-31T23:59:59Z', heartbeatInterval: 300 } };\n  });`
  },
  {
    regex: /ipcMain\.handle\('check-activation', async \(\) => \{[\s\S]*?\n  \}\);/,
    to: `ipcMain.handle('check-activation', async () => {\n    return { valid: true };\n  });`
  },
  // disable report-usage (no-op)
  {
    regex: /ipcMain\.handle\('report-usage', async \(event, data\) => \{[\s\S]*?\n  \}\);/,
    to: `ipcMain.handle('report-usage', async (event, data) => {\n    return { success: true };\n  });`
  },
  // disable report-task-log (no-op)
  {
    regex: /ipcMain\.handle\('report-task-log', async \(event, data\) => \{[\s\S]*?\n  \}\);/,
    to: `ipcMain.handle('report-task-log', async (event, data) => {\n    return { success: true };\n  });`
  },
  // disable report-event (no-op)
  {
    regex: /ipcMain\.handle\('report-event', async \(event, \{ type, data \}\) => \{[\s\S]*?\n  \}\);/,
    to: `ipcMain.handle('report-event', async (event, { type, data }) => {\n    return { success: true };\n  });`
  },
  // disable unified-report (no-op)
  {
    regex: /ipcMain\.handle\('unified-report', async \(event, data\) => \{[\s\S]*?\n  \}\);/,
    to: `ipcMain.handle('unified-report', async (event, data) => {\n    return { success: true };\n  });`
  },
  // disable get-server-usage (return empty)
  {
    regex: /ipcMain\.handle\('get-server-usage', async \(\) => \{[\s\S]*?\n  \}\);/,
    to: `ipcMain.handle('get-server-usage', async () => {\n    return { success: true, data: [] };\n  });`
  },
  // disable check-connection (always connected)
  {
    regex: /ipcMain\.handle\('check-connection', async \(\) => \{[\s\S]*?\n  \}\);/,
    to: `ipcMain.handle('check-connection', async () => {\n    return { connected: true, region: 'local', lastCheck: Date.now(), ip: '127.0.0.1' };\n  });`
  },
  // disable startup heartbeat/statusCheck/dataFlush/pushEvent
  {
    regex: /\/\/ .*启动时[\s\S]*?setTimeout\(async \(\) => \{[\s\S]*?\}, 3000\);/,
    to: `// all backend communication disabled`
  },
  // disable recordAppClose
  {
    regex: /function recordAppClose\(\) \{[\s\S]*?\}/,
    to: `function recordAppClose() {}`
  },
  // disable sendBundledReport (make it no-op)
  {
    regex: /async function sendBundledReport\(includeHeartbeat\) \{[\s\S]*?\n\}/,
    to: `async function sendBundledReport(includeHeartbeat) { return { success: true }; }`
  },
  // disable flushEvents (make it no-op)
  {
    regex: /async function flushEvents\(\) \{[\s\S]*?\n\}/,
    to: `async function flushEvents() {}`
  },
  // disable pushEvent (make it no-op)
  {
    regex: /function pushEvent\(type, data\) \{[\s\S]*?\n\}/,
    to: `function pushEvent(type, data) {}`
  },
]);

log(`共修改 ${total} 处`);

// ──────────────────────────────────────────
// 重新打包
// ──────────────────────────────────────────
log('重新打包 app.asar (可能需要1分钟)...');
try {
  execSync(`npx asar pack "${extractDir}" "${asarPath}"`, { stdio: 'pipe' });
} catch (e) {
  die('打包失败: ' + e.message);
}
ok('打包完成');

// 清理
log('清理临时文件...');
fs.rmSync(extractDir, { recursive: true, force: true });

ok('全部完成!');
