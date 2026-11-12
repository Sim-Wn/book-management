import jwt from 'jsonwebtoken'
import { config } from '../config.js'

/** 从 Authorization: Bearer <token> 中取出并校验 token，失败返回 401 */
export function authRequired(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return res.status(401).json({ ok: false, msg: '请先登录' })
  try {
    req.user = jwt.verify(token, config.jwtSecret)
    return next()
  } catch {
    return res.status(401).json({ ok: false, msg: '登录已过期，请重新登录' })
  }
}

/** 先登录，再要求 role=admin，失败返回 401/403 */
export function adminOnly(req, res, next) {
  return authRequired(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ ok: false, msg: '需要管理员权限' })
    }
    next()
  })
}

export function isAdmin(req) {
  return req.user?.role === 'admin'
}

export function isSelf(req, id) {
  return req.user != null && String(req.user.id) === String(id)
}

export function forbidden(res, msg = '无权操作') {
  return res.status(403).json({ ok: false, msg })
}
