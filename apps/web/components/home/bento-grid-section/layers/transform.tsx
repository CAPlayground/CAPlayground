"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

export function BentoTransformLayer() {
    const [tilt, setTilt] = useState({ x: 0, y: 0 })
    const containerRef = useRef<HTMLDivElement | null>(null)

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()

        const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2
        const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2

        setTilt({ x, y })
    }

    const handleMouseLeave = () => {
        setTilt({ x: 0, y: 0 })
    }

    const sensitivity = 25
    const rotateX = -tilt.y * sensitivity
    const rotateY = tilt.x * sensitivity

    const squareX = tilt.x * 30
    const squareY = tilt.y * 60

    return (
        <div
            ref={containerRef}
            className="w-full h-full bg-zinc-900 flex items-center justify-center p-8 overflow-hidden touch-none"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <div className="relative" style={{ width: 100, height: 180 }}>
                <div
                    className="absolute inset-0 rounded-[1.5rem] bg-zinc-800 border-2 border-zinc-700 shadow-2xl"
                    style={{
                        transform: `perspective(500px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
                        transformStyle: "preserve-3d",
                        transition: "transform 100ms ease-out",
                    }}
                >
                    <div className="absolute inset-1 rounded-[1.2rem] bg-black overflow-hidden flex items-center justify-center">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-3 bg-zinc-800 rounded-b-lg z-20" />
                        <div
                            className="w-8 h-8 rounded-md bg-accent shadow-[0_0_15px_rgba(90,209,151,0.5)] transition-transform duration-100 ease-out"
                            style={{
                                transform: `translate(${squareX}px, ${squareY}px) translateZ(10px)`,
                            }}
                        />

                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-accent/50 via-transparent to-transparent" />
                    </div>

                    <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/20 rounded-full" />
                </div>
            </div>
        </div>
    )
}
