import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/supabase"

export const runtime = 'nodejs'

export async function POST() {
  try {
    const supabase = getSupabaseAdminClient() as any
    if ((supabase as any)?._disabled) {
      return NextResponse.json({ ok: true, stored: false })
    }

    const { error } = await supabase.from("analytics_events").insert({ event_name: "project_created" })
    if (error) {
      return NextResponse.json({ ok: true, stored: false }, { status: 200 })
    }
    return NextResponse.json({ ok: true, stored: true })
  } catch {
    return NextResponse.json({ ok: true, stored: false }, { status: 200 })
    return NextResponse.json({ ok: true, stored: false }, { status: 200 })
  }
}
