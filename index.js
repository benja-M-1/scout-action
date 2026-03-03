const core = require('@actions/core')
const github = require('@actions/github')
const tc = require('@actions/tool-cache')

const childProcess = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const process = require('process')

function readVersionFile() {
    const actionRoot = path.join(path.dirname(process.argv[1]), '..')
    const versionFile = path.join(actionRoot, 'version')
    const version = fs.readFileSync(versionFile, 'utf8').trim()

    core.info(`Scout Action version from version file: ${version}`)

    return version
}

async function downloadRelease(version) {
    const octokit = github.getOctokit(core.getInput('github-token'))
    const release = await octokit.rest.repos.getReleaseByTag({
        owner: 'benja-M-1',
        repo: 'scout-action',
        tag: `${version}`,
    })

    const downloadDir = path.join(os.tmpdir(), `scout-action-${version}`)
    fs.mkdirSync(downloadDir, { recursive: true })

    core.info(`Found release ${release.data.tag_name} with ${release.data.assets.length} assets`)

    for (const asset of release.data.assets) {
        core.info(`Downloading asset: ${asset.name} (${(asset.size / 1024 / 1024).toFixed(1)} MB)`)
        const downloadPath = await tc.downloadTool(asset.url, undefined, undefined, {
            accept: 'application/octet-stream',
        })
        fs.renameSync(downloadPath, path.join(downloadDir, asset.name))
    }

    return downloadDir
}

function chooseBinary(dir) {
    const platform = os.platform()
    const arch = os.arch()

    if (platform === 'darwin' && arch === 'x64') {
        return path.join(dir, 'docker-scout-action_darwin_amd64')
    }
    if (platform === 'darwin' && arch === 'arm64') {
        return path.join(dir, 'docker-scout-action_darwin_arm64')
    }
    if (platform === 'linux' && arch === 'x64') {
        return path.join(dir, 'docker-scout-action_linux_amd64')
    }
    if (platform === 'linux' && arch === 'arm64') {
        return path.join(dir, 'docker-scout-action_linux_arm64')
    }
    if (platform === 'win32' && arch === 'x64') {
        return path.join(dir, 'docker-scout-action_windows_amd64.exe')
    }
    if (platform === 'win32' && arch === 'arm64') {
        return path.join(dir, 'docker-scout-action_windows_arm64.exe')
    }

    throw new Error(`Unsupported platform (${platform}) and architecture (${arch})`)
}

async function main() {
    // 1. Read the version from the version file
    const version = readVersionFile()

    // 2. Download the release artifacts
    const dir = await downloadRelease(version)

    // 3. Pick the right binary for this platform
    const binaryPath = chooseBinary(dir)

    if (!fs.existsSync(binaryPath)) {
        throw new Error(`Binary not found at ${binaryPath}`)
    }

    fs.chmodSync(binaryPath, 0o755)

    core.info(`Using binary: ${binaryPath}`)

    // 4. Execute it
    const result = childProcess.spawnSync(binaryPath, { stdio: 'inherit' })
    if (typeof result.status === 'number') {
        process.exit(result.status)
    }
    process.exit(1)
}

main().catch((error) => {
    core.setFailed(error.message)
})
