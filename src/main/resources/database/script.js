let dbData = {}

const getAuth = () => localStorage.getItem('db_pass') || ''

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:6767/database'
    : 'https://api.noamm.org/database'

const MINECRAFT_COLORS = {
    black: '#000000',
    dark_blue: '#0000AA',
    dark_green: '#00AA00',
    dark_aqua: '#00AAAA',
    dark_red: '#AA0000',
    dark_purple: '#AA00AA',
    gold: '#FFAA00',
    gray: '#AAAAAA',
    dark_gray: '#555555',
    blue: '#5555FF',
    green: '#55FF55',
    aqua: '#55FFFF',
    red: '#FF5555',
    light_purple: '#FF55FF',
    yellow: '#FFFF55',
    white: '#FFFFFF'
}

const DEFAULT_COMPONENT_STYLE = {
    color: '#FFFFFF',
    bold: false,
    italic: false,
    underlined: false,
    strikethrough: false,
    shadow: true,
    explicitShadowColor: null
}

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
        const res = await fetch(API_BASE, { method: 'GET', headers: { 'Authorization': pass } })

        if (res.status === 401) {
            localStorage.removeItem('db_pass')
            return alert('Invalid Password')
        }

        if (! res.ok) throw new Error(`Fetch failed: ${res.status}`)

        dbData = await res.json();
        document.getElementById('auth-screen').style.display = 'none'
        document.getElementById('app-screen').style.display = 'block'
        renderList();
    } catch (e) {
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
            updateNamePreview()
            await loadData()
            switchTab('list')
        } else {
            const err = await res.text()
            alert('Save failed: ' + err)
        }
    } catch (e) {
        alert('Error saving: ' + e.message)
    }
}

async function deleteEntry(id) {
    if (! confirm('Are you sure you want to delete this entry?')) return
    try {
        const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE', headers: { 'Authorization': getAuth() } })
        if (res.ok) await loadData(); else alert('Delete failed')
    } catch (e) {
        alert('Error deleting: ' + e.message);
    }
}

function parseMinecraftJSONToHTML(rawJson) {
    if (! rawJson) return ''

    const normalized = rawJson.trim()
    if (! normalized) return ''
    if (! normalized.startsWith('{') && ! normalized.startsWith('[')) return renderComponent(normalized, DEFAULT_COMPONENT_STYLE)

    try {
        return renderComponent(JSON.parse(normalized), DEFAULT_COMPONENT_STYLE)
    } catch (e) {
        return renderComponent(normalized, DEFAULT_COMPONENT_STYLE)
    }
}

function renderComponent(comp, inheritedStyle = DEFAULT_COMPONENT_STYLE) {
    if (comp === undefined || comp === null) return ''
    if (typeof comp === 'string' || typeof comp === 'number' || typeof comp === 'boolean') {
        return renderTextSpan(comp.toString(), inheritedStyle)
    }
    if (Array.isArray(comp)) return comp.map(part => renderComponent(part, inheritedStyle)).join('')

    const resolvedStyle = resolveComponentStyle(comp, inheritedStyle)
    let html = ''

    if (comp.text !== undefined && comp.text !== null && comp.text !== '') {
        html += renderTextSpan(comp.text.toString(), resolvedStyle)
    }

    if (comp.extra && Array.isArray(comp.extra)) {
        html += comp.extra.map(part => renderComponent(part, resolvedStyle)).join('')
    }

    return html
}

function renderTextSpan(text, style) {
    if (! text) return ''

    const styles = [
        `color: ${style.color}`,
        `font-weight: ${style.bold ? '700' : '400'}`,
        `font-style: ${style.italic ? 'italic' : 'normal'}`,
        `text-decoration: ${getTextDecoration(style)}`
    ]

    const shadowColor = getEffectiveShadowColor(style)
    styles.push(`text-shadow: ${shadowColor ? `2px 2px 0 ${shadowColor}` : 'none'}`)

    return `<span style="${styles.join('; ')}">${escapeHtml(text)}</span>`
}

function resolveComponentStyle(comp, inheritedStyle) {
    return {
        color: resolveTextColor(comp.color, inheritedStyle.color),
        bold: comp.bold !== undefined ? Boolean(comp.bold) : inheritedStyle.bold,
        italic: comp.italic !== undefined ? Boolean(comp.italic) : inheritedStyle.italic,
        underlined: comp.underlined !== undefined ? Boolean(comp.underlined) : inheritedStyle.underlined,
        strikethrough: comp.strikethrough !== undefined ? Boolean(comp.strikethrough) : inheritedStyle.strikethrough,
        shadow: comp.shadow !== undefined ? Boolean(comp.shadow) : inheritedStyle.shadow,
        explicitShadowColor: resolveExplicitShadowColor(comp.shadowColor ?? comp.shadow_color, inheritedStyle.explicitShadowColor)
    }
}

function resolveTextColor(colorValue, fallbackColor) {
    if (colorValue === undefined || colorValue === null || colorValue === '') return fallbackColor
    if (typeof colorValue === 'string' && colorValue.trim().toLowerCase() === 'reset') return DEFAULT_COMPONENT_STYLE.color
    return normalizeColor(colorValue, fallbackColor, false)
}

function resolveExplicitShadowColor(shadowValue, fallbackShadowColor) {
    if (shadowValue === undefined) return fallbackShadowColor
    if (shadowValue === null || shadowValue === '') return null
    if (typeof shadowValue === 'string' && shadowValue.trim().toLowerCase() === 'reset') return null
    return normalizeColor(shadowValue, fallbackShadowColor, true)
}

function normalizeColor(colorValue, fallbackColor, preferArgb) {
    if (typeof colorValue === 'number') return intToCssColor(colorValue, preferArgb) || fallbackColor

    const raw = colorValue.toString().trim()
    if (! raw) return fallbackColor

    const namedColor = MINECRAFT_COLORS[raw.toLowerCase()]
    if (namedColor) return namedColor

    if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(raw)) return raw
    if (/^0x[0-9a-f]{6}$/i.test(raw)) return `#${raw.slice(2)}`
    if (/^0x[0-9a-f]{8}$/i.test(raw)) return argbHexToRgba(raw.slice(2))
    if (/^-?\d+$/.test(raw)) return intToCssColor(Number(raw), preferArgb) || fallbackColor
    if (window.CSS && CSS.supports && CSS.supports('color', raw)) return raw

    return fallbackColor
}

function intToCssColor(colorValue, preferArgb) {
    if (! Number.isFinite(colorValue)) return null

    const normalized = colorValue >>> 0
    if (! preferArgb || normalized <= 0xFFFFFF) {
        return `#${normalized.toString(16).padStart(6, '0').slice(-6)}`
    }

    return argbToRgba(normalized)
}

function argbHexToRgba(hexValue) {
    return argbToRgba(parseInt(hexValue, 16))
}

function argbToRgba(colorValue) {
    const alpha = ((colorValue >>> 24) & 0xFF) / 255
    const red = (colorValue >>> 16) & 0xFF
    const green = (colorValue >>> 8) & 0xFF
    const blue = colorValue & 0xFF
    return `rgba(${red}, ${green}, ${blue}, ${formatAlpha(alpha)})`
}

function formatAlpha(alpha) {
    return Number(alpha.toFixed(3))
}

function getTextDecoration(style) {
    let decorations = []
    if (style.underlined) decorations.push('underline')
    if (style.strikethrough) decorations.push('line-through')
    return decorations.length > 0 ? decorations.join(' ') : 'none'
}

function getEffectiveShadowColor(style) {
    if (! style.shadow) return null
    return style.explicitShadowColor || deriveShadowColor(style.color)
}

function deriveShadowColor(colorValue) {
    const parsedColor = parseColor(colorValue)
    if (! parsedColor) return 'rgba(63, 63, 63, 1)'

    const red = Math.floor(parsedColor.red * 0.25)
    const green = Math.floor(parsedColor.green * 0.25)
    const blue = Math.floor(parsedColor.blue * 0.25)
    return `rgba(${red}, ${green}, ${blue}, ${formatAlpha(parsedColor.alpha)})`
}

function parseColor(colorValue) {
    const raw = (colorValue || '').toString().trim()
    if (! raw) return null

    let match = raw.match(/^#([0-9a-f]{3})$/i)
    if (match) {
        return {
            red: parseInt(match[1][0] + match[1][0], 16),
            green: parseInt(match[1][1] + match[1][1], 16),
            blue: parseInt(match[1][2] + match[1][2], 16),
            alpha: 1
        }
    }

    match = raw.match(/^#([0-9a-f]{6})$/i)
    if (match) {
        return {
            red: parseInt(match[1].slice(0, 2), 16),
            green: parseInt(match[1].slice(2, 4), 16),
            blue: parseInt(match[1].slice(4, 6), 16),
            alpha: 1
        }
    }

    match = raw.match(/^#([0-9a-f]{8})$/i)
    if (match) {
        return {
            red: parseInt(match[1].slice(0, 2), 16),
            green: parseInt(match[1].slice(2, 4), 16),
            blue: parseInt(match[1].slice(4, 6), 16),
            alpha: parseInt(match[1].slice(6, 8), 16) / 255
        }
    }

    match = raw.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i)
    if (match) {
        return {
            red: clampColor(match[1]),
            green: clampColor(match[2]),
            blue: clampColor(match[3]),
            alpha: clampAlpha(match[4] !== undefined ? Number(match[4]) : 1)
        }
    }

    return null
}

function clampColor(value) {
    return Math.max(0, Math.min(255, Math.round(Number(value) || 0)))
}

function clampAlpha(value) {
    return Math.max(0, Math.min(1, value))
}

function updateNamePreview() {
    const preview = document.getElementById('entry-name-preview')
    const rawName = document.getElementById('entry-name').value.trim()

    if (! rawName) {
        preview.classList.add('is-empty')
        preview.innerHTML = '<span>No custom name yet</span>'
        return
    }

    preview.classList.remove('is-empty')
    preview.innerHTML = parseMinecraftJSONToHTML(rawName)
}

function renderList() {
    const grid = document.getElementById('entries-grid')
    grid.innerHTML = ''

    for (const [id, data] of Object.entries(dbData)) {
        let nameHtml = ''
        if (data.name && data.name.trim() !== '') {
            nameHtml = `<div class="minecraft-text">${parseMinecraftJSONToHTML(data.name)}</div>`
        }

        let sizes = []
        if (data.sizeX !== undefined && data.sizeX !== 1) sizes.push(`X: ${data.sizeX}`)
        if (data.sizeY !== undefined && data.sizeY !== 1) sizes.push(`Y: ${data.sizeY}`)
        if (data.sizeZ !== undefined && data.sizeZ !== 1) sizes.push(`Z: ${data.sizeZ}`)

        let sizeHtml = ''
        if (sizes.length > 0) sizeHtml = `<span class="size-tag">📏 ${sizes.join(' | ')}</span>`

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
    updateNamePreview()
    switchTab('edit')
}

function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'))

    if (tab === 'list') {
        document.querySelectorAll('.tab')[0].classList.add('active')
        document.getElementById('tab-list').classList.add('active')
        document.getElementById('entry-id').readOnly = false;
    } else {
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

updateNamePreview()