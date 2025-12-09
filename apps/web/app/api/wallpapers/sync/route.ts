import { NextResponse } from "next/server"
import { App } from "octokit"
import { createClient } from "@supabase/supabase-js"

export const runtime = 'nodejs'

export async function POST(request: Request) {
    try {
        const { submission_id } = await request.json()
        if (!submission_id) {
            return NextResponse.json({ error: "Missing submission_id" }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

        if (!supabaseServiceKey) {
            console.error("Missing SUPABASE_SERVICE_ROLE_KEY")
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const { data: submission, error: fetchError } = await supabase
            .from('wallpaper_submissions')
            .select('*')
            .eq('id', submission_id)
            .single()

        if (fetchError || !submission) {
            return NextResponse.json({ error: "Submission not found" }, { status: 404 })
        }

        if (['approved', 'rejected'].includes(submission.status)) {
            return NextResponse.json({ status: submission.status, updated: false })
        }
        const appId = process.env.GITHUB_APP_ID
        const privateKey = process.env.GITHUB_APP_PRIVATE_KEY
        const installationId = process.env.GITHUB_INSTALLATION_ID

        if (!appId || !privateKey || !installationId) {
            return NextResponse.json({ error: "GitHub config missing" }, { status: 500 })
        }

        const app = new App({
            appId,
            privateKey: privateKey.replace(/\\n/g, '\n'),
        })

        const octokit = await app.getInstallationOctokit(parseInt(installationId))

        const slugUsername = (submission.github_username || 'user')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'user'

        const branchName = `${slugUsername}/${submission.id}`

        const { data: prs } = await octokit.rest.pulls.list({
            owner: 'CAPlayground',
            repo: 'wallpapers',
            head: `CAPlayground:${branchName}`,
            state: 'all',
            per_page: 1
        })

        let pr = prs[0]

        if (!pr) {
            const { data: searchResults } = await octokit.rest.search.issuesAndPullRequests({
                q: `repo:CAPlayground/wallpapers is:pr head:${branchName}`
            })
            if (searchResults.items.length > 0) {
                pr = searchResults.items[0] as any
            }
        }

        if (!pr) {
            return NextResponse.json({ status: submission.status, message: "PR not found" })
        }

        let newStatus = submission.status
        if (pr.merged_at) {
            newStatus = 'approved'
        } else if (pr.state === 'closed') {
            newStatus = 'rejected'
        }
        if (newStatus !== submission.status) {
            const { error: updateError } = await supabase
                .from('wallpaper_submissions')
                .update({ status: newStatus })
                .eq('id', submission_id)

            if (updateError) {
                throw updateError
            }
            return NextResponse.json({ status: newStatus, updated: true, previous: submission.status })
        }

        return NextResponse.json({ status: submission.status, updated: false })

    } catch (error: any) {
        console.error("Sync error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
