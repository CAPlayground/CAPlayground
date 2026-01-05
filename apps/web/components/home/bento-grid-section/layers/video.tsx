"use client"

import { useEffect, useRef } from "react"
import { Pause } from "lucide-react"

export function BentoVideoLayer({ isHovered }: { isHovered: boolean }) {
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        if (videoRef.current) {
            if (isHovered) {
                videoRef.current.play().catch(() => { })
            } else {
                videoRef.current.pause()
            }
        }
    }, [isHovered])

    return (
        <div className="w-full h-full relative bg-black">
            <video
                ref={videoRef}
                src="/featured.mp4"
                className="w-full h-full object-cover opacity-80"
                muted
                loop
                playsInline
            />
            {!isHovered && (
                <div className="absolute top-4 left-4 z-20 bg-black/50 backdrop-blur-md p-2 rounded-full border border-white/10">
                    <Pause className="w-4 h-4 text-white" />
                </div>
            )}
        </div>
    )
}
