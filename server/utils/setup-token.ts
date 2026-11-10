import { timingSafeEqual } from 'node:crypto'

export const matchesSetupToken = (configured: string, supplied: string) => {
  const expected = Buffer.from(configured)
  const received = Buffer.from(supplied)
  return (
    configured.length >= 24 &&
    expected.length === received.length &&
    timingSafeEqual(expected, received)
  )
}
