import { useState } from "react"

type Tab = "windows" | "vps" | "pair"

export default function SyncthingSetupPage() {
  const [ activeTab, setActiveTab ] = useState<Tab>("windows")

  return (
    <div className="mx-auto max-w-3xl py-4">
      <h2 className="sr-only">Step-by-step guide to setting up Syncthing on Windows and a Linux VPS</h2>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          className={ `cursor-pointer rounded-md border px-4 py-2 font-sans text-sm transition ${
            activeTab === "windows"
              ? "border-[#60a5fa] bg-white/5 font-medium text-white"
              : "border-white/10 bg-transparent text-gray-400 hover:bg-white/5"
          }` }
          onClick={ () => setActiveTab("windows") }
        >
          Windows setup
        </button>
        <button
          className={ `cursor-pointer rounded-md border px-4 py-2 font-sans text-sm transition ${
            activeTab === "vps"
              ? "border-[#60a5fa] bg-white/5 font-medium text-white"
              : "border-white/10 bg-transparent text-gray-400 hover:bg-white/5"
          }` }
          onClick={ () => setActiveTab("vps") }
        >
          VPS (Linux) setup
        </button>
        <button
          className={ `cursor-pointer rounded-md border px-4 py-2 font-sans text-sm transition ${
            activeTab === "pair"
              ? "border-[#60a5fa] bg-white/5 font-medium text-white"
              : "border-white/10 bg-transparent text-gray-400 hover:bg-white/5"
          }` }
          onClick={ () => setActiveTab("pair") }
        >
          Pairing the two
        </button>
      </div>

      { activeTab === "windows" && (
        <div>
          <p className="mb-3 mt-6 text-[11px] font-medium uppercase tracking-widest text-gray-500">Installation</p>

          <div className="mb-6">
            <div className="mb-2 flex items-start gap-3">
              <div className="mt-px flex h-[26px] min-w-[26px] items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-medium text-gray-400">1</div>
              <div><h3 className="m-0 pb-1 text-[15px] font-medium text-white">Download Syncthing for Windows</h3></div>
            </div>
            <div className="ml-[38px]">
              <p className="m-0 text-sm leading-relaxed text-gray-400">Go to the official Syncthing releases page and grab the Windows (amd64) zip.</p>
              <a className="my-1.5 inline-block rounded-md border border-white/10 bg-transparent px-4 py-2 font-sans text-[13px] text-[#60a5fa] no-underline transition hover:bg-white/5" href="https://github.com/syncthing/syncthing/releases/latest" target="_blank" rel="noreferrer">syncthing/releases ↗</a>
              <p className="m-0 mt-2 text-sm leading-relaxed text-gray-400">Look for a file like <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[13px] text-white">syncthing-windows-amd64-v1.x.x.zip</code> and extract it to a permanent location, e.g. <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[13px] text-white">C:\syncthing\</code></p>
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-2 flex items-start gap-3">
              <div className="mt-px flex h-[26px] min-w-[26px] items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-medium text-gray-400">2</div>
              <div><h3 className="m-0 pb-1 text-[15px] font-medium text-white">Run Syncthing for the first time</h3></div>
            </div>
            <div className="ml-[38px]">
              <p className="m-0 text-sm leading-relaxed text-gray-400">Double-click <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[13px] text-white">syncthing.exe</code>. A browser window will open automatically at:</p>
              <div className="my-2 overflow-x-auto whitespace-pre rounded-md border border-white/10 bg-white/5 p-3 font-mono text-[13px] leading-relaxed text-white">http://127.0.0.1:8384</div>
              <p className="m-0 text-sm leading-relaxed text-gray-400">This is the Web UI. Keep it open.</p>
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-2 flex items-start gap-3">
              <div className="mt-px flex h-[26px] min-w-[26px] items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-medium text-gray-400">3</div>
              <div><h3 className="m-0 pb-1 text-[15px] font-medium text-white">Set a GUI password</h3></div>
            </div>
            <div className="ml-[38px]">
              <p className="m-0 text-sm leading-relaxed text-gray-400">In the Web UI go to <strong className="font-semibold text-gray-300">Actions → Settings → GUI</strong> and set a username and password. This secures the Web UI from local access.</p>
            </div>
          </div>

          <p className="mb-3 mt-6 text-[11px] font-medium uppercase tracking-widest text-gray-500">Configure your folder</p>

          <div className="mb-6">
            <div className="mb-2 flex items-start gap-3">
              <div className="mt-px flex h-[26px] min-w-[26px] items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-medium text-gray-400">5</div>
              <div><h3 className="m-0 pb-1 text-[15px] font-medium text-white">Add a shared folder</h3></div>
            </div>
            <div className="ml-[38px]">
              <p className="m-0 text-sm leading-relaxed text-gray-400">In the Web UI click <strong className="font-semibold text-gray-300">Add Folder</strong>. Fill in:</p>
              <div className="my-2 overflow-x-auto whitespace-pre rounded-md border border-white/10 bg-white/5 p-3 font-mono text-[13px] leading-relaxed text-white">Folder Label: My VPS Files
                Folder Path: C:\vps-sync\ (or wherever you want)
                Folder ID: vps-main (must match on both machines)
              </div>
              <p className="m-0 mt-2 text-sm leading-relaxed text-gray-400">Leave everything else as default for now. Click <strong className="font-semibold text-gray-300">Save</strong>.</p>
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-2 flex items-start gap-3">
              <div className="mt-px flex h-[26px] min-w-[26px] items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-medium text-gray-400">6</div>
              <div><h3 className="m-0 pb-1 text-[15px] font-medium text-white">Note your Device ID</h3></div>
            </div>
            <div className="ml-[38px]">
              <p className="m-0 text-sm leading-relaxed text-gray-400">Go to <strong className="font-semibold text-gray-300">Actions → Show ID</strong>. Copy this long string — you'll need it when setting up the VPS.</p>
            </div>
          </div>
        </div>
      ) }

      { activeTab === "vps" && (
        <div>
          <p className="mb-3 mt-6 text-[11px] font-medium uppercase tracking-widest text-gray-500">Installation</p>

          <div className="mb-6">
            <div className="mb-2 flex items-start gap-3">
              <div className="mt-px flex h-[26px] min-w-[26px] items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-medium text-gray-400">1</div>
              <div><h3 className="m-0 pb-1 text-[15px] font-medium text-white">Add the Syncthing apt repository</h3></div>
            </div>
            <div className="ml-[38px]">
              <p className="m-0 text-sm leading-relaxed text-gray-400">SSH into your VPS and run:</p>
              <div className="my-2 overflow-x-auto whitespace-pre rounded-md border border-white/10 bg-white/5 p-3 font-mono text-[13px] leading-relaxed text-white">curl -s https://syncthing.net/release-key.txt | sudo gpg --dearmor -o /usr/share/keyrings/syncthing-archive-keyring.gpg

                echo "deb [signed-by=/usr/share/keyrings/syncthing-archive-keyring.gpg] https://apt.syncthing.net/ syncthing stable" | sudo tee /etc/apt/sources.list.d/syncthing.list

                sudo apt update && sudo apt install syncthing -y
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-2 flex items-start gap-3">
              <div className="mt-px flex h-[26px] min-w-[26px] items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-medium text-gray-400">2</div>
              <div><h3 className="m-0 pb-1 text-[15px] font-medium text-white">Enable and start Syncthing as a service</h3></div>
            </div>
            <div className="ml-[38px]">
              <p className="m-0 text-sm leading-relaxed text-gray-400">Replace <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[13px] text-white">youruser</code> with your actual Linux username (e.g. <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[13px] text-white">root</code>):</p>
              <div className="my-2 overflow-x-auto whitespace-pre rounded-md border border-white/10 bg-white/5 p-3 font-mono text-[13px] leading-relaxed text-white">sudo systemctl enable syncthing@youruser.service
                sudo systemctl start syncthing@youruser.service
              </div>
              <p className="m-0 mt-2 text-sm leading-relaxed text-gray-400">Verify it's running:</p>
              <div className="my-2 overflow-x-auto whitespace-pre rounded-md border border-white/10 bg-white/5 p-3 font-mono text-[13px] leading-relaxed text-white">sudo systemctl status syncthing@youruser.service</div>
            </div>
          </div>

          <p className="mb-3 mt-6 text-[11px] font-medium uppercase tracking-widest text-gray-500">Access the Web UI remotely</p>

          <div className="mb-6">
            <div className="mb-2 flex items-start gap-3">
              <div className="mt-px flex h-[26px] min-w-[26px] items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-medium text-gray-400">3</div>
              <div><h3 className="m-0 pb-1 text-[15px] font-medium text-white">Forward the GUI port via SSH tunnel</h3></div>
            </div>
            <div className="ml-[38px]">
              <p className="m-0 text-sm leading-relaxed text-gray-400">By default the VPS Web UI only listens on localhost. From your Windows machine, create an SSH tunnel:</p>
              <div className="my-2 overflow-x-auto whitespace-pre rounded-md border border-white/10 bg-white/5 p-3 font-mono text-[13px] leading-relaxed text-white">ssh -L 8385:127.0.0.1:8384 youruser@your-vps-ip</div>
              <p className="m-0 mt-2 text-sm leading-relaxed text-gray-400">Then open <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[13px] text-white">http://127.0.0.1:8385</code> in your browser — this is your VPS Syncthing UI.</p>
              <div className="my-2.5 rounded-md border border-blue-800/50 bg-blue-900/30 p-3 text-[13px] leading-relaxed text-blue-200">Don't expose port 8384 publicly. The SSH tunnel is the safe way to access it.</div>
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-2 flex items-start gap-3">
              <div className="mt-px flex h-[26px] min-w-[26px] items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-medium text-gray-400">4</div>
              <div><h3 className="m-0 pb-1 text-[15px] font-medium text-white">Set a GUI password on the VPS too</h3></div>
            </div>
            <div className="ml-[38px]">
              <p className="m-0 text-sm leading-relaxed text-gray-400">Same as Windows: <strong className="font-semibold text-gray-300">Actions → Settings → GUI</strong> → set username and password.</p>
            </div>
          </div>

          <p className="mb-3 mt-6 text-[11px] font-medium uppercase tracking-widest text-gray-500">Configure your folder</p>

          <div className="mb-6">
            <div className="mb-2 flex items-start gap-3">
              <div className="mt-px flex h-[26px] min-w-[26px] items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-medium text-gray-400">5</div>
              <div><h3 className="m-0 pb-1 text-[15px] font-medium text-white">Add the shared folder on the VPS</h3></div>
            </div>
            <div className="ml-[38px]">
              <p className="m-0 text-sm leading-relaxed text-gray-400">Click <strong className="font-semibold text-gray-300">Add Folder</strong> in the VPS Web UI. Use the <strong className="font-semibold text-gray-300">exact same Folder ID</strong> you used on Windows:</p>
              <div className="my-2 overflow-x-auto whitespace-pre rounded-md border border-white/10 bg-white/5 p-3 font-mono text-[13px] leading-relaxed text-white">Folder Label: My VPS Files
                Folder Path: /root/sync/ (or any path on the VPS)
                Folder ID: vps-main (must match Windows exactly)
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-2 flex items-start gap-3">
              <div className="mt-px flex h-[26px] min-w-[26px] items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-medium text-gray-400">6</div>
              <div><h3 className="m-0 pb-1 text-[15px] font-medium text-white">Note the VPS Device ID</h3></div>
            </div>
            <div className="ml-[38px]">
              <p className="m-0 text-sm leading-relaxed text-gray-400">Go to <strong className="font-semibold text-gray-300">Actions → Show ID</strong> in the VPS Web UI and copy it.</p>
            </div>
          </div>
        </div>
      ) }

      { activeTab === "pair" && (
        <div>
          <p className="mb-3 mt-6 text-[11px] font-medium uppercase tracking-widest text-gray-500">Link the two devices</p>

          <div className="mb-6">
            <div className="mb-2 flex items-start gap-3">
              <div className="mt-px flex h-[26px] min-w-[26px] items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-medium text-gray-400">1</div>
              <div><h3 className="m-0 pb-1 text-[15px] font-medium text-white">Add VPS as a remote device on Windows</h3></div>
            </div>
            <div className="ml-[38px]">
              <p className="m-0 text-sm leading-relaxed text-gray-400">In the <strong className="font-semibold text-gray-300">Windows</strong> Web UI, click <strong className="font-semibold text-gray-300">Add Remote Device</strong> and paste the <strong className="font-semibold text-gray-300">VPS Device ID</strong>. Give it a name like <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[13px] text-white">my-vps</code>. Click Save.</p>
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-2 flex items-start gap-3">
              <div className="mt-px flex h-[26px] min-w-[26px] items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-medium text-gray-400">2</div>
              <div><h3 className="m-0 pb-1 text-[15px] font-medium text-white">Accept the connection on the VPS</h3></div>
            </div>
            <div className="ml-[38px]">
              <p className="m-0 text-sm leading-relaxed text-gray-400">In the <strong className="font-semibold text-gray-300">VPS</strong> Web UI you should see a notification: <em className="italic text-gray-300">"New device wants to connect"</em>. Click <strong className="font-semibold text-gray-300">Add Device</strong> and confirm.</p>
              <div className="my-2.5 rounded-md border border-blue-800/50 bg-blue-900/30 p-3 text-[13px] leading-relaxed text-blue-200">If you don't see the notification, add the Windows Device ID manually on the VPS side too (same as step 1, but reversed).</div>
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-2 flex items-start gap-3">
              <div className="mt-px flex h-[26px] min-w-[26px] items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-medium text-gray-400">3</div>
              <div><h3 className="m-0 pb-1 text-[15px] font-medium text-white">Share the folder with the remote device</h3></div>
            </div>
            <div className="ml-[38px]">
              <p className="m-0 text-sm leading-relaxed text-gray-400">On <strong className="font-semibold text-gray-300">Windows</strong>, go to your folder → click <strong className="font-semibold text-gray-300">Edit</strong> → open the <strong className="font-semibold text-gray-300">Sharing</strong> tab → check the VPS device. Click Save.</p>
              <p className="m-0 mt-2 text-sm leading-relaxed text-gray-400">On the <strong className="font-semibold text-gray-300">VPS</strong>, you'll get a prompt to accept the shared folder. Accept it and point it to your sync path.</p>
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-2 flex items-start gap-3">
              <div className="mt-px flex h-[26px] min-w-[26px] items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-medium text-gray-400">4</div>
              <div><h3 className="m-0 pb-1 text-[15px] font-medium text-white">Watch the initial sync</h3></div>
            </div>
            <div className="ml-[38px]">
              <p className="m-0 text-sm leading-relaxed text-gray-400">Both UIs will show a progress bar. Once it says <strong className="font-semibold text-gray-300">Up to Date</strong> on both sides, you're fully synced.</p>
              <div className="my-2.5 rounded-md border border-green-800/50 bg-green-900/30 p-3 text-[13px] leading-relaxed text-green-200">Any file you edit on the VPS with nano, vim, etc. will automatically appear on Windows within a few seconds — and vice versa.</div>
            </div>
          </div>

          <hr className="my-6 border-t border-white/10"/>
          <p className="mb-3 mt-6 text-[11px] font-medium uppercase tracking-widest text-gray-500">Recommended settings for VPS editing</p>

          <div className="mb-6">
            <div className="mb-2 flex items-start gap-3">
              <div className="mt-px flex h-[26px] min-w-[26px] items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-medium text-gray-400">5</div>
              <div><h3 className="m-0 pb-1 text-[15px] font-medium text-white">Set conflict resolution</h3></div>
            </div>
            <div className="ml-[38px]">
              <p className="m-0 text-sm leading-relaxed text-gray-400">In each folder's <strong className="font-semibold text-gray-300">Edit → Advanced</strong>, set <strong className="font-semibold text-gray-300">Max Conflict Copies</strong> to <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[13px] text-white">10</code>. If you edit the same file from both sides simultaneously, Syncthing will keep both versions instead of losing one.</p>
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-2 flex items-start gap-3">
              <div className="mt-px flex h-[26px] min-w-[26px] items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-medium text-gray-400">6</div>
              <div><h3 className="m-0 pb-1 text-[15px] font-medium text-white">Ignore temp files from nano/vim</h3></div>
            </div>
            <div className="ml-[38px]">
              <p className="m-0 text-sm leading-relaxed text-gray-400">Create a <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[13px] text-white">.stignore</code> file in your sync folder to avoid syncing editor temp files:</p>
              <div className="my-2 overflow-x-auto whitespace-pre rounded-md border border-white/10 bg-white/5 p-3 font-mono text-[13px] leading-relaxed text-white">{ `// .stignore
*.swp
*.swo
*~
.#*` }</div>
              <div className="my-2.5 rounded-md border border-yellow-800/50 bg-yellow-900/30 p-3 text-[13px] leading-relaxed text-yellow-200">Without this, every time you open a file in nano/vim a temp file will trigger a sync event.</div>
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-2 flex items-start gap-3">
              <div className="mt-px flex h-[26px] min-w-[26px] items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-medium text-gray-400">7</div>
              <div><h3 className="m-0 pb-1 text-[15px] font-medium text-white">Open firewall port if needed</h3></div>
            </div>
            <div className="ml-[38px]">
              <p className="m-0 text-sm leading-relaxed text-gray-400">Syncthing uses port <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[13px] text-white">22000/TCP</code> for device-to-device sync. If your VPS has a firewall, allow it:</p>
              <div className="my-2 overflow-x-auto whitespace-pre rounded-md border border-white/10 bg-white/5 p-3 font-mono text-[13px] leading-relaxed text-white">sudo ufw allow 22000/tcp</div>
              <p className="m-0 mt-2 text-sm leading-relaxed text-gray-400">If the port is blocked, Syncthing falls back to relays (slower but still works).</p>
            </div>
          </div>
        </div>
      ) }
    </div>
  )
}