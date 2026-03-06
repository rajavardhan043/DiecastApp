import { useState } from 'react'

const STORAGE_KEY = 'diecast-favorites'

export function useFavorites() {
  const getFavorites = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? new Set(JSON.parse(raw)) : new Set()
    } catch {
      return new Set()
    }
  }

  const [favorites, setFavoritesState] = useState(() => getFavorites())

  const setFavorites = (next) => {
    const arr = [...next]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr))
    setFavoritesState(next)
  }

  const toggleFavorite = (id) => {
    const next = new Set(favorites)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setFavorites(next)
  }

  const isFavorite = (id) => favorites.has(id)

  return { favorites, toggleFavorite, isFavorite }
}
