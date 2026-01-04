"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

export function BentoReplicatorLayer() {
    const [count, setCount] = useState(1)

    useEffect(() => {
        const interval = setInterval(() => {
            setCount((prev) => {
                if (prev >= 5) {
                    clearInterval(interval)
                    return prev
                }
                return prev + 1
            })
        }, 1000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="w-full h-full bg-zinc-900 flex items-center justify-center relative overflow-hidden">
            <div className="relative flex items-center justify-center">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div
                        key={i}
                        className={cn(
                            "absolute w-16 h-12 rounded-xl bg-accent",
                            i < count ? "opacity-100" : "opacity-0"
                        )}
                        style={{
                            transform: `translateX(${(i - 2) * 80}px) rotate(${i * 10}deg)`,
                        }}
                    />
                ))}
            </div>
        </div>
    )
}
