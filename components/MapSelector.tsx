'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader } from '@googlemaps/js-api-loader'
import { LocationData } from '@/types/school'

interface MapSelectorProps {
  onLocationSelect: (location: LocationData) => void
}

export default function MapSelector({ onLocationSelect }: MapSelectorProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [marker, setMarker] = useState<google.maps.Marker | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initMap = async () => {
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        version: 'weekly',
        libraries: ['places'],
      })

      try {
        await loader.load()
        
        if (mapRef.current) {
          const mapInstance = new google.maps.Map(mapRef.current, {
            center: { lat: 35.6762, lng: 139.6503 }, // 東京
            zoom: 10,
            mapTypeControl: true,
            streetViewControl: true,
            fullscreenControl: true,
          })

          setMap(mapInstance)

          // マップクリックイベント
          mapInstance.addListener('click', async (e: google.maps.MapMouseEvent) => {
            if (e.latLng) {
              await handleMapClick(e.latLng, mapInstance)
            }
          })

          setIsLoading(false)
        }
      } catch (error) {
        console.error('地図の読み込みに失敗しました:', error)
        setIsLoading(false)
      }
    }

    initMap()
  }, [])

  const handleMapClick = async (latLng: google.maps.LatLng, mapInstance: google.maps.Map) => {
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
      const nearbyRequest: google.maps.places.PlaceSearchRequest = {
        location: latLng,
        radius: 2000, // 2km圏内
        type: 'point_of_interest',
      }

      placesService.nearbySearch(nearbyRequest, (results, status) => {
        const landmarks = status === google.maps.places.PlacesServiceStatus.OK && results
          ? results.slice(0, 10).map(place => place.name || '')
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
      <div className="absolute bottom-4 left-4 bg-white p-4 rounded-lg shadow-lg max-w-sm">
        <p className="text-sm text-gray-700">
          💡 <strong>使い方：</strong>地図上の任意の場所をクリックしてください。
          その土地の特性を反映した架空の学校サイトが生成されます。
        </p>
      </div>
    </div>
  )
}
