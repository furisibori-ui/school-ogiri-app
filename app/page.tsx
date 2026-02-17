'use client'

import { useState } from 'react'
import MapSelector from '@/components/MapSelector'
import LoadingScreen from '@/components/LoadingScreen'
import SchoolWebsite from '@/components/SchoolWebsite'
import { SchoolData, LocationData } from '@/types/school'

export default function Home() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [schoolData, setSchoolData] = useState<SchoolData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleLocationSelect = async (location: LocationData) => {
    setIsGenerating(true)
    setError(null)
    setSchoolData(null)

    try {
      // Phase 1: 学校基本情報の生成
      const response = await fetch('/api/generate-school', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(location),
      })

      if (!response.ok) {
        throw new Error('学校の生成に失敗しました')
      }

      const data: SchoolData = await response.json()
      setSchoolData(data)

      // Phase 2: 画像生成（バックグラウンドで実行）
      if (data.principal_message.face_prompt) {
        fetch('/api/generate-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: data.principal_message.face_prompt,
            type: 'principal',
          }),
        })
          .then(res => res.json())
          .then(imageData => {
            setSchoolData(prev => {
              if (!prev) return prev
              return {
                ...prev,
                principal_message: {
                  ...prev.principal_message,
                  face_image_url: imageData.image_url,
                },
              }
            })
          })
          .catch(err => console.error('校長画像の生成に失敗:', err))
      }

      if (data.multimedia_content.school_event.image_prompt) {
        fetch('/api/generate-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: data.multimedia_content.school_event.image_prompt,
            type: 'event',
          }),
        })
          .then(res => res.json())
          .then(imageData => {
            setSchoolData(prev => {
              if (!prev) return prev
              return {
                ...prev,
                multimedia_content: {
                  ...prev.multimedia_content,
                  school_event: {
                    ...prev.multimedia_content.school_event,
                    image_url: imageData.image_url,
                  },
                },
              }
            })
          })
          .catch(err => console.error('行事画像の生成に失敗:', err))
      }

      // Phase 3: 音声生成（バックグラウンドで実行）
      if (data.multimedia_content.club_activity.sound_prompt) {
        fetch('/api/generate-audio', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: data.multimedia_content.club_activity.sound_prompt,
          }),
        })
          .then(res => res.json())
          .then(audioData => {
            setSchoolData(prev => {
              if (!prev) return prev
              return {
                ...prev,
                multimedia_content: {
                  ...prev.multimedia_content,
                  club_activity: {
                    ...prev.multimedia_content.club_activity,
                    audio_url: audioData.audio_url,
                  },
                },
              }
            })
          })
          .catch(err => console.error('部活音声の生成に失敗:', err))
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleReset = () => {
    setSchoolData(null)
    setError(null)
  }

  return (
    <main className="min-h-screen">
      {!schoolData && !isGenerating && (
        <div className="h-screen flex flex-col">
          <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white p-6 shadow-lg">
            <h1 className="text-3xl font-bold mb-2">位置情報連動型・架空学校生成サイト</h1>
            <p className="text-blue-100">
              地図上の任意の場所をクリックすると、その土地の特性を反映した架空の学校サイトが生成されます
            </p>
          </div>
          <div className="flex-1">
            <MapSelector onLocationSelect={handleLocationSelect} />
          </div>
          {error && (
            <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg">
              {error}
            </div>
          )}
        </div>
      )}

      {isGenerating && <LoadingScreen />}

      {schoolData && !isGenerating && (
        <SchoolWebsite data={schoolData} onReset={handleReset} />
      )}
    </main>
  )
}
