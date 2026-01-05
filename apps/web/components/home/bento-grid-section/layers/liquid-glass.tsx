"use client"

import { useEffect, useState, useMemo } from "react"
import { getDisplacementFilter } from "@/components/editor/liquid-glass/getDisplacementFilter"
import { getDisplacementMap } from "@/components/editor/liquid-glass/getDisplacementMap"

export function BentoLiquidGlassLayer() {
    const [isSupported, setIsSupported] = useState(true)

    useEffect(() => {
        const checkChromium = () => {
            if (typeof window === 'undefined') return true
            const ua = navigator.userAgent.toLowerCase()
            const isChromium = ua.includes('chrome') || ua.includes('chromium') || ua.includes('edg')
            const isFirefox = ua.includes('firefox')
            const isSafari = ua.includes('safari') && !ua.includes('chrome') && !ua.includes('chromium')

            return isChromium && !isFirefox && !isSafari
        }

        setIsSupported(checkChromium())
    }, [])

    const filter = useMemo(() => getDisplacementFilter({
        height: 300,
        width: 300,
        radius: 40,
        depth: 10,
        strength: 150,
    }), [])

    return (
        <div className="w-full h-full bg-[url('/app-light.png')] bg-cover bg-center flex items-center justify-center relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-300 via-red-500 to-purple-800 opacity-50" />

            {isSupported ? (
                <div
                    className="w-48 h-48 rounded-3xl relative z-10 transition-transform duration-500 hover:scale-110"
                    style={{
                        backdropFilter: `url('${filter}')`,
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
                    }}
                >
                </div>
            ) : (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md">
                    <div className="px-6 py-4 bg-black/40 border border-white/10 rounded-2xl flex flex-col items-center text-center max-w-[80%]">
                        <span className="text-white font-bold text-lg tracking-tight mb-1">Unsupported Browser</span>
                        <span className="text-zinc-400 text-xs">Liquid effects require a Chromium-based browser (Chrome, Edge, Brave).</span>
                    </div>
                </div>
            )}
        </div>
    )
}
