"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface LayerItem {
    id: string
    title: string
    description: string
    type: 'basic' | 'gradient' | 'image' | 'video' | 'emitter' | 'replicator' | 'liquid-glass' | 'transform'
    exampleId?: string
}

interface BentoItemProps {
    item: LayerItem
    renderLayer: (isHovered: boolean) => React.ReactNode
    onExampleClick?: () => void
    className?: string
}

export function BentoItem({ item, renderLayer, onExampleClick, className }: BentoItemProps) {
    const [isHovered, setIsHovered] = useState(false)

    return (
        <div
            className={cn(
                "group relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-black",
                "transition-all duration-500 ease-out",
                "hover:border-accent hover:shadow-[0_0_20px_rgba(90,209,151,0.4)]",
                "h-[300px] md:h-[350px] lg:h-[400px]",
                className
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="absolute inset-0 z-0 bg-black">
                <div className="relative w-full h-full opacity-60 transition-opacity duration-500 group-hover:opacity-100">
                    {renderLayer(isHovered)}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
                </div>
            </div>

            <div className="absolute inset-0 z-10 flex flex-col justify-end p-6 select-none pointer-events-none">
                <div className="relative w-full">
                    <div className="transition-all duration-500 ease-out transform group-hover:opacity-0 group-hover:-translate-y-4">
                        <h3 className="text-xl md:text-2xl font-bold text-white mb-2 drop-shadow-md">
                            {item.title}
                        </h3>
                        <p className="text-sm text-zinc-300 drop-shadow-sm line-clamp-2 md:line-clamp-none">
                            {item.description}
                        </p>
                    </div>

                    {onExampleClick && (
                        <div className="absolute inset-0 flex flex-col justify-end pointer-events-none group-hover:pointer-events-auto opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out transform translate-y-4 group-hover:translate-y-0">
                            <Button
                                className="w-full h-12 bg-accent hover:bg-accent/90 text-white font-semibold shadow-lg shadow-accent/20"
                                onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation()
                                    onExampleClick()
                                }}
                            >
                                Example Wallpaper
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
