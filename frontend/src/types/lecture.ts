export interface Lecture {
  id: string | number
  title: string
  category: string
  academicYear: number | string
  completed: boolean
  completedAt?: string
  url?: string // 追加
}