"use client"

export function BentoGradientLayer() {
    return (
        <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.4),transparent)] opacity-50 group-hover:scale-150 transition-transform duration-1000" />
        </div>
    )
}
