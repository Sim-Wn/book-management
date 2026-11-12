const buckets = new Map()

/**
 * 极简内存限流：按 IP + 自定义 key 统计固定窗口内的请求次数。
 * 单机部署足够用；多实例场景应换成 Redis 之类的共享存储。
 */
export function rateLimit({ windowMs = 60_000, max = 10, key = (req) => req.ip } = {}) {
  return (req, res, next) => {
    const now = Date.now()
    const k = key(req)
    const bucket = buckets.get(k)
    if (!bucket || now > bucket.resetAt) {
      buckets.set(k, { count: 1, resetAt: now + windowMs })
      return next()
    }
    bucket.count += 1
    if (bucket.count > max) {
      return res.status(429).json({ ok: false, msg: '操作过于频繁，请稍后再试' })
    }
    next()
  }
}

// 定期清理过期窗口，避免内存无限增长
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of buckets) {
    if (now > v.resetAt) buckets.delete(k)
  }
}, 60_000).unref()
