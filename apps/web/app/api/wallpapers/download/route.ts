import { NextRequest, NextResponse } from "next/server"

export const runtime = 'nodejs'

const RATE_LIMIT_COUNT = 5
const RATE_LIMIT_WINDOW_MS = 30 * 60 * 1000 // 30 minutes rate limit

function getUserFingerprint(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  return `${ip}:${userAgent}`
}

export async function POST(request: NextRequest) {
  try {
    const { wallpaperId } = await request.json()
    
    if (!wallpaperId) {
      return NextResponse.json({ error: "Missing wallpaperId" }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase not configured for download tracking")
      return NextResponse.json({ error: "Service not configured" }, { status: 500 })
    }

    const userFingerprint = getUserFingerprint(request)
    const now = new Date()
    const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS)

    const rateLimitCheckResponse = await fetch(
      `${supabaseUrl}/rest/v1/download_attempts?user_fingerprint=eq.${encodeURIComponent(userFingerprint)}&attempted_at=gte.${windowStart.toISOString()}&counted=eq.true&select=id`,
      {
        headers: {
          "apikey": supabaseServiceKey,
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
      }
    )

    if (!rateLimitCheckResponse.ok) {
      console.error("Failed to check rate limit:", await rateLimitCheckResponse.text())
    }

    const recentAttempts = await rateLimitCheckResponse.json()
    const shouldCount = Array.isArray(recentAttempts) && recentAttempts.length < RATE_LIMIT_COUNT

    await fetch(`${supabaseUrl}/rest/v1/download_attempts`, {
      method: "POST",
      headers: {
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        user_fingerprint: userFingerprint,
        wallpaper_id: wallpaperId,
        counted: shouldCount,
      }),
    })

    if (!shouldCount) {
      return NextResponse.json({ 
        success: true, 
        counted: false,
        message: "Rate limit reached. Download not counted."
      })
    }

    const checkResponse = await fetch(
      `${supabaseUrl}/rest/v1/wallpaper_stats?id=eq.${wallpaperId}&select=id,downloads`,
      {
        headers: {
          "apikey": supabaseServiceKey,
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
      }
    )

    if (!checkResponse.ok) {
      console.error("Failed to check existing stats:", await checkResponse.text())
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    const existing = await checkResponse.json()

    if (existing && existing.length > 0) {
      const updateResponse = await fetch(
        `${supabaseUrl}/rest/v1/wallpaper_stats?id=eq.${wallpaperId}`,
        {
          method: "PATCH",
          headers: {
            "apikey": supabaseServiceKey,
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({
            downloads: existing[0].downloads + 1,
            updated_at: new Date().toISOString(),
          }),
        }
      )

      if (!updateResponse.ok) {
        console.error("Failed to update downloads:", await updateResponse.text())
        return NextResponse.json({ error: "Failed to update" }, { status: 500 })
      }
    } else {
      const insertResponse = await fetch(`${supabaseUrl}/rest/v1/wallpaper_stats`, {
        method: "POST",
        headers: {
          "apikey": supabaseServiceKey,
          "Authorization": `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          id: wallpaperId,
          downloads: 1,
        }),
      })

      if (!insertResponse.ok) {
        console.error("Failed to insert stats:", await insertResponse.text())
        return NextResponse.json({ error: "Failed to create" }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, counted: true })
  } catch (error) {
    console.error("Download tracking error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
