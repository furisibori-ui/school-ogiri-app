// @ts-nocheck
'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader } from '@googlemaps/js-api-loader'
import { LocationData } from '@/types/school'

interface MapSelectorProps {
  onLocationSelect: (location: LocationData) => void
}

export default function MapSelector({ onLocationSelect }: MapSelectorProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [marker, setMarker] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initMap = async () => {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      
      console.log('Google Maps API Key:', apiKey ? 'exists' : 'missing')
      
      if (!apiKey) {
        console.error('Google Maps API Key is not set!')
        alert('Google Maps APIキーが設定されていません。環境変数を確認してください。')
        setIsLoading(false)
        return
      }

      const loader = new Loader({
        apiKey: apiKey,
        version: 'weekly',
        libraries: ['places'],
      })

      try {
        console.log('Loading Google Maps...')
        await loader.load()
        console.log('Google Maps loaded successfully')
        
        if (mapRef.current) {
          const mapInstance = new google.maps.Map(mapRef.current, {
            center: { lat: 35.6762, lng: 139.6503 }, // 東京
            zoom: 10,
            mapTypeControl: true,
            streetViewControl: true,
            fullscreenControl: true,
          })

          setMap(mapInstance)
          console.log('Map instance created')

          // マップクリックイベント
          mapInstance.addListener('click', async (e: any) => {
            if (e.latLng) {
              await handleMapClick(e.latLng, mapInstance)
            }
          })

          setIsLoading(false)
        }
      } catch (error) {
        console.error('地図の読み込みに失敗しました:', error)
        alert(`地図の読み込みエラー: ${error}`)
        setIsLoading(false)
      }
    }

    initMap()
  }, [])

  const handleMapClick = async (latLng: any, mapInstance: any) => {
    const lat = latLng.lat()
    const lng = latLng.lng()

    // マーカーを配置
    if (marker) {
      marker.setMap(null)
    }

    const newMarker = new google.maps.Marker({
      position: latLng,
      map: mapInstance,
      animation: google.maps.Animation.DROP,
    })

    setMarker(newMarker)

    // 地理情報を取得
    const geocoder = new google.maps.Geocoder()
    const placesService = new google.maps.places.PlacesService(mapInstance)

    try {
      // 住所取得
      const geocodeResult = await geocoder.geocode({ location: latLng })
      const address = geocodeResult.results[0]?.formatted_address || ''

      // 近隣の場所を検索
      const nearbyRequest: any = {
        location: latLng,
        radius: 2000, // 2km圏内
        type: 'point_of_interest',
      }

      placesService.nearbySearch(nearbyRequest, (results: any, status: any) => {
        const landmarks = status === 'OK' && results
          ? results.slice(0, 10).map((place: any) => place.name || '')
          : []

        const locationData: LocationData = {
          lat,
          lng,
          address,
          landmarks,
        }

        onLocationSelect(locationData)
      })

    } catch (error) {
      console.error('位置情報の取得に失敗しました:', error)
      // エラーでも最小限の情報で継続
      onLocationSelect({ lat, lng })
    }
  }

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">地図を読み込んでいます...</p>
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
      <div style={{
        position: 'absolute',
        bottom: '1.5rem',
        left: '1.5rem',
        background: 'linear-gradient(135deg, #0f1419 0%, #1a2332 100%)',
        padding: '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        maxWidth: '450px',
        border: '3px solid #d4af37',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          borderBottom: '2px solid #d4af37',
          paddingBottom: '0.75rem',
          marginBottom: '0.75rem'
        }}>
          <p style={{
            fontSize: '1.1rem',
            fontWeight: 'bold',
            color: '#d4af37',
            fontFamily: '"Noto Serif JP", serif',
            letterSpacing: '0.1em'
          }}>
            ◆ 御使用方法 ◆
          </p>
        </div>
        <p style={{
          fontSize: '0.95rem',
          color: '#f0e6d2',
          lineHeight: '1.8',
          fontFamily: '"Noto Serif JP", serif'
        }}>
          地図上の任意の場所をクリックしてください。<br />
          その土地の特性を反映した架空の学校サイトが自動生成されます。
        </p>
      </div>
    </div>
  )
}
