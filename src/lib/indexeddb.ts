export interface StoredFile {
  id: string
  category: string
  file?: File
  name: string
  size: number
  type: string
  status: 'pending' | 'uploading' | 'success' | 'error' | 'lost'
  progress: number
  url?: string
  errorCount: number
  errorMessage?: string
}

const DB_NAME = 'helpdesk-files-db'
const STORE_NAME = 'draft_files'
const DB_VERSION = 1

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'))
      return
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveStoredFile(file: StoredFile): Promise<void> {
  try {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.put(file)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch (error) {
    console.error('Failed to save to IndexedDB', error)
  }
}

export async function getStoredFiles(): Promise<StoredFile[]> {
  try {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  } catch (error) {
    console.error('Failed to read from IndexedDB', error)
    return []
  }
}

export async function deleteStoredFile(id: string): Promise<void> {
  try {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.delete(id)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch (error) {
    console.error('Failed to delete from IndexedDB', error)
  }
}

export async function clearStoredFiles(): Promise<void> {
  try {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.clear()
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch (error) {
    console.error('Failed to clear IndexedDB', error)
  }
}
