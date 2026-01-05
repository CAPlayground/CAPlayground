"use client"

export function BentoBasicLayer() {
    return (
        <div className="w-full h-full flex items-center justify-center bg-zinc-900 relative">
            <div className="w-32 h-32 rounded-2xl bg-[#ff5252] shadow-[0_0_40px_rgba(255,82,82,0.4)] rotate-12 transform hover:rotate-45 transition-transform duration-700 ease-out" />
            <div className="w-24 h-24 rounded-full bg-[#5252ff] shadow-[0_0_40px_rgba(82,82,255,0.4)] absolute top-1/4 right-1/4 -z-10 animate-bounce" style={{ animationDuration: '3s' }} />
        </div>
    )
}
