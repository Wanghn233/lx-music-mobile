import settingState from '@/store/setting/state'
import { getUserApiList, getUserApiScript, updateUserApiScript } from '@/utils/data'
import { httpFetch } from '@/utils/request'
import { log, setUserApi, setUserApiList } from '@/core/userApi'
import { toast } from '@/utils/tools'

// 启动后延迟首查，避开启动高峰；之后每 6 小时检查一次（仅 App 存活期间）
const CHECK_DELAY = 8_000
const CHECK_INTERVAL = 6 * 60 * 60 * 1000

const checkUserApiUpdate = async(id: string, sourceUrl: string) => {
  const resp = await httpFetch(sourceUrl).promise
  const script = resp.body
  if (typeof script !== 'string' || !script.length) throw new Error('invalid script response')

  const oldScript = await getUserApiScript(id)
  if (script === oldScript) {
    log.info('[user-api-update]', id, 'up to date')
    return
  }

  const info = await updateUserApiScript(id, script)
  setUserApiList(await getUserApiList())
  log.info('[user-api-update]', `${info.name} updated to ${info.version || 'unknown'}`)
  toast(global.i18n.t('user_api_auto_updated_tip', { name: info.name, version: info.version || '' }), 'long')

  // 若更新的正是当前启用源，重新加载脚本
  if (settingState.setting['common.apiSource'] === id) await setUserApi(id)
}

export const checkUserApiUpdates = async() => {
  if (!settingState.setting['common.isAutoUpdateUserApi']) return
  const list = await getUserApiList()
  for (const api of list) {
    if (!api.sourceUrl) continue
    try {
      await checkUserApiUpdate(api.id, api.sourceUrl)
    } catch (err: any) {
      log.error('[user-api-update]', api.name ?? api.id, err?.message)
    }
  }
}

export const initUserApiAutoUpdate = () => {
  setTimeout(() => {
    void checkUserApiUpdates()
  }, CHECK_DELAY)
  setInterval(() => {
    void checkUserApiUpdates()
  }, CHECK_INTERVAL)
}
