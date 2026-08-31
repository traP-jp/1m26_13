import type { Lecture } from '../types/lecture'

const STORAGE_KEY = 'portal_lectures'

// マスタデータ（初期値）
const initialLectures: Lecture[] = [
  { id: '1', title: 'デジタルイラスト講習会', category: 'Graphics', academicYear: 2026, completed: false },
  { id: '2', title: 'プログラミング基礎講習会', category: '融合系', academicYear: 2026, completed: false },
  { id: '3', title: 'DAW操作講習会', category: 'Sound', academicYear: 2026, completed: false },
  { id: '4', title: 'Webエンジニアになろう講習会', category: 'SysAd', academicYear: 2026, completed: false },
]

// 全講習会データの取得
export const getLectures = (): Lecture[] => {
  // 保存されているデータまたは初期データを取得（実装に合わせて調整してください）
  const data = localStorage.getItem('lectures')
  if (!data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialLectures))
    return initialLectures
  }
  const rawLectures: Lecture[] = data ? JSON.parse(data) : []

  // 読み取り時に url を動的に付与して返す
  return rawLectures.map((lecture) => ({
    ...lecture,
    url: lecture.url || `${window.location.origin}/lectures/${lecture.id}`
  }))
}

// 完了状態のトグル（切り替え）保存
export const toggleLectureCompletion = (id: string): Lecture | null => {
  const lectures = getLectures()
  const target = lectures.find((l) => l.id === id)
  if (!target) return null

  // 状態反転
  target.completed = !target.completed
  if (target.completed) {
    // 押し時: 現在日付を記録 (YYYY-MM-DD)
    target.completedAt = new Date().toISOString().split('T')[0]
  } else {
    // 再押し時: 完了日をクリア
    delete target.completedAt
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(lectures))
  return target
}