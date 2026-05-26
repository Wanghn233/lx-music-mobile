import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const readText = relativePath => fs.readFileSync(path.join(rootDir, relativePath), 'utf8')
const writeText = (relativePath, content) => {
  const filePath = path.join(rootDir, relativePath)
  if (readText(relativePath) === content) return
  fs.writeFileSync(filePath, content, 'utf8')
}
const readJson = relativePath => JSON.parse(readText(relativePath))
const writeJson = (relativePath, value) => {
  writeText(relativePath, `${JSON.stringify(value, null, 2)}\n`)
}

const replaceOrThrow = (relativePath, matcher, replacer) => {
  const filePath = path.join(rootDir, relativePath)
  const source = fs.readFileSync(filePath, 'utf8')
  if (!source.match(matcher)) {
    throw new Error(`Pattern not found in ${relativePath}: ${matcher}`)
  }
  const next = source.replace(matcher, replacer)
  if (next === source) return
  fs.writeFileSync(filePath, next, 'utf8')
}

const config = readJson('fork.config.json')
const packageJson = readJson('package.json')
const packageLockJson = readJson('package-lock.json')
const forkConfig = packageJson.forkConfig || {}

const appId = process.env.FORK_APP_ID || config.applicationId
const appName = process.env.FORK_APP_NAME || config.appName
const displayName = process.env.FORK_DISPLAY_NAME || config.displayName || appName
const packageName = process.env.FORK_PACKAGE_NAME || config.packageName
const repoOwner = process.env.FORK_REPO_OWNER || config.repoOwner || forkConfig.repoOwner || packageJson.author?.name || 'YOUR_GITHUB_USERNAME'
const repoName = process.env.FORK_REPO_NAME || config.repoName || forkConfig.repoName || packageName
const workBranch = process.env.FORK_WORK_BRANCH || config.workBranch || forkConfig.workBranch || 'fork-main'
const deeplinkScheme = process.env.FORK_DEEPLINK_SCHEME || config.deeplinkScheme || forkConfig.deeplinkScheme || 'lxmusic'
const providerAuthority = `${appId}.provider`
const repoBaseUrl = `https://github.com/${repoOwner}/${repoName}`

packageJson.name = packageName
packageJson.author = {
  ...(packageJson.author || {}),
  name: repoOwner,
}
packageJson.repository = {
  type: 'git',
  url: `git+https://github.com/${repoOwner}/${repoName}.git`,
}
packageJson.bugs = {
  url: `https://github.com/${repoOwner}/${repoName}/issues`,
}
packageJson.homepage = `https://github.com/${repoOwner}/${repoName}#readme`
packageJson.forkConfig = {
  applicationId: appId,
  appName,
  deeplinkScheme,
  displayName,
  packageName,
  providerAuthority,
  repoName,
  repoOwner,
  workBranch,
}

packageLockJson.name = packageName
if (packageLockJson.packages?.['']) {
  packageLockJson.packages[''].name = packageName
}

writeJson('package.json', packageJson)
writeJson('package-lock.json', packageLockJson)

const appJson = readJson('app.json')
appJson.name = appName
appJson.displayName = displayName
writeJson('app.json', appJson)

replaceOrThrow(
  'android/settings.gradle',
  /^rootProject\.name = '.*'$/m,
  `rootProject.name = '${packageName}'`,
)

replaceOrThrow(
  'android/app/build.gradle',
  /applicationId "[^"]+"/,
  `applicationId "${appId}"`,
)

replaceOrThrow(
  'android/app/src/main/res/values/strings.xml',
  /<string name="app_name">[^<]+<\/string>/,
  `<string name="app_name">${appName}</string>`,
)

replaceOrThrow(
  'android/app/src/main/AndroidManifest.xml',
  /<data android:scheme="[^"]+" android:host="\*" \/>/,
  `<data android:scheme="${deeplinkScheme}" android:host="*" />`,
)

replaceOrThrow(
  'src/config/constant.ts',
  /export const APP_PROVIDER_NAME = '[^']+'/,
  `export const APP_PROVIDER_NAME = '${providerAuthority}'`,
)

replaceOrThrow(
  'src/core/init/deeplink/index.ts',
  /url\.replace\('[^']+:\/\/', ''\)/,
  `url.replace('${deeplinkScheme}://', '')`,
)

replaceOrThrow(
  'src/core/init/deeplink/index.ts',
  /link\.startsWith\('[^']+:\/\/'\)/,
  `link.startsWith('${deeplinkScheme}://')`,
)

replaceOrThrow(
  'src/navigation/components/PactModal.tsx',
  /void openUrl\('https:\/\/github\.com\/[^']+#readme'\)/,
  `void openUrl('${repoBaseUrl}#readme')`,
)

replaceOrThrow(
  'src/screens/Home/Views/Setting/settings/About.tsx',
  /void openUrl\('https:\/\/github\.com\/[^']+#readme'\)/,
  `void openUrl('${repoBaseUrl}#readme')`,
)

replaceOrThrow(
  'src/screens/Home/Views/Setting/settings/About.tsx',
  /void openUrl\('https:\/\/github\.com\/[^']+\/issues\?q=is%3Aissue\+'\)/,
  `void openUrl('${repoBaseUrl}/issues?q=is%3Aissue+')`,
)

replaceOrThrow(
  'src/screens/Home/Views/Setting/settings/About.tsx',
  /void openUrl\('https:\/\/github\.com\/[^']+\/releases'\)/,
  `void openUrl('${repoBaseUrl}/releases')`,
)

replaceOrThrow(
  'src/screens/Home/Views/Setting/settings/About.tsx',
  /void openUrl\('https:\/\/github\.com\/[^']+#%E9%A1%B9%E7%9B%AE%E5%8D%8F%E8%AE%AE'\)/,
  `void openUrl('${repoBaseUrl}#%E9%A1%B9%E7%9B%AE%E5%8D%8F%E8%AE%AE')`,
)

replaceOrThrow(
  'src/screens/Home/Views/Setting/settings/About.tsx',
  /https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/,
  repoBaseUrl,
)

replaceOrThrow(
  'src/screens/Home/Views/Setting/settings/About.tsx',
  /<Text style=\{textLinkStyle\}>https:\/\/github\.com\/[^<]+<\/Text>/,
  `<Text style={textLinkStyle}>${repoBaseUrl}</Text>`,
)

writeText(
  'src/utils/version.js',
  `import { httpGet } from '@/utils/request'
import { author, forkConfig, name } from '../../package.json'
import { downloadFile, stopDownload, temporaryDirectoryPath } from '@/utils/fs'
import { getSupportedAbis, installApk } from '@/utils/nativeModules/utils'
import { APP_PROVIDER_NAME } from '@/config/constant'

const abis = [
  'arm64-v8a',
  'armeabi-v7a',
  'x86_64',
  'x86',
  'universal',
]

const repoOwner = forkConfig?.repoOwner || author.name
const repoName = forkConfig?.repoName || name
const workBranch = forkConfig?.workBranch || 'fork-main'
const artifactName = forkConfig?.packageName || name
const address = [
  [\`https://raw.githubusercontent.com/\${repoOwner}/\${repoName}/\${workBranch}/publish/version.json\`, 'direct'],
  [\`https://cdn.jsdelivr.net/gh/\${repoOwner}/\${repoName}@\${workBranch}/publish/version.json\`, 'direct'],
  [\`https://fastly.jsdelivr.net/gh/\${repoOwner}/\${repoName}@\${workBranch}/publish/version.json\`, 'direct'],
  [\`https://gcore.jsdelivr.net/gh/\${repoOwner}/\${repoName}@\${workBranch}/publish/version.json\`, 'direct'],
]


const request = async(url, retryNum = 0) => {
  return new Promise((resolve, reject) => {
    httpGet(url, {
      timeout: 10000,
    }, (err, resp, body) => {
      if (err || resp.statusCode != 200) {
        ++retryNum >= 3
          ? reject(err || new Error(resp.statusMessage || resp.statusCode))
          : request(url, retryNum).then(resolve).catch(reject)
      } else resolve(body)
    })
  })
}

const getDirectInfo = async(url) => {
  return request(url).then(info => {
    if (info.version == null) throw new Error('failed')
    return info
  })
}

export const getVersionInfo = async(index = 0) => {
  const [url] = address[index]
  return getDirectInfo(url).catch(async(err) => {
    index++
    if (index >= address.length) throw err
    return getVersionInfo(index)
  })
}

const getTargetAbi = async() => {
  const supportedAbis = await getSupportedAbis()
  for (const abi of abis) {
    if (supportedAbis.includes(abi)) return abi
  }
  return abis[abis.length - 1]
}
let downloadJobId = null
const noop = (total, download) => {}
let apkSavePath

export const downloadNewVersion = async(version, onDownload = noop) => {
  const abi = await getTargetAbi()
  const url = \`https://github.com/\${repoOwner}/\${repoName}/releases/download/v\${version}/\${artifactName}-v\${version}-\${abi}.apk\`
  const savePath = \`\${temporaryDirectoryPath}/\${artifactName}.apk\`

  if (downloadJobId) stopDownload(downloadJobId)

  const { jobId, promise } = downloadFile(url, savePath, {
    progressInterval: 500,
    connectionTimeout: 20000,
    readTimeout: 30000,
    begin({ statusCode, contentLength }) {
      onDownload(contentLength, 0)
      void statusCode
    },
    progress({ contentLength, bytesWritten }) {
      onDownload(contentLength, bytesWritten)
    },
  })
  downloadJobId = jobId
  return promise.then(() => {
    apkSavePath = savePath
    return updateApp()
  })
}

export const updateApp = async() => {
  if (!apkSavePath) throw new Error('apk Save Path is null')
  await installApk(apkSavePath, APP_PROVIDER_NAME)
}
`,
)

console.log(`Rebrand applied:
- applicationId: ${appId}
- appName: ${appName}
- packageName: ${packageName}
- repo: ${repoOwner}/${repoName}
- deeplinkScheme: ${deeplinkScheme}`)
