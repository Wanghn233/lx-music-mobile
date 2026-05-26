# Fork Setup

这个模板按“轻定制、长期跟上游”的方式准备，适合下面这类需求：

- 改安装包名为 `com.luna.music`
- 改启动图标文字为 `Luna Music`
- 用 GitHub Actions 自动同步上游、自动打包、自动发 Release

## 设计取舍

- `applicationId` 会改成 `com.luna.music`，这才是 Android 安装包真正的包名。
- `namespace` 和 Java 源码包路径仍然保留 `cn.toside.music.mobile`。
- 这是故意的。这样能显著降低后续同步上游时的冲突概率。

如果你把 `android/app/src/main/java/cn/toside/music/mobile` 整棵重构成 `com/luna/music`，以后上游只要改到这些 Native 文件，冲突会明显变多。

## 需要改的文件

主要逻辑都集中在下面几个文件：

- `fork.config.json`
- `scripts/rebrand-fork.mjs`
- `.github/workflows/fork-sync-build.yml`

`scripts/rebrand-fork.mjs` 每次都会重复覆盖这几个点：

- `android/app/build.gradle` 里的 `applicationId`
- `android/settings.gradle` 里的 Gradle 项目名
- `src/config/constant.ts` 里的 `APP_PROVIDER_NAME`
- `app.json`、`package.json`、`package-lock.json`
- `src/utils/version.js` 里的应用内更新地址
- `AndroidManifest.xml` 和 `src/core/init/deeplink/index.ts` 里的自定义 Scheme

## 建议分支

建议在你的 GitHub fork 里新建并长期使用 `fork-main`：

1. 从上游 `master` fork 仓库
2. 新建分支 `fork-main`
3. 把这几个模板文件提交到 `fork-main`
4. 把 `fork-main` 设成默认分支

这样做的原因：

- 上游自带的 `release.yml` 只会在 `master` push 时触发
- 你的自定义 workflow 只跑在 `fork-main`
- 避免和上游自带发布流程混在一起

## 先改配置

先改 [fork.config.json](./fork.config.json)：

- `repoOwner`: 你的 GitHub 用户名
- `repoName`: 你的 fork 仓库名
- `workBranch`: 默认就是 `fork-main`
- `packageName`: 默认是 `luna-music-mobile`

如果你的 fork 仓库名不是 `luna-music-mobile`，一定要把 `repoName` 改掉，不然应用内检查更新会去错误地址。

如果你是通过 GitHub Actions 构建，workflow 会自动用当前 fork 的实际 `owner/repo` 覆盖这两个值，所以占位符主要影响本地手动构建场景。

## GitHub Secrets

如果你想生成自己的正式签名包，在 fork 仓库里添加这些 Secrets：

- `KEYSTORE_STORE_FILE_BASE64`
- `KEYSTORE_STORE_FILE`
- `KEYSTORE_KEY_ALIAS`
- `KEYSTORE_PASSWORD`
- `KEYSTORE_KEY_PASSWORD`

如果没配，workflow 会退回到仓库里的 `debug.keystore` 来生成一个可安装的 release 包，但这个包只适合测试，不适合正式分发。

## Actions 权限

在仓库设置里确认：

- `Actions` 已启用
- `Workflow permissions` 设为 `Read and write permissions`

否则 workflow 无法把同步后的提交推回 `fork-main`，也无法自动创建 Release。

## 触发方式

`Fork Sync Build` 这个 workflow 会在下面几种场景触发：

- 你手动 push 到 `fork-main`
- 你手动点 `workflow_dispatch`
- 每天定时同步一次上游

定时和手动同步时会先：

1. 拉 `lyswhut/lx-music-mobile` 的 `master`
2. merge 到 `fork-main`
3. 重新执行 `scripts/rebrand-fork.mjs`
4. 如果有变化就自动提交
5. 打 APK
6. 如果当前版本 tag 不存在就自动发 Release

## 一个边界

这个方案很适合：

- 改包名
- 改应用名
- 改图标
- 改签名
- 跟上游长期同步

如果你后面要长期改业务代码、改 React 页面、改 Native 逻辑，也还是能继续用，但遇到 merge conflict 的概率会提高。那时建议把“可脚本化改动”和“业务代码改动”分开维护。
