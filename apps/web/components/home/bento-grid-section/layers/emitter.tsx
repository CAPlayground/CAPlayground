"use client"

import { useEffect, useRef, useState } from "react"
import { CAEmitterLayer, CAEmitterCell } from "@/components/editor/emitter/emitter"
import { Pause } from "lucide-react"

export function BentoEmitterLayer({ isHovered }: { isHovered: boolean }) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const rafRef = useRef<number>(0)
    const layerRef = useRef<CAEmitterLayer | null>(null)
    const isHoveredRef = useRef(isHovered)
    const [isInitializing, setIsInitializing] = useState(true)
    const isInitializingRef = useRef(true)

    useEffect(() => {
        isHoveredRef.current = isHovered
    }, [isHovered])

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsInitializing(false)
            isInitializingRef.current = false
        }, 1000)
        return () => clearTimeout(timer)
    }, [])

    const particleSrc = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='4'/%3E%3C/svg%3E";

    useEffect(() => {
        if (!canvasRef.current) return

        const canvas = canvasRef.current
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        canvas.width = canvas.parentElement?.clientWidth || 300
        canvas.height = canvas.parentElement?.clientHeight || 400

        const layer = new CAEmitterLayer()
        layer.emitterPosition = { x: 0, y: 0 }
        layer.emitterSize = { w: canvas.width, h: 0 }
        layer.emitterShape = 'line'
        layer.emitterMode = 'outline'

        const cell = new CAEmitterCell()
        cell.name = "particle"
        cell.birthRate = 20
        cell.lifetime = 4.0
        cell.velocity = 80
        cell.velocityRange = 20
        cell.yAcceleration = 20
        cell.scale = 0.5
        cell.scaleRange = 0.2
        cell.alphaSpeed = -0.3
        cell.emissionLongitude = Math.PI / 2
        cell.emissionRange = Math.PI / 4

        const img = new Image()
        img.src = particleSrc
        img.onload = () => {
            cell.contents = img
        }

        layer.emitterCells = [cell]
        layerRef.current = layer

        let lastTime = performance.now()

        const loop = (time: number) => {
            const dt = Math.min(0.05, (time - lastTime) / 1000)
            lastTime = time

            if ((isHoveredRef.current || isInitializingRef.current) && layerRef.current) {
                ctx.clearRect(0, 0, canvas.width, canvas.height)
                ctx.save()
                ctx.translate(canvas.width / 2, 50)
                layerRef.current.step(dt)
                layerRef.current.draw(ctx)
                ctx.restore()
            }

            rafRef.current = requestAnimationFrame(loop)
        }
        rafRef.current = requestAnimationFrame(loop)

        return () => cancelAnimationFrame(rafRef.current)
    }, [])

    return (
        <div className="w-full h-full bg-zinc-900 relative">
            <canvas ref={canvasRef} className="w-full h-full block" />
            {!isHovered && !isInitializing && (
                <div className="absolute top-4 left-4 z-20 bg-black/50 backdrop-blur-md p-2 rounded-full border border-white/10">
                    <Pause className="w-4 h-4 text-white" />
                </div>
            )}
        </div>
    )
}
