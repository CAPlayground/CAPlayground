import { NextResponse } from "next/server"

export const runtime = 'nodejs'
import { getSupabaseAdminClient, getSupabaseServerClientWithAuth } from "@/lib/supabase"

export async function POST(req: Request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Account deletion is not enabled on this environment. Missing SUPABASE_SERVICE_ROLE_KEY." },
        { status: 501 }
      )
    }

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization")
    if (!authHeader?.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 })
    }
    const token = authHeader.split(" ")[1]

    const userClient = getSupabaseServerClientWithAuth(token)
    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userData.user) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 })
    }

    const userId = userData.user.id

    const admin = getSupabaseAdminClient()
    const { error: delErr } = await admin.auth.admin.deleteUser(userId)
    if (delErr) {
      return NextResponse.json({ error: delErr.message || "Failed to delete user" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected server error" }, { status: 500 })
  }
}
