import { httpGet } from '@/utils/request'
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
  [`https://raw.githubusercontent.com/${repoOwner}/${repoName}/${workBranch}/publish/version.json`, 'direct'],
  [`https://cdn.jsdelivr.net/gh/${repoOwner}/${repoName}@${workBranch}/publish/version.json`, 'direct'],
  [`https://fastly.jsdelivr.net/gh/${repoOwner}/${repoName}@${workBranch}/publish/version.json`, 'direct'],
  [`https://gcore.jsdelivr.net/gh/${repoOwner}/${repoName}@${workBranch}/publish/version.json`, 'direct'],
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
  const url = `https://github.com/${repoOwner}/${repoName}/releases/download/v${version}/${artifactName}-v${version}-${abi}.apk`
  const savePath = `${temporaryDirectoryPath}/${artifactName}.apk`

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
