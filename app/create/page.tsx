'use client'

import React, { useState, useRef, useEffect } from 'react'
import HomeContent from '../HomeContent'
import { SchoolData, LocationData } from '@/types/school'

/**
 * 学校生成フロー（API消費あり）
 * トップは /archive にリダイレクト。生成したい場合は /create にアクセス
 */
export default function CreatePage() {
  const [stage, setStage] = useState<'landing' | 'map' | 'school'>('landing')
  const [isGenerating, setIsGenerating] = useState(false)
  const [schoolData, setSchoolData] = useState<SchoolData | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [apiFallbackMessage, setApiFallbackMessage] = useState<string | null>(null)
  const landingBgmRef = useRef<HTMLAudioElement | null>(null)
  const imageGenStartedRef = useRef(false)
  const earlyAnthemAudioStartedRef = useRef(false)
  const [showContent, setShowContent] = useState({
    title: false,
    subtitle: false,
    startButton: false,
    testButton: false
  })
  const [showCongratulations, setShowCongratulations] = useState(false)

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
    setApiFallbackMessage(null)
    setSchoolData(null)
    earlyAnthemAudioStartedRef.current = false
    try {
      const jobRes = await fetch('/api/school/generate-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(location),
      })
      const jobJson = await jobRes.json().catch(() => ({}))
      if (!jobRes.ok || !jobJson?.jobId) {
        setError(jobJson?.error || 'ジョブの開始に失敗しました。もう一度お試しください。')
        return
      }
      const jobId = jobJson.jobId as string
      setJobId(jobId)

      const pollIntervalMs = 2500
      const timeoutMs = 5 * 60 * 1000
      const startedAt = Date.now()
      let cancelled = false

      const poll = (): Promise<void> => {
        if (cancelled) return Promise.resolve()
        const remaining = timeoutMs - (Date.now() - startedAt)
        const nearTimeout = remaining <= 10000
        const url = `/api/job?jobId=${encodeURIComponent(jobId)}${nearTimeout ? '&partial=1' : ''}`
        return fetch(url)
          .then((r) => r.json().catch(() => ({})))
          .then((body) => {
            if (cancelled) return
            if ((body.status === 'completed' || body.status === 'partial') && body.data) {
              const data = body.data as SchoolData
              setSchoolData(data)
              if (data.fallbackUsed) {
                setApiFallbackMessage(data.errorMessage || 'テキスト生成APIが利用できなかったため、テンプレートで表示しています。')
              } else {
                setApiFallbackMessage(null)
              }
              setStage('school')
              if (body.status === 'completed') setShowCongratulations(true)
              return
            }
            if (body.status === 'failed') {
              setError(body.error || '処理に失敗しました。しばらく経ってから再度お試しください。')
              return
            }
            if (Date.now() - startedAt >= timeoutMs) {
              setError('処理が時間内に完了しませんでした。しばらく経ってから再度お試しください。')
              return
            }
            return new Promise<void>((resolve) => setTimeout(resolve, pollIntervalMs)).then(poll)
          })
      }

      await poll()
    } catch (err) {
      const msg = err instanceof Error ? err.message : '予期しないエラーが発生しました'
      setError(msg)
    } finally {
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    if (!showCongratulations) return
    const audioContext = typeof window !== 'undefined' ? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)() : null
    if (audioContext) {
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = audioContext.createOscillator()
        const gain = audioContext.createGain()
        osc.connect(gain)
        gain.connect(audioContext.destination)
        osc.frequency.value = freq
        osc.type = 'sine'
        gain.gain.setValueAtTime(0.3, startTime)
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration)
        osc.start(startTime)
        osc.stop(startTime + duration)
      }
      playTone(523.25, 0, 0.15)
      playTone(659.25, 0.15, 0.15)
      playTone(783.99, 0.3, 0.15)
      playTone(1046.5, 0.45, 0.4)
    }
    const t = setTimeout(() => setShowCongratulations(false), 2200)
    return () => clearTimeout(t)
  }, [showCongratulations])

  useEffect(() => {
    if (stage !== 'school') {
      imageGenStartedRef.current = false
      return
    }
    if (!schoolData || imageGenStartedRef.current) return
    imageGenStartedRef.current = true

    const isPlaceholder = (url: string | undefined) => !url || url.includes('placehold.co')
    type Task = { prompt: string; imageType: string; apply: (prev: SchoolData, url: string) => SchoolData }
    const tasks: Task[] = []
    const p = schoolData.school_profile
    const mc = schoolData.multimedia_content
    const principal = schoolData.principal_message

    if (p?.emblem_prompt && isPlaceholder(p.emblem_url)) {
      tasks.push({
        prompt: p.emblem_prompt,
        imageType: 'emblem',
        apply: (prev, url) => prev ? { ...prev, school_profile: { ...prev.school_profile, emblem_url: url } } : prev,
      })
    }
    if (p?.historical_buildings?.[0]?.image_prompt && isPlaceholder(p.historical_buildings[0].image_url)) {
      tasks.push({
        prompt: p.historical_buildings[0].image_prompt,
        imageType: 'historical_building',
        apply: (prev, url) => {
          if (!prev?.school_profile?.historical_buildings?.length) return prev
          const next = [...prev.school_profile.historical_buildings]
          next[0] = { ...next[0], image_url: url }
          return { ...prev, school_profile: { ...prev.school_profile, historical_buildings: next } }
        },
      })
    }
    if (principal?.face_prompt && isPlaceholder(principal.face_image_url)) {
      tasks.push({
        prompt: principal.face_prompt,
        imageType: 'principal_face',
        apply: (prev, url) =>
          prev?.principal_message ? { ...prev, principal_message: { ...prev.principal_message, face_image_url: url } } : prev,
      })
    }
    if (mc?.monuments?.[0]?.image_prompt && isPlaceholder(mc.monuments[0].image_url)) {
      tasks.push({
        prompt: mc.monuments[0].image_prompt,
        imageType: 'monument',
        apply: (prev, url) => {
          if (!prev?.multimedia_content?.monuments?.length) return prev
          const next = [...prev.multimedia_content.monuments]
          next[0] = { ...next[0], image_url: url }
          return { ...prev, multimedia_content: { ...prev.multimedia_content, monuments: next } }
        },
      })
    }
    if (mc?.uniforms?.[0]?.image_prompt && isPlaceholder(mc.uniforms[0].image_url)) {
      tasks.push({
        prompt: mc.uniforms[0].image_prompt,
        imageType: 'uniform',
        apply: (prev, url) => {
          if (!prev?.multimedia_content?.uniforms?.length) return prev
          const next = [...prev.multimedia_content.uniforms]
          next[0] = { ...next[0], image_url: url }
          return { ...prev, multimedia_content: { ...prev.multimedia_content, uniforms: next } }
        },
      })
    }
    const eventIndex = mc?.school_events?.findIndex((e) => e.image_prompt && isPlaceholder(e.image_url)) ?? -1
    if (eventIndex >= 0 && mc?.school_events?.[eventIndex]) {
      tasks.push({
        prompt: mc.school_events[eventIndex].image_prompt!,
        imageType: 'event',
        apply: (prev, url) => {
          if (!prev?.multimedia_content?.school_events?.length || eventIndex >= prev.multimedia_content.school_events.length) return prev
          const next = [...prev.multimedia_content.school_events]
          next[eventIndex] = { ...next[eventIndex], image_url: url }
          return { ...prev, multimedia_content: { ...prev.multimedia_content, school_events: next } }
        },
      })
    }
    const clubIndex = mc?.club_activities?.findIndex((c) => c.image_prompt && isPlaceholder(c.image_url)) ?? -1
    if (clubIndex >= 0 && mc?.club_activities?.[clubIndex]) {
      tasks.push({
        prompt: mc.club_activities[clubIndex].image_prompt!,
        imageType: 'club',
        apply: (prev, url) => {
          if (!prev?.multimedia_content?.club_activities?.length || clubIndex >= prev.multimedia_content.club_activities.length) return prev
          const next = [...prev.multimedia_content.club_activities]
          next[clubIndex] = { ...next[clubIndex], image_url: url }
          return { ...prev, multimedia_content: { ...prev.multimedia_content, club_activities: next } }
        },
      })
    }

    if (tasks.length === 0) return
    let cancelled = false
    const runOne = async (task: Task): Promise<string | null> => {
      try {
        const res = await fetch('/api/generate-school-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: task.prompt, imageType: task.imageType }),
        })
        const data = await res.json().catch(() => ({}))
        if (cancelled || !data?.url) return null
        return data.url
      } catch {
        return null
      }
    }
    const runAll = async () => {
      const results = await Promise.allSettled(tasks.map((task) => runOne(task)))
      if (cancelled) return
      results.forEach((result, i) => {
        const url = result.status === 'fulfilled' ? result.value : null
        if (url) {
          const task = tasks[i]
          setSchoolData((prev) => (prev ? task.apply(prev, url) : prev))
        }
      })
    }
    runAll()
    return () => { cancelled = true }
  }, [stage, schoolData])

  useEffect(() => {
    if (stage !== 'school' || !schoolData?.school_anthem?.lyrics) return
    if (schoolData.school_anthem.audio_url) return
    if (earlyAnthemAudioStartedRef.current) return
    let cancelled = false
    fetch('/api/generate-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lyrics: schoolData.school_anthem.lyrics,
        style: schoolData.school_anthem.style || '荘厳な合唱曲風',
        title: schoolData.school_anthem.title || '校歌',
        suno_prompt: schoolData.school_anthem.suno_prompt,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data?.url) return
        setSchoolData((prev) =>
          prev?.school_anthem ? { ...prev, school_anthem: { ...prev.school_anthem, audio_url: data.url } } : prev
        )
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [stage, schoolData?.school_anthem?.lyrics, schoolData?.school_anthem?.audio_url])

  const handleReset = () => {
    setSchoolData(null)
    setJobId(null)
    earlyAnthemAudioStartedRef.current = false
    setError(null)
    setApiFallbackMessage(null)
    setStage('landing')
  }

  const handleRetryAnthemAudio = () => {
    if (!schoolData?.school_anthem?.lyrics) return
    fetch('/api/generate-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lyrics: schoolData.school_anthem.lyrics,
        style: schoolData.school_anthem.style || '荘厳な合唱曲風',
        title: schoolData.school_anthem.title || '校歌',
        suno_prompt: schoolData.school_anthem.suno_prompt,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.url)
          setSchoolData((prev) =>
            prev?.school_anthem ? { ...prev, school_anthem: { ...prev.school_anthem, audio_url: data.url } } : prev
          )
      })
      .catch(() => {})
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
    jobId,
    error,
    apiFallbackMessage,
    landingBgmRef,
    showContent,
    showCongratulations,
    onLocationSelect: handleLocationSelect,
    onReset: handleReset,
    onRetryAnthemAudio: handleRetryAnthemAudio,
    onStartClick: handleStartClick,
    onTestGenerate: handleTestGenerate,
  })
}
