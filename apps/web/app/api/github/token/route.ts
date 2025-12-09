import { NextResponse } from "next/server"
import { App } from "octokit"

export const runtime = 'nodejs'

export async function GET() {
    const appId = process.env.GITHUB_APP_ID
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY
    const installationId = process.env.GITHUB_INSTALLATION_ID

    if (!appId || !privateKey || !installationId) {
        return NextResponse.json({ error: "Missing GitHub App configuration" }, { status: 500 })
    }

    try {
        const app = new App({
            appId,
            privateKey: privateKey.replace(/\\n/g, '\n'),
        })

        const octokit = await app.getInstallationOctokit(parseInt(installationId))
        const auth: any = await octokit.auth({ type: "installation" })

        return NextResponse.json({ token: auth.token })
    } catch (error: any) {
        console.error("Failed to generate token:", error)
        return NextResponse.json({ error: "Failed to generate token" }, { status: 500 })
    }
}

