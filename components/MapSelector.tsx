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
      
      // 🔥🔥🔥 徹底的な地域リサーチを開始 🔥🔥🔥
      console.log('📚📚📚 詳細な地域リサーチを開始します（最大3分）...')
      
      const comprehensiveResearch = await conductComprehensiveResearch(
        sortedPlaces.slice(0, 30), 
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
    
    // セクション3: 周辺施設の詳細分析（Place Details API）
    // コストとのバランスを考慮して、最も近い5件のみ詳細取得
    research += `# 🏛️ 周辺施設の詳細情報（最も近い5件）\n\n`
    
    const detailPromises = places.slice(0, 5).map((place, index) => {
      return new Promise<string>((resolve) => {
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
              
              // レビューテキストを収集（最重要！）
              if (details.reviews && details.reviews.length > 0) {
                placeInfo += `\n### 📝 レビュー抜粋:\n`
                details.reviews.slice(0, 2).forEach((review: any, i: number) => {
                  if (review.text && review.text.length > 10) {
                    placeInfo += `- (${review.rating}⭐) ${review.text.substring(0, 100)}...\n`
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
    })
    
    console.log('⏳ Place Details API で詳細情報を取得中（5件、コスト最適化）...')
    const placeDetailsResults = await Promise.all(detailPromises)
    research += placeDetailsResults.join('')
    
    // 残りの施設は基本情報のみ（コスト削減）
    research += `\n# 📋 その他の周辺施設（基本情報のみ、${Math.min(places.length - 5, 25)}件）\n\n`
    places.slice(5, 30).forEach((place, index) => {
      research += `${index + 6}. ${place.name}（${place.types?.slice(0, 2).join(', ') || '施設'}）\n`
    })
    research += `\n`
    
    // セクション4: カテゴリ別統計
    research += `\n# 📊 カテゴリ別施設統計\n`
    const categoryCount: { [key: string]: number } = {}
    places.forEach(place => {
      place.types?.forEach((type: string) => {
        categoryCount[type] = (categoryCount[type] || 0) + 1
      })
    })
    
    const topCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
    
    topCategories.forEach(([category, count]) => {
      research += `- ${category}: ${count}件\n`
    })
    research += `\n`
    
    // セクション5: 地域の特徴推測
    research += `# 🔍 地域の特徴推測\n`
    
    if (categoryCount['restaurant'] > 5) {
      research += `- 飲食店が多く、商業地域の可能性が高い\n`
    }
    if (categoryCount['convenience_store'] > 3) {
      research += `- コンビニが多く、利便性の高い地域\n`
    }
    if (categoryCount['shrine'] || categoryCount['temple']) {
      research += `- 神社仏閣があり、歴史的な地域\n`
    }
    if (categoryCount['park'] > 2) {
      research += `- 公園が多く、自然環境に恵まれた地域\n`
    }
    if (categoryCount['train_station'] || categoryCount['bus_station']) {
      research += `- 公共交通機関が充実している地域\n`
    }
    if (categoryCount['school'] || categoryCount['university']) {
      research += `- 教育施設があり、文教地区の可能性\n`
    }
    
    research += `\n`
    
    // セクション6: 距離と密度の分析
    research += `# 📏 空間分析\n`
    research += `検索範囲: 300m圏内\n`
    research += `発見された施設数: ${places.length}件\n`
    research += `施設密度: ${(places.length / 0.283).toFixed(1)}件/km²\n`
    
    if (places.length > 50) {
      research += `評価: 非常に高密度な都市部\n`
    } else if (places.length > 20) {
      research += `評価: 中密度の住宅・商業地域\n`
    } else {
      research += `評価: 低密度の郊外地域\n`
    }
    
    research += `\n`
    
    // セクション7: 固有名詞の抽出
    research += `# 📝 固有名詞リスト（重要！）\n`
    const uniqueNames = new Set<string>()
    places.forEach(place => {
      if (place.name && place.name.length > 0) {
        uniqueNames.add(place.name)
      }
    })
    
    Array.from(uniqueNames).slice(0, 50).forEach((name, i) => {
      research += `${i + 1}. ${name}\n`
    })
    
    research += `\n---\n`
    research += `合計情報量: ${research.length} 文字\n`
    
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
