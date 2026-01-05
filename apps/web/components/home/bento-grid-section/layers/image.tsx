"use client"

export function BentoImageLayer() {
    return (
        <div className="w-full h-full relative">
            <img
                src="/app-dark.png"
                alt="Image Layer Example"
                className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
    )
}
