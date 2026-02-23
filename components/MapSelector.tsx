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

      // API 料金削減：Nearby Search は 6 カテゴリに絞る（従来10→6）
      console.log('🔍 地域情報収集を開始します...')
      
      const searchCategories = [
        'convenience_store', 'park', 'shrine', 'train_station', 'library', 'restaurant'
      ]
      
      const allPlaces: any[] = []
      
      // 🚀 最初から広範囲で検索（情報量を最大化）
      const radius = 2000 // 2km圏内で大量検索
      
      console.log(`🔍 ${searchCategories.length}種類のカテゴリで検索（検索半径${radius}m）...`)
      
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
      
      // 情報が少ない場合のみ、広域（5km）で追加検索（2カテゴリに削減）
      if (allPlaces.length < 8) {
        console.warn(`⚠️ 情報が不足（${allPlaces.length}件）、5km圏で追加検索...`)
        
        const wideSearchPromises = ['store', 'park'].map((category) => {
          return new Promise<void>((resolve) => {
            placesService.nearbySearch({
              location: latLng,
              radius: 5000,
              type: category,
              language: 'ja'
            }, (results: any, status: any) => {
              if (status === 'OK' && results) {
                console.log(`  🌐 [${category}] 広域検索: ${results.length}件`)
                allPlaces.push(...results)
              }
              resolve()
            })
          })
        })
        
        await Promise.all(wideSearchPromises)
        console.log(`🎯 広域検索後: 合計 ${allPlaces.length} 件`)
      }
      
      if (allPlaces.length === 0) {
        console.error('❌❌❌ 全ての検索で0件。最終フォールバック。')
        const locationData: LocationData = {
          lat,
          lng,
          address,
          landmarks: ['この地域'],
          place_details: [],
          closest_place: { name: '未知の場所' },
          comprehensive_research: '⚠️ この地域では詳細な情報が取得できませんでした。一般的な内容で生成します。'
        }
        onLocationSelect(locationData)
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
      
      // 詳細情報を抽出（上位10件・Place Details と揃える）
      const placeDetails = sortedPlaces.slice(0, 10).map((place: any) => ({
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
      
      // 地域リサーチ（約70%量：4件で API・処理時間を抑える）
      console.log('📚 地域リサーチを開始します...')
      
      const comprehensiveResearch = await conductComprehensiveResearch(
        sortedPlaces.slice(0, 4),
        address,
        lat,
        lng,
        placesService
      )
      
      console.log(`✅ 地域リサーチ完了！収集した情報量: ${comprehensiveResearch.length} 文字`)
      
      const locationData: LocationData = {
        lat,
        lng,
        address: address || `緯度${lat.toFixed(4)}, 経度${lng.toFixed(4)}`,
        landmarks,
        place_details: placeDetails,
        closest_place: closestPlace,
        comprehensive_research: comprehensiveResearch
      }
      
      console.log('✅✅✅ 位置情報取得完了:', locationData)
      onLocationSelect(locationData)

    } catch (error) {
      console.error('❌ 位置情報の取得に失敗しました:', error)
      // エラーでも最小限の情報で継続（APIが必須とするフィールドを揃える）
      const fallbackData: LocationData = {
        lat,
        lng,
        address: `緯度${lat.toFixed(4)}, 経度${lng.toFixed(4)}`,
        landmarks: ['この地域', '周辺エリア', '地元'],
        place_details: [],
        closest_place: { name: 'この地域' },
        comprehensive_research: 'この地域では詳細な情報が取得できませんでした。基本的な内容で学校を生成します。'
      }
      console.log('🔄 フォールバックデータで継続:', fallbackData)
      onLocationSelect(fallbackData)
    }
  }

  // 🔍 徹底的な地域リサーチを実施する関数
  const conductComprehensiveResearch = async (
    places: any[], 
    address: string,
    lat: number,
    lng: number,
    placesService: any
  ): Promise<string> => {
    let research = ''
    
    // セクション1: 基本情報
    research += `# 📍 位置情報\n`
    research += `緯度: ${lat.toFixed(6)}, 経度: ${lng.toFixed(6)}\n`
    research += `住所: ${address}\n\n`
    
    // セクション2: 地域名の分析
    research += `# 🏘️ 地域名分析\n`
    const addressParts = address.split(/[　 ]/g)
    research += `都道府県: ${addressParts[0] || '不明'}\n`
    research += `市区町村: ${addressParts[1] || '不明'}\n`
    research += `町名・番地: ${addressParts.slice(2).join(' ')}\n\n`
    
    // セクション3: 周辺施設の詳細（約70%：3件・1件12秒制限）
    research += `# 🏛️ 周辺施設の詳細（近い3件）\n\n`
    const PLACE_DETAIL_TIMEOUT_MS = 12_000

    const detailPromises = places.slice(0, 3).map((place, index) => {
      const detailPromise = new Promise<string>((resolve) => {
        placesService.getDetails(
          { placeId: place.place_id, language: 'ja' },
          (details: any, status: any) => {
            if (status === 'OK' && details) {
              let placeInfo = `## ${index + 1}. ${details.name}\n`
              placeInfo += `カテゴリ: ${details.types?.join(', ') || '不明'}\n`
              placeInfo += `住所: ${details.vicinity || details.formatted_address || '不明'}\n`
              
              if (details.rating) {
                placeInfo += `評価: ${details.rating}⭐ (${details.user_ratings_total || 0}件のレビュー)\n`
              }
              
              if (details.business_status) {
                placeInfo += `営業状況: ${details.business_status}\n`
              }
              
              if (details.opening_hours) {
                placeInfo += `営業時間: ${details.opening_hours.weekday_text ? details.opening_hours.weekday_text.slice(0, 2).join(', ') : '情報なし'}\n`
              }
              
              if (details.website) {
                placeInfo += `ウェブサイト: あり\n`
              }
              
              if (details.formatted_phone_number) {
                placeInfo += `電話番号: ${details.formatted_phone_number}\n`
              }
              
              if (details.reviews && details.reviews.length > 0) {
                placeInfo += `\n### レビュー抜粋\n`
                details.reviews.slice(0, 3).forEach((review: any) => {
                  if (review.text && review.text.length > 10) {
                    placeInfo += `- ${review.text.substring(0, 200)}…\n`
                  }
                })
              }
              
              placeInfo += `\n`
              resolve(placeInfo)
            } else {
              resolve(`## ${index + 1}. ${place.name}\n（詳細情報取得失敗）\n\n`)
            }
          }
        )
      })
      const timeoutPromise = new Promise<string>((resolve) =>
        setTimeout(() => resolve(`## ${index + 1}. ${place.name}\n（取得タイムアウト）\n\n`), PLACE_DETAIL_TIMEOUT_MS)
      )
      return Promise.race([detailPromise, timeoutPromise])
    })
    
    console.log('⏳ Place Details 取得中（3件・各12秒制限）...')
    const placeDetailsResults = await Promise.all(detailPromises)
    research += placeDetailsResults.join('')
    
    // Wikipedia（約70%：3件・各200字・8秒制限）
    console.log('📚 Wikipedia取得中（3件・各8秒制限）...')
    research += `\n# 📖 Wikipedia\n\n`
    const WIKI_TIMEOUT_MS = 8_000
    const WIKI_CHAR_MAX = 200

    const wikiPromises = places.slice(0, 3).map(async (place) => {
      const fetchWiki = async (): Promise<string> => {
        const wikiUrl = `https://ja.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(place.name)}&origin=*`
        const wikiResponse = await fetch(wikiUrl)
        const wikiData = await wikiResponse.json()
        if (wikiData.query && wikiData.query.pages) {
          const pages = Object.values(wikiData.query.pages) as any[]
          const page = pages[0]
          if (page?.extract?.length > 50) {
            return `## ${place.name}\n${page.extract.substring(0, WIKI_CHAR_MAX)}\n\n`
          }
        }
        return ''
      }
      try {
        const timeoutPromise = new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), WIKI_TIMEOUT_MS)
        )
        return await Promise.race([fetchWiki(), timeoutPromise])
      } catch {
        return ''
      }
    })
    
    const wikiResults = await Promise.all(wikiPromises)
    const wikiInfo = wikiResults.filter(r => r.length > 0).join('')
    
    if (wikiInfo.length > 50) {
      research += wikiInfo
      console.log(`✅ Wikipedia: ${wikiInfo.length} 文字`)
    } else {
      research += `（Wikipedia情報なし）\n\n`
    }
    
    if (places.length > 8) {
      research += `\n# 📋 その他の施設名\n\n`
      places.slice(8, 22).forEach((place, index) => {
        research += `${index + 9}. ${place.name}\n`
      })
    }
    
    const categoryCount: { [key: string]: number } = {}
    places.forEach(place => {
      place.types?.forEach((type: string) => {
        categoryCount[type] = (categoryCount[type] || 0) + 1
      })
    })
    research += `\n# 📊 カテゴリ（上位3）\n`
    const topCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
    topCategories.forEach(([category, count]) => {
      research += `- ${category}: ${count}件\n`
    })
    research += `\n施設数: ${places.length}件\n\n`
    
    research += `# 固有名詞リスト\n\n`
    const uniqueNames = new Set<string>()
    places.forEach(place => {
      if (place.name && place.name.length > 0) uniqueNames.add(place.name)
    })
    Array.from(uniqueNames).slice(0, 28).forEach((name, i) => {
      research += `${i + 1}. ${name}\n`
    })
    research += `\n`
    
    console.log(`📚 地域リサーチ完了: ${research.length} 文字の詳細情報を収集しました`)
    
    return research
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
