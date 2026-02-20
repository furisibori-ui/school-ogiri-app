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
      
      console.log('=== Google Maps 初期化開始 ===')
      console.log('API Key exists:', apiKey ? 'YES' : 'NO')
      console.log('API Key (first 10 chars):', apiKey ? apiKey.substring(0, 10) + '...' : 'N/A')
      
      if (!apiKey) {
        const errorMsg = 'Google Maps APIキーが設定されていません。\n\n確認事項:\n1. .env.localファイルが存在するか\n2. NEXT_PUBLIC_GOOGLE_MAPS_API_KEYが設定されているか\n3. 開発サーバーを再起動したか (npm run dev)'
        console.error('❌', errorMsg)
        alert(errorMsg)
        setIsLoading(false)
        return
      }

      const loader = new Loader({
        apiKey: apiKey,
        version: 'weekly',
        libraries: ['places', 'geometry'],
      })

      try {
        console.log('📡 Google Maps読み込み中...')
        await loader.load()
        console.log('✅ Google Maps読み込み成功')
        
        if (mapRef.current) {
          console.log('🗺️ マップインスタンス作成中...')
          const mapInstance = new google.maps.Map(mapRef.current, {
            center: { lat: 35.6762, lng: 139.6503 }, // 東京
            zoom: 10,
            mapTypeControl: true,
            streetViewControl: true,
            fullscreenControl: true,
          })

          setMap(mapInstance)
          console.log('✅ マップインスタンス作成成功')

          // マップクリックイベント
          mapInstance.addListener('click', async (e: any) => {
            if (e.latLng) {
              await handleMapClick(e.latLng, mapInstance)
            }
          })

          setIsLoading(false)
          console.log('=== Google Maps 初期化完了 ===')
        }
      } catch (error: any) {
        console.error('❌ 地図の読み込みに失敗しました')
        console.error('Error details:', error)
        console.error('Error message:', error?.message)
        console.error('Error name:', error?.name)
        
        let errorMessage = '地図の読み込みに失敗しました。\n\n'
        
        // エラーの種類に応じたメッセージ
        if (error?.message?.includes('InvalidKeyMapError')) {
          errorMessage += '❌ APIキーが無効です\n\n対処法:\n1. Google Cloud ConsoleでAPIキーを確認\n2. APIキーの制限を確認\n3. 請求先アカウントを設定'
        } else if (error?.message?.includes('NotLoadedMapError')) {
          errorMessage += '❌ Maps JavaScript APIが有効化されていません\n\n対処法:\n1. Google Cloud Consoleを開く\n2. "APIとサービス" → "ライブラリ"\n3. "Maps JavaScript API"を検索して有効化'
        } else if (error?.message?.includes('RefererNotAllowedMapError')) {
          errorMessage += '❌ リファラー制限エラー\n\n対処法:\n1. Google Cloud ConsoleでAPIキーを選択\n2. "アプリケーションの制限"を"なし"に設定\n3. または、現在のドメインを許可リストに追加'
        } else if (error?.message?.includes('Billing')) {
          errorMessage += '❌ 請求先アカウントが設定されていません\n\n対処法:\n1. Google Cloud Consoleで請求先アカウントを設定\n2. クレジットカード情報を登録\n（月$200の無料枠があります）'
        } else {
          errorMessage += `エラー内容: ${error?.message || error}\n\nJavaScriptコンソールで詳細を確認してください。`
        }
        
        alert(errorMessage)
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
      console.log('📍 位置情報取得開始:', lat, lng)
      
      // 住所取得（日本語優先）
      const geocodeResult = await geocoder.geocode({ 
        location: latLng,
        language: 'ja'
      })
      
      const address = geocodeResult.results[0]?.formatted_address || ''
      console.log('📮 住所:', address)

      // 🔥🔥🔥 20種類以上のカテゴリで徹底検索 🔥🔥🔥
      console.log('🔍🔍🔍 徹底的な地域情報収集を開始します...')
      
      // 検索カテゴリ（25種類）
      const searchCategories = [
        'restaurant',         // レストラン
        'cafe',              // カフェ
        'convenience_store', // コンビニ
        'school',            // 学校
        'park',              // 公園
        'shrine',            // 神社
        'temple',            // 寺
        'hospital',          // 病院
        'bank',              // 銀行
        'post_office',       // 郵便局
        'train_station',     // 駅
        'bus_station',       // バス停
        'shopping_mall',     // 商店街
        'book_store',        // 書店
        'supermarket',       // スーパー
        'pharmacy',          // 薬局
        'library',           // 図書館
        'museum',            // 博物館
        'city_hall',         // 公民館
        'tourist_attraction',// 観光地
        'store',             // 店舗
        'establishment',     // 施設
        'bakery',            // パン屋
        'gas_station',       // ガソリンスタンド
        'university'         // 大学
      ]
      
      const allPlaces: any[] = []
      const radius = 300 // 300m圏内で集中検索
      
      console.log(`📡 ${searchCategories.length}種類のカテゴリで並行検索開始（${radius}m圏内）...`)
      
      // 全カテゴリを並行検索
      const searchPromises = searchCategories.map((category) => {
        return new Promise<void>((resolve) => {
          const searchRequest: any = {
            location: latLng,
            radius: radius,
            type: category,
            language: 'ja'
          }
          
          placesService.nearbySearch(searchRequest, (results: any, status: any) => {
            if (status === 'OK' && results && results.length > 0) {
              console.log(`  ✅ [${category}] ${results.length}件取得`)
              allPlaces.push(...results)
            } else {
              console.log(`  ⚠️ [${category}] 0件`)
            }
            resolve()
          })
        })
      })
      
      // 全検索が完了するまで待機
      await Promise.all(searchPromises)
      
      console.log(`🎉 全検索完了！合計 ${allPlaces.length} 件の情報を取得しました`)
      
      if (allPlaces.length === 0) {
        // 検索範囲を広げて再検索
        console.warn('⚠️ 300m圏内で見つからず、1km圏内で再検索...')
        
        const fallbackRequest: any = {
          location: latLng,
          radius: 1000,
          language: 'ja'
        }
        
        placesService.nearbySearch(fallbackRequest, (results: any, status: any) => {
          if (status === 'OK' && results && results.length > 0) {
            const landmarks = results
              .slice(0, 30)
              .map((place: any) => place.name || '')
              .filter((name: string) => name.length > 0)
            
            const placeDetails = results.slice(0, 20).map((place: any) => ({
              name: place.name || '',
              types: place.types || [],
              vicinity: place.vicinity || '',
              rating: place.rating,
              user_ratings_total: place.user_ratings_total,
              business_status: place.business_status,
              place_id: place.place_id
            }))
            
            const closestPlace = placeDetails[0]
            
            const locationData: LocationData = {
              lat,
              lng,
              address: address || `緯度${lat.toFixed(4)}, 経度${lng.toFixed(4)}`,
              landmarks,
              place_details: placeDetails,
              closest_place: closestPlace
            }
            
            console.log('✅ 広域検索で位置情報取得完了:', locationData)
            onLocationSelect(locationData)
          } else {
            // 最終的に見つからない場合
            console.warn('⚠️ 全ての検索で見つかりませんでした')
            const locationData: LocationData = {
              lat,
              lng,
              address: address || `緯度${lat.toFixed(4)}, 経度${lng.toFixed(4)}`,
              landmarks: ['この地域', '周辺エリア', '地元']
            }
            onLocationSelect(locationData)
          }
        })
        return
      }
      
      // 重複を削除（place_idでユニーク化）
      const uniquePlaces = Array.from(
        new Map(allPlaces.map(place => [place.place_id, place])).values()
      )
      
      console.log(`🔥 ユニーク化後: ${uniquePlaces.length} 件`)
      
      // 距離でソート（近い順）
      const sortedPlaces = uniquePlaces.sort((a: any, b: any) => {
        const distA = google.maps.geometry.spherical.computeDistanceBetween(
          latLng,
          new google.maps.LatLng(a.geometry.location.lat(), a.geometry.location.lng())
        )
        const distB = google.maps.geometry.spherical.computeDistanceBetween(
          latLng,
          new google.maps.LatLng(b.geometry.location.lat(), b.geometry.location.lng())
        )
        return distA - distB
      })
      
      // ランドマーク名を抽出（上位50件）
      const landmarks = sortedPlaces
        .slice(0, 50)
        .map((place: any) => place.name || '')
        .filter((name: string) => name.length > 0)
      
      // 詳細情報を抽出（上位30件）
      const placeDetails = sortedPlaces.slice(0, 30).map((place: any) => ({
        name: place.name || '',
        types: place.types || [],
        vicinity: place.vicinity || '',
        rating: place.rating,
        user_ratings_total: place.user_ratings_total,
        business_status: place.business_status,
        place_id: place.place_id
      }))
      
      // 最も近い場所
      const closestPlace = placeDetails[0]
      
      console.log('📍 最も近い場所:', closestPlace?.name)
      console.log('🏛️ ランドマーク一覧（上位10件）:', landmarks.slice(0, 10))
      
      const locationData: LocationData = {
        lat,
        lng,
        address: address || `緯度${lat.toFixed(4)}, 経度${lng.toFixed(4)}`,
        landmarks,
        place_details: placeDetails,
        closest_place: closestPlace
      }
      
      console.log('✅✅✅ 位置情報取得完了:', locationData)
      onLocationSelect(locationData)

    } catch (error) {
      console.error('❌ 位置情報の取得に失敗しました:', error)
      // エラーでも最小限の情報で継続
      const fallbackData: LocationData = {
        lat,
        lng,
        address: `緯度${lat.toFixed(4)}, 経度${lng.toFixed(4)}`,
        landmarks: ['この地域', '周辺エリア', '地元']
      }
      console.log('🔄 フォールバックデータで継続:', fallbackData)
      onLocationSelect(fallbackData)
    }
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  return (
    <div className="relative w-full h-full">
      {/* デバッグ情報パネル */}
      {!apiKey && (
        <div style={{
          position: 'absolute',
          top: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#dc2626',
          color: 'white',
          padding: '1rem 2rem',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 20,
          border: '2px solid #991b1b',
          maxWidth: '600px',
          textAlign: 'center'
        }}>
          <p style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            ⚠️ Google Maps APIキーが設定されていません
          </p>
          <p style={{ fontSize: '0.875rem' }}>
            .env.local に NEXT_PUBLIC_GOOGLE_MAPS_API_KEY を設定してください
          </p>
        </div>
      )}
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">地図を読み込んでいます...</p>
            <p className="text-gray-500 text-sm mt-2">
              {apiKey ? 'APIキー: 設定済み ✅' : 'APIキー: 未設定 ❌'}
            </p>
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
