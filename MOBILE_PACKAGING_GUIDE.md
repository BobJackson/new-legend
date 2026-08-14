# 玛法热血传奇 · 移动端 (Android APK / iOS) 打包与发布指南

本项目基于 React + Vite + TypeScript 现代化架构开发，界面采用响应式布局并支持全触控交互，可无缝打包转换为原生 **Android APK/AAB** 和 **iOS 原生应用 (IPA)**。

---

## 目录
1. [环境准备](#一环境准备)
2. [步骤 1：本地环境初始化与依赖安装](#步骤-1本地环境初始化与依赖安装)
3. [步骤 2：生成前端静态构建产物](#步骤-2生成前端静态构建产物)
4. [步骤 3：初始化 Capacitor 移动端容器](#步骤-3初始化-capacitor-移动端容器)
5. [生成 Android APK / AAB 安装包](#二生成-android-apk--aab-安装包)
6. [生成 iOS 应用程序 (IPA / App Store)](#三生成-ios-应用程序-ipa--app-store)
7. [快速免打包方案：PWA 添加到手机主屏幕](#四免打包极速体验pwa-添加到手机主屏幕)
8. [移动端体验优化配置（横屏/全屏/安全区）](#五移动端关键体验优化配置)

---

## 一、环境准备

在将项目导出到本地电脑前，请根据目标平台安装对应工具：

| 工具 | 目标平台 | 用途 |
| :--- | :--- | :--- |
| **Node.js (v18+)** | 全平台 | 前端依赖安装与构建 |
| **Android Studio** | Android | 编译、签名并生成 `.apk` / `.aab` |
| **Xcode (仅 macOS)** | iOS | 编译、代码签名并生成 `.ipa` / 上架 App Store |

---

## 步骤 1：本地环境初始化与依赖安装

1. 通过 Google AI Studio 右上角菜单导出项目的 **ZIP 压缩包** 或关联至 **GitHub** 仓库并克隆到本地。
2. 打开终端（Terminal / CMD），进入项目根目录：
   ```bash
   cd legend-game
   npm install
   ```

---

## 步骤 2：生成前端静态构建产物

在打包移动应用前，先通过 Vite 构建前端生产环境文件：
```bash
npm run build
```
执行完毕后，项目根目录下将生成包含所有静态资源的 `dist/` 文件夹。

---

## 步骤 3：初始化 Capacitor 移动端容器

推荐使用官方 **Capacitor** 进行一键跨平台封装：

1. 安装 Capacitor 核心依赖：
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
   ```

2. 初始化应用基础配置：
   ```bash
   npx cap init "热血传奇" "com.legend.game" --web-dir=dist
   ```
   > 参数说明：
   > - `"热血传奇"`：手机桌面上显示的应用名称。
   > - `"com.legend.game"`：应用唯一包名（Bundle ID / Application ID）。
   > - `--web-dir=dist`：指向 Vite 打包输出的静态目录。

3. 生成 Android 与 iOS 原生工程目录：
   ```bash
   npx cap add android
   npx cap add ios
   npx cap sync
   ```

---

## 二、生成 Android APK / AAB 安装包

### 1. 打开 Android 工程
```bash
npx cap open android
```
*(系统将自动启动 Android Studio 并加载 `android/` 目录)*

### 2. 生成 Debug 测试版 APK (直接安装手机)
1. 等待 Gradle 自动完成项目依赖同步（Sync）。
2. 在 Android Studio 顶部菜单栏点击：
   - **Build** -> **Build Bundle(s) / APK(s)** -> **Build APK(s)**。
3. 编译完成后，点击右下角出现的 **locate**，即可在以下路径找到安装包：
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```
4. 将该 `.apk` 发送至 Android 手机即可直接安装运行。

### 3. 生成 Release 正式发布包 (AAB / 带签名 APK)
1. 菜单栏选择 **Build** -> **Generate Signed Bundle / APK**。
2. 选择 **APK** 或 **Android App Bundle**（Google Play 适用）。
3. 导入或新建您的签名密钥库（Keystore），点击 **Finish** 完成打包输出。

---

## 三、生成 iOS 应用程序 (IPA / App Store)

> **提示**：构建 iOS 应用必须在安装了 Xcode 的 macOS 系统电脑上进行。

### 1. 打开 iOS 工程
```bash
npx cap open ios
```
*(系统将自动启动 Xcode 并加载 `ios/` 目录)*

### 2. 配置开发者签名 (Signing & Capabilities)
1. 在 Xcode 左侧导航栏选中项目根节点 **App**。
2. 在主视窗切换至 **Signing & Capabilities** 标签页。
3. 勾选 **Automatically manage signing**，并在 **Team** 下拉框中登录并绑定您的 Apple Developer 账号。

### 3. 本地连接 iPhone 调试真机运行
1. 用数据线连接您的 iPhone 并信任电脑（或在顶部选择 iPhone Simulator 模拟器）。
2. 点击 Xcode 左上角的 **▶ Run (运行)** 按钮，项目将自动编译并在手机上安装运行。

### 4. 导出 .ipa / 提交 TestFlight
1. 顶部选择构建目标为 **Any iOS Device (arm64)**。
2. 菜单栏点击 **Product** -> **Archive**。
3. 归档完成后在弹出的 Organizer 窗口点击 **Distribute App**，可选择：
   - **App Store Connect** (发布至 TestFlight / App Store)
   - **Ad Hoc / Development** (导出 `.ipa` 安装包用于指定设备内测)

---

## 四、免打包极速体验：PWA 添加到手机主屏幕

如果您需要立即在手机上以**全屏沉浸、无地址栏、类似原生 App** 的方式体验，可直接使用 Web PWA 功能：

1. **iOS (iPhone/iPad)**：
   - 使用 **Safari** 浏览器打开游戏部署链接。
   - 点击浏览器底部的 **【分享】** 图标（带有向上箭头的方框）。
   - 向下滚动并点击 **【添加到主屏幕】(Add to Home Screen)**。
2. **Android**：
   - 使用 **Chrome / Edge / 微信外部浏览器** 打开游戏链接。
   - 点击右上角菜单按钮，选择 **【添加到主屏幕】** 或 **【安装应用】**。

---

## 五、移动端关键体验优化配置

### 1. 强制横屏 / 锁定屏幕旋转
如需保持经典街机横屏视角，可在 `capacitor.config.json` 或 `capacitor.config.ts` 中配置：
```json
{
  "appId": "com.legend.game",
  "appName": "热血传奇",
  "webDir": "dist",
  "plugins": {
    "ScreenOrientation": {
      "orientation": "landscape"
    }
  }
}
```

### 2. 隐藏状态栏（沉浸式全屏）
安装状态栏插件：
```bash
npm install @capacitor/status-bar
```
在原生代码中调用隐藏：
```ts
import { StatusBar } from '@capacitor/status-bar';

StatusBar.hide();
```

---

## 常见问题与排查 (FAQ)

- **Q: 更新网页前端代码后，如何同步到 App？**
  - 执行 `npm run build && npx cap sync` 即可将最新打包的网页代码同步到 iOS 和 Android 原生工程中。
- **Q: 手机上出现网络请求跨域或白屏？**
  - 检查服务端是否正确配置了 CORS 头，或在 Capacitor 中使用相对路径 `/api/*`。
