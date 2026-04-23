let dbData = {}

const getAuth = () => localStorage.getItem('db_pass') || ''

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:6767/database'
    : 'https://api.noamm.org/database'

async function login() {
    const pass = document.getElementById('password').value
    if (! pass) return alert('Password required')
    localStorage.setItem('db_pass', pass)
    await loadData()
}

async function loadData() {
    const pass = getAuth()
    if (! pass) {
        document.getElementById('auth-screen').style.display = 'block'
        document.getElementById('app-screen').style.display = 'none'
        return
    }

    try {
        const res = await fetch(API_BASE, { headers: { 'Authorization': pass } })
        if (res.status === 401) return alert('Invalid Password')
        if (! res.ok) throw new Error(`Fetch failed: ${res.status}`)

        dbData = await res.json();
        document.getElementById('auth-screen').style.display = 'none'
        document.getElementById('app-screen').style.display = 'block'
        renderList();
    }
    catch (e) {
        alert('Error loading data: ' + e.message)
        console.error(e)
    }
}

async function saveEntry(e) {
    e.preventDefault()
    let id = document.getElementById('entry-id').value.trim()
    if (! id) return alert("A valid Minecraft Player UUID is required!")

    const payload = {
        name: document.getElementById('entry-name').value,
        sizeX: parseFloat(document.getElementById('entry-x').value) || 1.0,
        sizeY: parseFloat(document.getElementById('entry-y').value) || 1.0,
        sizeZ: parseFloat(document.getElementById('entry-z').value) || 1.0
    }

    try {
        const res = await fetch(`${API_BASE}/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getAuth()
            },
            body: JSON.stringify(payload)
        })

        if (res.ok) {
            document.getElementById('edit-form').reset()
            document.getElementById('entry-id').readOnly = false
            await loadData()
            switchTab('list')
        }
        else {
            const err = await res.text()
            alert('Save failed: ' + err)
        }
    }
    catch (e) {
        alert('Error saving: ' + e.message)
    }
}

async function deleteEntry(id) {
    if (! confirm('Are you sure you want to delete this entry?')) return
    try {
        const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE', headers: { 'Authorization': getAuth() } })
        if (res.ok) await loadData(); else alert('Delete failed')
    }
    catch (e) {
        alert('Error deleting: ' + e.message);
    }
}

function parseMinecraftJSONToHTML(rawJson) {
    if (! rawJson) return ''
    if (! rawJson.startsWith('{') && ! rawJson.startsWith('[')) return escapeHtml(rawJson)
    try {
        return renderComponent(JSON.parse(rawJson))
    }
    catch (e) {
        return escapeHtml(rawJson)
    }
}

function renderComponent(comp) {
    if (! comp) return ''
    if (typeof comp === 'string') return escapeHtml(comp)
    if (Array.isArray(comp)) return comp.map(renderComponent).join('')

    let html = ''

    if (comp.text !== undefined && comp.text !== null && comp.text !== '') {
        let styles = []

        if (comp.color) {
            const colors = {
                'black': '#000000', 'dark_blue': '#0000AA', 'dark_green': '#00AA00', 'dark_aqua': '#00AAAA',
                'dark_red': '#AA0000', 'dark_purple': '#AA00AA', 'gold': '#FFAA00', 'gray': '#AAAAAA',
                'dark_gray': '#555555', 'blue': '#5555FF', 'green': '#55FF55', 'aqua': '#55FFFF',
                'red': '#FF5555', 'light_purple': '#FF55FF', 'yellow': '#FFFF55', 'white': '#FFFFFF'
            }

            styles.push(`color: ${colors[comp.color] || comp.color}`)
        }

        if (comp.bold) styles.push(`font-weight: bold`)
        if (comp.italic) styles.push(`font-style: italic`)

        let textDecorations = []
        if (comp.underlined) textDecorations.push('underline')
        if (comp.strikethrough) textDecorations.push('line-through')
        if (textDecorations.length > 0) styles.push(`text-decoration: ${textDecorations.join(' ')}`)

        let styleStr = styles.length > 0 ? ` style="${styles.join(';')};"` : ''
        html += `<span${styleStr}>${escapeHtml(comp.text.toString())}</span>`
    }

    if (comp.extra && Array.isArray(comp.extra)) {
        html += comp.extra.map(renderComponent).join('')
    }

    return html
}

function renderList() {
    const grid = document.getElementById('entries-grid')
    grid.innerHTML = ''

    const entries = Object.entries(dbData).sort((a, b) => {
        const nameA = a[1].name || ''
        const nameB = b[1].name || ''
        return nameA.localeCompare(nameB)
    })

    for (const [id, data] of entries) {
        let nameHtml = ''
        if (data.name && data.name.trim() !== '') {
            nameHtml = `
                <div class="minecraft-text">
                    ${parseMinecraftJSONToHTML(data.name)}
                </div>
            `
        }

        let sizes = []
        if (data.sizeX !== undefined && data.sizeX !== 1) sizes.push(`X: ${data.sizeX}`)
        if (data.sizeY !== undefined && data.sizeY !== 1) sizes.push(`Y: ${data.sizeY}`)
        if (data.sizeZ !== undefined && data.sizeZ !== 1) sizes.push(`Z: ${data.sizeZ}`)

        let sizeHtml = ''
        if (sizes.length > 0) {
            sizeHtml = `<span class="size-tag">📏 ${sizes.join(' | ')}</span>`
        }

        const item = document.createElement('div')
        item.className = 'database-item'
        item.innerHTML = `
            <p class="uuid-text">${id}</p>
            ${nameHtml}
            ${sizeHtml}
            <div class="action-group">
                <button class="btn" style="padding: 8px 16px; font-size: 12px; flex: 1" onclick="editEntry('${id}')">Edit</button>
                <button class="btn" style="padding: 8px 16px; font-size: 12px; flex: 1; border-color: rgba(239, 68, 68, 0.3)" onclick="deleteEntry('${id}')">Delete</button>
            </div>
        `
        grid.appendChild(item)
    }
}

function editEntry(id) {
    const data = dbData[id]
    document.getElementById('entry-id').value = id
    document.getElementById('entry-id').readOnly = true
    document.getElementById('entry-name').value = data.name || ''
    document.getElementById('entry-x').value = data.sizeX !== undefined ? data.sizeX : 1
    document.getElementById('entry-y').value = data.sizeY !== undefined ? data.sizeY : 1
    document.getElementById('entry-z').value = data.sizeZ !== undefined ? data.sizeZ : 1
    switchTab('edit')
}

function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'))

    if (tab === 'list') {
        document.querySelectorAll('.tab')[0].classList.add('active')
        document.getElementById('tab-list').classList.add('active')
        document.getElementById('entry-id').readOnly = false;
    }
    else {
        document.querySelectorAll('.tab')[1].classList.add('active')
        document.getElementById('tab-edit').classList.add('active')
    }
}

function escapeHtml(unsafe) {
    return (unsafe || '').toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
}


if (getAuth()) loadData()
else {
    document.getElementById('auth-screen').style.display = 'block'
    document.getElementById('app-screen').style.display = 'none'
}