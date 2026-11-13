/**
 * 统一的日期展示：数据库返回的是 ISO 字符串（如 2026-06-11T03:25:48.000Z），
 * 这里按库里存的"墙上时间"直接格式化，避免时区偏移和原始 ISO 字符串出现在界面上。
 */
export function formatDateTime(value) {
  if (!value) return ''
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}` : String(value)
}

export function formatDate(value) {
  if (!value) return ''
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : String(value)
}
