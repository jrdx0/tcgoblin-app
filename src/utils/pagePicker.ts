export const PICKER_SOURCE = 'tcgoblin-picker'

export type PickerToPage = { source: typeof PICKER_SOURCE; type: 'test'; selector: string }

export type PageToPicker =
  | { source: typeof PICKER_SOURCE; type: 'ready' }
  | { source: typeof PICKER_SOURCE; type: 'pick'; selector: string }
  | { source: typeof PICKER_SOURCE; type: 'result'; selector: string; count: number; firstText: string | null; invalid: boolean }

const pickerStyle = `
  .__tcg-hover { outline: 2px dashed #059669 !important; outline-offset: 2px !important; cursor: crosshair !important; }
  .__tcg-match { outline: 2px dashed #059669 !important; outline-offset: 2px !important; background-color: rgba(5, 150, 105, 0.06) !important; }
  .__tcg-first { outline: 3px solid #059669 !important; outline-offset: 2px !important; background-color: rgba(5, 150, 105, 0.15) !important; }
`

function pickerScript() {
  const SOURCE = '__SOURCE__'
  const marks = ['__tcg-hover', '__tcg-match', '__tcg-first']
  const send = (message: Record<string, unknown>) => parent.postMessage({ source: SOURCE, ...message }, '*')

  const usableClasses = (el: Element) =>
    [...el.classList].filter((c) => !marks.includes(c) && !/\d{4,}/.test(c) && !c.includes(':')).slice(0, 3)

  const isUnique = (selector: string) => {
    try {
      return document.querySelectorAll(selector).length === 1
    } catch {
      return false
    }
  }

  function selectorFor(target: Element) {
    if (target.id && !/\d{4,}/.test(target.id) && isUnique(`#${CSS.escape(target.id)}`)) {
      return `#${CSS.escape(target.id)}`
    }

    const parts: string[] = []
    let node: Element | null = target
    while (node && node !== document.body && node !== document.documentElement) {
      if (node !== target && node.id && !/\d{4,}/.test(node.id)) {
        parts.unshift(`#${CSS.escape(node.id)}`)
        const candidate = parts.join(' ')
        if (isUnique(candidate)) return candidate
        parts.shift()
      }
      const classes = usableClasses(node)
      parts.unshift(node.tagName.toLowerCase() + classes.map((c) => `.${CSS.escape(c)}`).join(''))
      const candidate = parts.join(' ')
      if (isUnique(candidate)) return candidate
      node = node.parentElement
    }

    const path: string[] = []
    node = target
    while (node && node !== document.documentElement) {
      const tag = node.tagName.toLowerCase()
      const siblings = node.parentElement
        ? [...node.parentElement.children].filter((c) => c.tagName === node!.tagName)
        : []
      path.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${siblings.indexOf(node) + 1})` : tag)
      node = node.parentElement
    }
    return path.join(' > ')
  }

  const clear = (mark: string) => document.querySelectorAll(`.${mark}`).forEach((el) => el.classList.remove(mark))

  function test(selector: string) {
    clear('__tcg-match')
    clear('__tcg-first')
    let found: Element[] = []
    let invalid = false
    if (selector.trim()) {
      try {
        found = [...document.querySelectorAll(selector)]
      } catch {
        invalid = true
      }
    }
    found.forEach((el, i) => el.classList.add(i === 0 ? '__tcg-first' : '__tcg-match'))
    found[0]?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    const firstText = found[0]?.textContent?.replace(/\s+/g, ' ').trim() ?? null
    send({ type: 'result', selector, count: found.length, firstText, invalid })
  }

  document.addEventListener('mouseover', (e) => {
    clear('__tcg-hover')
    if (e.target instanceof Element) e.target.classList.add('__tcg-hover')
  })
  document.addEventListener('mouseout', () => clear('__tcg-hover'))
  document.addEventListener(
    'click',
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (!(e.target instanceof Element)) return
      clear('__tcg-hover')
      const selector = selectorFor(e.target)
      send({ type: 'pick', selector })
      test(selector)
    },
    true,
  )
  document.addEventListener('submit', (e) => e.preventDefault(), true)
  window.addEventListener('message', (e) => {
    if (e.data?.source === SOURCE && e.data.type === 'test') test(e.data.selector)
  })
  send({ type: 'ready' })
}

const BLOCKED = 'script, noscript, iframe, frame, frameset, object, embed, base, meta[http-equiv], link[rel~="preload"], link[rel~="modulepreload"], link[rel~="prefetch"]'

export function buildPickerDocument(html: string, pageUrl: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  doc.querySelectorAll(BLOCKED).forEach((el) => el.remove())
  doc.querySelectorAll('*').forEach((el) => {
    for (const attr of [...el.attributes]) {
      const value = attr.value.trim().toLowerCase()
      if (attr.name.startsWith('on') || value.startsWith('javascript:')) el.removeAttribute(attr.name)
    }
  })

  const base = doc.createElement('base')
  base.href = pageUrl
  doc.head.prepend(base)

  const style = doc.createElement('style')
  style.textContent = pickerStyle
  doc.head.append(style)

  const script = doc.createElement('script')
  script.textContent = `(${pickerScript.toString().replace('__SOURCE__', PICKER_SOURCE)})()`
  doc.body.append(script)

  return `<!doctype html>${doc.documentElement.outerHTML}`
}
