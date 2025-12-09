import { NextResponse } from "next/server"

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/wallpaper_stats?select=id,downloads`,
      {
        headers: {
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`,
        },
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      console.error("Failed to fetch stats:", await response.text())
      return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
    }

    const stats = await response.json()
    return NextResponse.json(stats)
  } catch (error) {
    console.error("Stats fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
