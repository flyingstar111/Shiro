import { Redis } from '@upstash/redis'

import { safeJsonParse } from './helper'

const UPSTASH_TOKEN = process.env.UPSTASH_TOKEN
const UPSTASH_URL = process.env.UPSTASH_URL

let redis: Redis
const getRedis = () => {
  if (redis) {
    return redis
  }
  if (!UPSTASH_TOKEN || !UPSTASH_URL) {
    return null
  }
  const _redis = new Redis({
    url: UPSTASH_URL,
    token: UPSTASH_TOKEN,
  })

  redis = _redis
  return _redis
}

export const setCache = async (key: string, value: string, ttl: number) => {
  const _redis = getRedis()
  if (!_redis) {
    return
  }
  await _redis
    .set(key, value, {
      ex: ttl,
    })
    .catch((err) => {
      console.error('setCache', err)
    })
}

export const getCache = async (key: string) => {
  const _redis = getRedis()
  if (!_redis) {
    return null
  }
  return await _redis.get(key).catch((err) => {
    console.error('getCache', err)

    return null
  })
}

export const getOrSetCache = async <T>(
  key: string,
  setFn: () => Promise<T>,
  ttl: number,
): Promise<T> => {
  const cache = await getCache(key)

  if (cache) {
    if (typeof cache === 'string') {
      const tryParse = safeJsonParse(cache as any)
      if (tryParse) {
        return tryParse as T
      }
    } else {
      return cache as T
    }
  }

  const fallbackData = await setFn()

  await setCache(key, JSON.stringify(fallbackData), ttl)
  return fallbackData
}

export const onlyGetOrSetCacheInVercelButFallback: typeof getOrSetCache =
  async (key, setFn, ttl) => {
    if (process.env.VERCEL || process.env.VERCEL_ENV) {
      return getOrSetCache(key, setFn, ttl)
    }
    return setFn()
  }
