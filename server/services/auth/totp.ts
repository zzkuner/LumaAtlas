import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'
import QRCode from 'qrcode'

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

const base32Encode = (input: Buffer) => {
  let bits = ''
  for (const byte of input) bits += byte.toString(2).padStart(8, '0')
  let result = ''
  for (let index = 0; index < bits.length; index += 5) {
    const chunk = bits.slice(index, index + 5).padEnd(5, '0')
    result += BASE32_ALPHABET[Number.parseInt(chunk, 2)]
  }
  return result
}

const base32Decode = (value: string) => {
  const normalized = value.toUpperCase().replace(/[^A-Z2-7]/g, '')
  let bits = ''
  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character)
    if (index < 0) throw new Error('Invalid Base32 secret')
    bits += index.toString(2).padStart(5, '0')
  }
  const bytes: number[] = []
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2))
  }
  return Buffer.from(bytes)
}

const getEncryptionKey = () => {
  const runtimeConfig = useRuntimeConfig() as any
  const password =
    process.env.NUXT_SESSION_PASSWORD || runtimeConfig.session?.password || ''
  if (password.length < 32) {
    throw new Error('NUXT_SESSION_PASSWORD must be at least 32 characters')
  }
  return createHash('sha256').update(password).digest()
}

export const generateTotpSecret = () => base32Encode(randomBytes(20))

export const encryptTotpSecret = (secret: string) => {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv)
  const encrypted = Buffer.concat([
    cipher.update(secret, 'utf8'),
    cipher.final(),
  ])
  return [iv, cipher.getAuthTag(), encrypted]
    .map((part) => part.toString('base64url'))
    .join('.')
}

export const decryptTotpSecret = (payload: string) => {
  const [ivValue, tagValue, encryptedValue] = payload.split('.')
  if (!ivValue || !tagValue || !encryptedValue) {
    throw new Error('Invalid encrypted TOTP secret')
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(ivValue, 'base64url'),
  )
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}

const generateTotpAtCounter = (secret: string, counter: number) => {
  const counterBuffer = Buffer.alloc(8)
  counterBuffer.writeBigUInt64BE(BigInt(counter))
  const digest = createHmac('sha1', base32Decode(secret))
    .update(counterBuffer)
    .digest()
  const offset = digest[digest.length - 1]! & 0x0f
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff)
  return String(binary % 1_000_000).padStart(6, '0')
}

export const verifyTotp = (secret: string, input: string, now = Date.now()) => {
  const code = input.replace(/\s/g, '')
  if (!/^\d{6}$/.test(code)) return false
  const counter = Math.floor(now / 30_000)
  return [-1, 0, 1].some((offset) => {
    const expected = generateTotpAtCounter(secret, counter + offset)
    return timingSafeEqual(Buffer.from(expected), Buffer.from(code))
  })
}

export const createTotpSetup = async (
  secret: string,
  email: string,
  issuer: string,
) => {
  const label = `${issuer}:${email}`
  const uri = `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
  return {
    secret,
    uri,
    qrCodeDataUrl: await QRCode.toDataURL(uri, {
      width: 280,
      margin: 1,
      color: { dark: '#171717', light: '#ffffff' },
    }),
  }
}

export const normalizeRecoveryCode = (code: string) =>
  code.toUpperCase().replace(/[^A-Z0-9]/g, '')

export const hashRecoveryCode = (code: string) =>
  createHash('sha256').update(normalizeRecoveryCode(code)).digest('hex')

export const generateRecoveryCodes = (count = 10) =>
  Array.from({ length: count }, () => {
    const value = randomBytes(8).toString('hex').toUpperCase()
    return `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8, 12)}-${value.slice(12)}`
  })
