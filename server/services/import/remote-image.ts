import { lookup } from 'node:dns/promises'
import http from 'node:http'
import https from 'node:https'
import { isIP } from 'node:net'
import { fileTypeFromBuffer } from 'file-type'

const supportedTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/heic',
  'image/heif',
  'image/tiff',
  'image/bmp',
])

export const isPublicAddress = (address: string): boolean => {
  const family = isIP(address)
  if (family === 4) {
    const [a = 0, b = 0, c = 0] = address.split('.').map(Number)
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 &&
        (b === 168 ||
          (b === 0 && c === 0) ||
          (b === 0 && c === 2) ||
          (b === 88 && c === 99))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113)
    )
  }
  if (family === 6) {
    const normalized = address.toLowerCase()
    // Only native global-unicast IPv6 is accepted; this excludes mapped and tunneled addresses.
    return (
      /^[23]/.test(normalized) &&
      !normalized.startsWith('2001:db8:') &&
      !normalized.startsWith('2001:0:') &&
      !normalized.startsWith('2002:')
    )
  }
  return false
}

const parseRemoteUrl = (input: string): URL => {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    throw new Error('请输入完整的图片 URL。')
  }
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !['80', '443'].includes(url.port))
  ) {
    throw new Error('仅支持公开的 HTTP/HTTPS 图片地址。')
  }
  return url
}

const pinnedAddress = async (hostname: string) => {
  const addresses = isIP(hostname)
    ? [{ address: hostname, family: isIP(hostname) }]
    : await lookup(hostname, { all: true, verbatim: true })
  if (
    addresses.length === 0 ||
    addresses.some(({ address }) => !isPublicAddress(address))
  ) {
    throw new Error('图片地址指向了不可访问的网络。')
  }
  return addresses[0]!
}

const fetchOnce = async (
  url: URL,
  maxBytes: number,
): Promise<{ status: number; location?: string; buffer?: Buffer }> => {
  const { address, family } = await pinnedAddress(url.hostname)
  return new Promise((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http
    const request = client.request(
      url,
      {
        method: 'GET',
        timeout: 15000,
        headers: { accept: 'image/*', 'user-agent': 'LumaAtlas/1.0' },
        lookup: (_hostname, _options, callback) =>
          callback(null, address, family),
      },
      (response) => {
        const status = response.statusCode || 0
        if (status >= 300 && status < 400) {
          response.resume()
          resolve({ status, location: response.headers.location })
          return
        }
        if (status !== 200) {
          response.resume()
          reject(new Error(`远程服务器返回 HTTP ${status}。`))
          return
        }
        const contentType = String(response.headers['content-type'] || '')
          .split(';')[0]
          ?.trim()
          .toLowerCase()
        if (
          (!contentType?.startsWith('image/') &&
            contentType !== 'application/octet-stream') ||
          contentType === 'image/svg+xml'
        ) {
          response.destroy()
          reject(new Error('该地址未返回受支持的图片。'))
          return
        }
        if (Number(response.headers['content-length'] || 0) > maxBytes) {
          response.destroy()
          reject(new Error('图片超出导入大小限制。'))
          return
        }
        const chunks: Buffer[] = []
        let size = 0
        response.on('data', (chunk: Buffer) => {
          size += chunk.length
          if (size > maxBytes) {
            response.destroy(new Error('图片超出导入大小限制。'))
            return
          }
          chunks.push(chunk)
        })
        response.on('end', () =>
          resolve({ status, buffer: Buffer.concat(chunks) }),
        )
        response.on('error', reject)
      },
    )
    request.on('timeout', () => request.destroy(new Error('图片下载超时。')))
    request.on('error', reject)
    request.end()
  })
}

export const downloadRemoteImage = async (input: string, maxBytes: number) => {
  let url = parseRemoteUrl(input)
  for (let redirects = 0; redirects <= 3; redirects++) {
    const response = await fetchOnce(url, maxBytes)
    if (response.buffer) {
      const detected = await fileTypeFromBuffer(response.buffer)
      if (!detected || !supportedTypes.has(detected.mime)) {
        throw new Error('文件内容不是受支持的图片格式。')
      }
      return {
        buffer: response.buffer,
        extension: detected.ext,
        contentType: detected.mime,
      }
    }
    if (!response.location || redirects === 3) {
      throw new Error('图片地址跳转次数过多或目标无效。')
    }
    url = parseRemoteUrl(new URL(response.location, url).href)
  }
  throw new Error('无法下载图片。')
}
