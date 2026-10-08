import type { Photo } from '~~/server/utils/db'

export type AlbumVisibility = 'public' | 'unlisted' | 'private'

export interface AlbumShareSettings {
  expiresAt: string | null
  allowOriginalDownload: boolean
  showExif: boolean
  showMap: boolean
  hasPassword: boolean
  isActive: boolean
}

export interface AlbumShareRecord extends AlbumShareSettings {
  id: number
  albumId: number
  token: string
  url: string
  viewCount: number
  lastViewedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface SharedAlbumPayload {
  album: {
    id: number
    title: string
    description: string | null
    coverPhotoId: string | null
    createdAt: string
  }
  share: Omit<AlbumShareRecord, 'url'>
  requiresPassword: boolean
  photos?: Photo[]
}
