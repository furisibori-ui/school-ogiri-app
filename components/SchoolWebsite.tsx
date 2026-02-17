'use client'

import { motion } from 'framer-motion'
import { SchoolData } from '@/types/school'
import Image from 'next/image'

interface SchoolWebsiteProps {
  data: SchoolData
  onReset: () => void
}

export default function SchoolWebsite({ data, onReset }: SchoolWebsiteProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="school-header text-white py-8 px-6 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-5xl font-bold mb-2 school-classic">
                  {data.school_profile.name}
                </h1>
                <p className="text-xl text-school-gold italic">
                  {data.school_profile.motto}
                </p>
              </div>
              <button
                onClick={onReset}
                className="bg-white text-blue-900 px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors shadow-lg"
              >
                ← 地図に戻る
              </button>
            </div>
          </motion.div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* 学校概要 */}
        <motion.section
          className="bg-white p-8 rounded-lg shadow-md mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-3xl font-bold text-school-navy mb-4 border-b-4 border-school-gold pb-2">
            学校概要
          </h2>
          <p className="text-lg leading-relaxed school-classic text-gray-700">
            {data.school_profile.overview}
          </p>
        </motion.section>

        {/* 校長挨拶 */}
        <motion.section
          className="bg-white p-8 rounded-lg shadow-md mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-3xl font-bold text-school-navy mb-6 border-b-4 border-school-gold pb-2">
            校長挨拶
          </h2>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-1/3">
              {data.principal_message.face_image_url ? (
                <div className="disposable-camera-filter">
                  <Image
                    src={data.principal_message.face_image_url}
                    alt={data.principal_message.name}
                    width={300}
                    height={300}
                    className="w-full rounded-lg"
                  />
                </div>
              ) : (
                <div className="w-full aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <div className="text-6xl mb-2">👤</div>
                    <p className="text-sm">生成中...</p>
                  </div>
                </div>
              )}
              <div className="text-center mt-4">
                <p className="font-bold text-xl">{data.principal_message.name}</p>
                <p className="text-gray-600">{data.principal_message.title}</p>
              </div>
            </div>
            <div className="md:w-2/3">
              <p className="text-lg leading-loose school-classic text-gray-700 whitespace-pre-line">
                {data.principal_message.text}
              </p>
            </div>
          </div>
        </motion.section>

        {/* 校歌 */}
        <motion.section
          className="bg-white p-8 rounded-lg shadow-md mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-3xl font-bold text-school-navy mb-4 border-b-4 border-school-gold pb-2">
            校歌
          </h2>
          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="text-2xl font-bold text-center mb-4 text-school-navy">
              {data.school_anthem.title}
            </h3>
            <p className="text-sm text-gray-600 text-center mb-4">
              曲調：{data.school_anthem.style}
            </p>
            <div className="text-lg leading-loose school-classic text-center whitespace-pre-line">
              {data.school_anthem.lyrics}
            </div>
          </div>
        </motion.section>

        {/* 校則 */}
        <motion.section
          className="bg-white p-8 rounded-lg shadow-md mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-3xl font-bold text-school-navy mb-4 border-b-4 border-school-gold pb-2">
            本校の主な校則
          </h2>
          <ul className="space-y-3">
            {data.crazy_rules.map((rule, index) => (
              <li
                key={index}
                className="flex items-start text-lg school-classic text-gray-700"
              >
                <span className="text-school-gold mr-3 font-bold">第{index + 1}条</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </motion.section>

        {/* 部活動 */}
        <motion.section
          className="bg-white p-8 rounded-lg shadow-md mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h2 className="text-3xl font-bold text-school-navy mb-4 border-b-4 border-school-gold pb-2">
            部活動紹介
          </h2>
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-2xl font-bold mb-3 text-school-navy">
              {data.multimedia_content.club_activity.name}
            </h3>
            <p className="text-lg mb-4 school-classic text-gray-700">
              {data.multimedia_content.club_activity.description}
            </p>
            {data.multimedia_content.club_activity.audio_url ? (
              <div>
                <p className="text-sm text-gray-600 mb-2">🔊 活動の様子（音声）</p>
                <audio controls className="w-full">
                  <source src={data.multimedia_content.club_activity.audio_url} type="audio/mpeg" />
                  お使いのブラウザは音声再生に対応していません。
                </audio>
              </div>
            ) : (
              <div className="bg-gray-200 p-4 rounded text-center text-gray-500">
                <div className="animate-pulse">音声を生成中...</div>
              </div>
            )}
          </div>
        </motion.section>

        {/* 学校行事 */}
        <motion.section
          className="bg-white p-8 rounded-lg shadow-md mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <h2 className="text-3xl font-bold text-school-navy mb-4 border-b-4 border-school-gold pb-2">
            年間行事
          </h2>
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-2xl font-bold mb-3 text-school-navy">
              {data.multimedia_content.school_event.name}
            </h3>
            <p className="text-lg mb-4 school-classic text-gray-700">
              {data.multimedia_content.school_event.description}
            </p>
            {data.multimedia_content.school_event.image_url ? (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">📷 昨年度の様子</p>
                <div className="disposable-camera-filter">
                  <Image
                    src={data.multimedia_content.school_event.image_url}
                    alt={data.multimedia_content.school_event.name}
                    width={800}
                    height={600}
                    className="w-full rounded-lg"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-gray-200 p-8 rounded text-center text-gray-500">
                <div className="animate-pulse">写真を現像中...</div>
              </div>
            )}
          </div>
        </motion.section>

        {/* フッター */}
        <footer className="text-center text-gray-600 mt-12 pb-8">
          <p className="text-sm">
            ※ このサイトはAIにより自動生成されたフィクションです
          </p>
          <p className="text-xs mt-2">
            Powered by Claude 3.5 Sonnet, DALL-E 3, AudioLDM
          </p>
        </footer>
      </div>
    </div>
  )
}
