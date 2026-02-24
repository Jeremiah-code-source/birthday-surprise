/**
 * Cloudflare Worker — Birthday Video Upload Proxy
 *
 * This worker holds your GitHub token as a secret environment variable (GITHUB_TOKEN).
 * Anyone can send a video to this worker and it will upload it to GitHub on their behalf.
 * The token is NEVER exposed to the browser.
 *
 * ── DEPLOY STEPS ──────────────────────────────────────────────────────────────
 * 1. Go to https://workers.cloudflare.com/ and sign in (free account is fine)
 * 2. Click "Create Worker", paste this entire file, click "Save and Deploy"
 * 3. Go to the worker's Settings → Variables → add a Secret:
 *      Name:  GITHUB_TOKEN
 *      Value: your GitHub Personal Access Token (ghp_...)
 * 4. Copy the worker URL (looks like: https://birthday-upload.YOUR-NAME.workers.dev)
 * 5. Paste that URL into github-config.js → workerUrl
 * ──────────────────────────────────────────────────────────────────────────────
 */

const GITHUB_OWNER = 'Jeremiah-code-source';
const GITHUB_REPO  = 'birthday-videos';
const GITHUB_BRANCH = 'main';
const VIDEOS_FOLDER = 'videos';
const DB_FILE = 'video-database.json';

// Only allow requests from your GitHub Pages / local dev origin.
// Add your real deployed URL here once you have it.
const ALLOWED_ORIGINS = [
    'https://birthday-surprise.kenanprins274.workers.dev',
    'https://birthday-upload.kenanprins274.workers.dev',
    'https://birthday-surprise-ten-lilac.vercel.app',
    'https://jeremiah-code-source.github.io',
    'http://localhost',
    'http://127.0.0.1',
    'null' // file:// opens as null origin
];

export default {
    async fetch(request, env) {
        const origin = request.headers.get('Origin') || '';

        // CORS preflight
        if (request.method === 'OPTIONS') {
            return corsResponse(null, 204, origin);
        }

        if (request.method !== 'POST') {
            return corsResponse(JSON.stringify({ error: 'Method not allowed' }), 405, origin);
        }

        const url = new URL(request.url);
        const action = url.pathname.replace(/^\//, ''); // "upload" or "update-db"

        try {
            if (action === 'upload') {
                return await handleUpload(request, env, origin);
            }
            if (action === 'update-db') {
                return await handleUpdateDb(request, env, origin);
            }
            return corsResponse(JSON.stringify({ error: 'Unknown action' }), 404, origin);
        } catch (err) {
            return corsResponse(JSON.stringify({ error: err.message }), 500, origin);
        }
    }
};

// ── Upload a video file to GitHub ─────────────────────────────────────────────
async function handleUpload(request, env, origin) {
    const body = await request.json();
    const { videoId, base64Content, filename } = body;

    if (!videoId || !base64Content || !filename) {
        return corsResponse(JSON.stringify({ error: 'Missing fields' }), 400, origin);
    }

    const path = `${VIDEOS_FOLDER}/${filename}`;
    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;

    const ghResponse = await fetch(apiUrl, {
        method: 'PUT',
        headers: githubHeaders(env.GITHUB_TOKEN),
        body: JSON.stringify({
            message: `Upload video ${videoId}`,
            content: base64Content,
            branch: GITHUB_BRANCH
        })
    });

    if (!ghResponse.ok) {
        const err = await ghResponse.text();
        return corsResponse(JSON.stringify({ error: `GitHub upload failed: ${ghResponse.status}`, detail: err }), 502, origin);
    }

    const rawUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${path}`;
    return corsResponse(JSON.stringify({ url: rawUrl }), 200, origin);
}

// ── Update video-database.json in GitHub ─────────────────────────────────────
async function handleUpdateDb(request, env, origin) {
    const body = await request.json();
    const { dbContent } = body;

    if (!dbContent) {
        return corsResponse(JSON.stringify({ error: 'Missing dbContent' }), 400, origin);
    }

    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${DB_FILE}`;

    // Get current SHA
    const getResponse = await fetch(apiUrl, {
        headers: githubHeaders(env.GITHUB_TOKEN)
    });

    let sha = null;
    if (getResponse.ok) {
        const data = await getResponse.json();
        sha = data.sha;
    }

    const content = btoa(unescape(encodeURIComponent(JSON.stringify(dbContent, null, 2))));
    const putBody = { message: 'Update video database', content, branch: GITHUB_BRANCH };
    if (sha) putBody.sha = sha;

    const putResponse = await fetch(apiUrl, {
        method: 'PUT',
        headers: githubHeaders(env.GITHUB_TOKEN),
        body: JSON.stringify(putBody)
    });

    if (!putResponse.ok) {
        const err = await putResponse.text();
        return corsResponse(JSON.stringify({ error: `DB update failed: ${putResponse.status}`, detail: err }), 502, origin);
    }

    return corsResponse(JSON.stringify({ ok: true }), 200, origin);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function githubHeaders(token) {
    return {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'BirthdaySurpriseWorker/1.0'
    };
}

function corsResponse(body, status, origin) {
    const isAllowed = ALLOWED_ORIGINS.some(o => origin.startsWith(o));
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };
    return new Response(body, { status, headers });
}