'use client'

import React, { useState, useRef, useEffect } from 'react'
import HomeContent from './HomeContent'
import { SchoolData, LocationData } from '@/types/school'

export default function Home() {
  const [stage, setStage] = useState<'landing' | 'map' | 'school'>('landing')
  const [isGenerating, setIsGenerating] = useState(false)
  const [schoolData, setSchoolData] = useState<SchoolData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const landingBgmRef = useRef<HTMLAudioElement | null>(null)
  const [showContent, setShowContent] = useState({
    title: false,
    subtitle: false,
    startButton: false,
    testButton: false
  })

  useEffect(() => {
    if (stage === 'landing') {
      const audio = landingBgmRef.current
      if (!audio) return
      audio.volume = 0.3
      const handleEnded = () => {
        setTimeout(() => {
          if (stage === 'landing') audio.play().catch(() => {})
        }, 5000)
      }
      const handleError = () => {}
      const handleCanPlay = () => {}
      audio.addEventListener('ended', handleEnded)
      audio.addEventListener('error', handleError)
      audio.addEventListener('canplay', handleCanPlay)
      const playBGM = () => {
        audio.play()
          .then(() => {
            document.removeEventListener('click', playBGM)
            document.removeEventListener('keydown', playBGM)
          })
          .catch(() => {})
      }
      document.addEventListener('click', playBGM, { once: true })
      document.addEventListener('keydown', playBGM, { once: true })
      playBGM()
      return () => {
        audio.removeEventListener('ended', handleEnded)
        audio.removeEventListener('error', handleError)
        audio.removeEventListener('canplay', handleCanPlay)
      }
    } else {
      if (landingBgmRef.current) {
        landingBgmRef.current.pause()
        landingBgmRef.current.currentTime = 0
      }
    }
  }, [stage])

  useEffect(() => {
    if (stage === 'landing') {
      setShowContent({ title: false, subtitle: false, startButton: false, testButton: false })
      const t1 = setTimeout(() => setShowContent(prev => ({ ...prev, title: true })), 500)
      const t2 = setTimeout(() => setShowContent(prev => ({ ...prev, subtitle: true })), 1500)
      const t3 = setTimeout(() => setShowContent(prev => ({ ...prev, startButton: true })), 2500)
      const t4 = setTimeout(() => setShowContent(prev => ({ ...prev, testButton: true })), 3000)
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
    } else {
      setShowContent({ title: false, subtitle: false, startButton: false, testButton: false })
    }
  }, [stage])

  const handleLocationSelect = async (location: LocationData) => {
    setIsGenerating(true)
    setError(null)
    setSchoolData(null)
    try {
      const response = await fetch('/api/generate-school', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(location),
      })
      if (!response.ok) throw new Error('学校の生成に失敗しました')
      const data: SchoolData = await response.json()
      setSchoolData(data)
      setStage('school')
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleReset = () => {
    setSchoolData(null)
    setError(null)
    setStage('landing')
  }

  const handleStartClick = () => setStage('map')

  const handleTestGenerate = () => {
    handleLocationSelect({
      lat: 35.6762,
      lng: 139.6503,
      address: '東京都港区芝公園',
      landmarks: ['東京タワー', '増上寺', '芝公園'],
    })
  }

  return React.createElement(HomeContent, {
    stage,
    setStage,
    isGenerating,
    schoolData,
    error,
    landingBgmRef,
    showContent,
    onLocationSelect: handleLocationSelect,
    onReset: handleReset,
    onStartClick: handleStartClick,
    onTestGenerate: handleTestGenerate,
  })
}
