import { useState, useEffect } from 'react'
import { Q } from './questions.js'

const DIFFS = { Easy: { t: 45, dmg: 10, m: 1 }, Normal: { t: 30, dmg: 20, m: 1.5 }, Hard: { t: 20, dmg: 30, m: 2 } }
const ITEMS = {
  potion: { n: 'Potion', i: '🧪', p: 15, d: 'Heal 30 HP' },
  hint: { n: 'Hint', i: '📜', p: 20, d: 'Remove 2 wrong answers' },
  shield: { n: 'Shield', i: '🛡️', p: 25, d: 'Block the next hit' },
  skip: { n: 'Skip Key', i: '🗝️', p: 30, d: 'Bypass a room (or swap a boss question)' },
}
const ACH = [
  ['first', 'First Blood', 'Answer a question correctly', s => s.correct >= 1],
  ['streak', 'On Fire', 'Get 5 correct in a row', s => s.best >= 5],
  ['lvl3', 'Apprentice Coder', 'Reach level 3', s => s.level >= 3],
  ['rich', 'Coin Hoarder', 'Hold 100 coins', s => s.coins >= 100],
  ['poly', 'Polyglot', 'Answer correctly in all 4 languages', s => s.langs.length >= 4],
  ['boss', 'Boss Slayer', 'Defeat a boss', s => s.bosses >= 1],
  ['flaw', 'Untouchable', 'Defeat a boss without taking damage', s => s.flawless],
  ['escape', 'Escaped!', 'Escape the dungeon', s => s.won],
  ['hard', 'Hardcore', 'Escape on Hard difficulty', s => s.won && s.diff === 'Hard'],
]
const BOSSES = { 5: { n: 'The Segfault Golem', hp: 3, i: '👹' }, 10: { n: 'Lord Null Pointer', hp: 4, i: '🐉' } }
const MON = ['Syntax Slime', 'Bug Bat', 'Memory Leech', 'Off-By-One Goblin', 'Infinite Loop Wraith', 'Race Condition Imp', 'Stack Skeleton', 'Deadlock Drake']
const ROOMS = 10, LANGS = ['All', 'C', 'C++', 'Java', 'Python']
const isBoss = r => r % 5 === 0
const LB = 'codeDungeonLB', AC = 'codeDungeonAch'
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }
const shuffle = a => [...a].sort(() => Math.random() - 0.5)
const newGame = (name, diff, lang) => ({ name, diff, lang, room: 1, hp: 100, maxHp: 100, xp: 0, level: 1, coins: 10,
  inv: { potion: 1, hint: 1, shield: 0, skip: 0 }, shield: false, streak: 0, best: 0, correct: 0, bosses: 0,
  flawless: false, langs: [], won: false, used: [], bossHp: 0, hurt: false, score: 0 })

function pickQ(g) {
  const want = isBoss(g.room) ? 3 : g.room <= 3 ? 1 : g.room <= 7 ? 2 : 3
  const pool = Q.filter(q => g.lang === 'All' || q[0] === g.lang)
  let c = pool.filter(q => q[1] === want && !g.used.includes(q[2]))
  if (!c.length) c = pool.filter(q => !g.used.includes(q[2]))
  if (!c.length) c = pool.filter(q => q[1] === want)
  const q = shuffle(c)[0]
  return { lang: q[0], d: q[1], text: q[2], opts: shuffle(q[3].map((t, i) => ({ t, ok: i === q[4] }))), gone: [] }
}

const Bar = ({ v, m, c }) => <div className={'bar ' + c}><i style={{ width: Math.max(0, (v / m) * 100) + '%' }} /></div>

export default function App() {
  const [scr, setScr] = useState('menu')
  const [g, setG] = useState(null)
  const [q, setQ] = useState(null)
  const [sel, setSel] = useState(null)
  const [t, setT] = useState(0)
  const [log, setLog] = useState([])
  const [ach, setAch] = useState(() => load(AC, []))
  const [toast, setToast] = useState('')
  const [name, setName] = useState('')
  const [diff, setDiff] = useState('Normal')
  const [lang, setLang] = useState('All')
  const [fin, setFin] = useState(null)

  const say = (...m) => setLog(l => [...m, ...l].slice(0, 6))

  function checkAch(n) {
    const got = ACH.filter(a => a[3](n) && !ach.includes(a[0]))
    if (!got.length) return
    const na = [...ach, ...got.map(a => a[0])]
    setAch(na); save(AC, na)
    setToast('🏆 Achievement: ' + got.map(a => a[1]).join(', '))
    setTimeout(() => setToast(''), 3500)
  }

  function loadQ(n) {
    const nq = pickQ(n)
    setG({ ...n, used: [...n.used, nq.text] })
    setQ(nq); setSel(null); setT(DIFFS[n.diff].t)
  }

  function start() {
    const n = newGame(name.trim() || 'Anon', diff, lang)
    loadQ(n); setScr('play')
    setLog(['You wake up in a cold dungeon. A terminal blinks: > solve() to escape.'])
  }

  function answer(i) {
    if (sel !== null) return
    const ok = i >= 0 && q.opts[i].ok, D = DIFFS[g.diff], boss = isBoss(g.room)
    const n = { ...g }, msgs = []
    setSel(i)
    if (ok) {
      const xp = Math.round(10 * q.d * D.m * (1 + Math.min(g.streak, 5) * 0.1))
      const coins = 5 * q.d + (boss ? 10 : 0)
      n.xp += xp; n.coins += coins; n.streak++; n.best = Math.max(n.best, n.streak); n.correct++
      n.langs = [...new Set([...n.langs, q.lang])]; n.score += xp * 10
      msgs.push(`✔ Correct! +${xp} XP, +${coins} coins`)
      if (boss) { n.bossHp--; msgs.push(n.bossHp > 0 ? '💥 You wound the boss!' : '💀 The boss collapses!') }
      while (n.xp >= n.level * 50) {
        n.xp -= n.level * 50; n.level++; n.maxHp += 10; n.hp = Math.min(n.maxHp, n.hp + 25)
        msgs.push(`⬆ LEVEL UP! You are now level ${n.level} (+10 max HP)`)
      }
    } else {
      n.streak = 0
      const why = i < 0 ? '⏱ Time is up!' : '✘ Wrong!'
      if (n.shield) { n.shield = false; msgs.push(`${why} Your shield absorbs the hit.`) }
      else { n.hp = Math.max(0, n.hp - D.dmg); n.hurt = true; msgs.push(`${why} You take ${D.dmg} damage.`) }
    }
    setG(n); say(...msgs.reverse()); checkAch(n)
  }

  function finish(n, won) {
    const score = Math.round((n.score + n.coins * 5 + n.room * 50 + n.level * 100 + (won ? 1000 : 0)) * DIFFS[n.diff].m)
    const row = { name: n.name, score, diff: n.diff, lang: n.lang, room: n.room, level: n.level, won, date: new Date().toLocaleDateString() }
    save(LB, [...load(LB, []), row].sort((a, b) => b.score - a.score).slice(0, 10))
    setFin({ ...n, score, won }); setScr('end')
  }

  function advance(n) {
    if (isBoss(n.room)) n = { ...n, bosses: n.bosses + 1, flawless: n.flawless || !n.hurt }
    if (n.room >= ROOMS) { n = { ...n, won: true }; setG(n); checkAch(n); return finish(n, true) }
    setG(n); checkAch(n); setScr('shop')
  }

  function next() {
    if (g.hp <= 0) return finish(g, false)
    if (isBoss(g.room) && g.bossHp > 0) return loadQ(g)
    advance(g)
  }

  function descend() {
    const room = g.room + 1, b = isBoss(room)
    loadQ({ ...g, room, bossHp: b ? BOSSES[room].hp : 0, hurt: false })
    setScr('play')
    say(b ? `⚠ BOSS ROOM: ${BOSSES[room].n} blocks your path!` : `Room ${room}: a ${MON[(room - 1) % MON.length]} appears!`)
  }

  function buy(k) {
    if (g.coins < ITEMS[k].p) return
    const n = { ...g, coins: g.coins - ITEMS[k].p, inv: { ...g.inv, [k]: g.inv[k] + 1 } }
    setG(n)
  }

  function use(k) {
    const playing = scr === 'play' && sel === null
    if (!g.inv[k]) return
    const n = { ...g, inv: { ...g.inv, [k]: g.inv[k] - 1 } }
    if (k === 'potion') {
      if (g.hp >= g.maxHp || !(playing || scr === 'shop')) return
      n.hp = Math.min(n.maxHp, n.hp + 30); setG(n); say('🧪 You drink a potion. +30 HP')
    } else if (!playing) return
    else if (k === 'shield') { if (g.shield) return; n.shield = true; setG(n); say('🛡️ A shield surrounds you.') }
    else if (k === 'hint') {
      if (q.gone.length) return
      const w = q.opts.map((o, i) => i).filter(i => !q.opts[i].ok)
      setQ({ ...q, gone: shuffle(w).slice(0, 2) }); setG(n); say('📜 Two wrong answers fade away.')
    } else if (k === 'skip') {
      say('🗝️ You bypass the challenge.')
      isBoss(g.room) ? loadQ(n) : advance(n)
    }
  }

  useEffect(() => {
    if (scr !== 'play' || !q || sel !== null) return
    if (t <= 0) { answer(-1); return }
    const id = setTimeout(() => setT(x => x - 1), 1000)
    return () => clearTimeout(id)
  }, [t, scr, q, sel])

  useEffect(() => {
    const h = e => {
      const i = +e.key - 1
      if (scr === 'play' && sel === null && i >= 0 && i < 4 && q.opts[i] && !q.gone.includes(i)) answer(i)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  const tst = toast && <div className="toast">{toast}</div>
  const back = <button onClick={() => setScr('menu')}>◀ Menu</button>

  if (scr === 'menu') return (<>{tst}
    <h1>&gt; CODE DUNGEON_</h1>
    <div className="box">
      <p>You are a programmer trapped in a dungeon. Solve coding challenges to cross {ROOMS} rooms, beat 2 bosses and escape.</p>
      <p>Name: <input value={name} maxLength={16} placeholder="Anon" onChange={e => setName(e.target.value)} /></p>
      <p>Difficulty: {Object.keys(DIFFS).map(d => <button key={d} className={d === diff ? 'on' : ''} onClick={() => setDiff(d)}>{d}</button>)}</p>
      <p className="dim">{DIFFS[diff].t}s per question, -{DIFFS[diff].dmg} HP per mistake, score x{DIFFS[diff].m}</p>
      <p>Language: {LANGS.map(l => <button key={l} className={l === lang ? 'on' : ''} onClick={() => setLang(l)}>{l}</button>)}</p>
      <button onClick={start}>▶ START GAME</button>
      <button onClick={() => setScr('lb')}>🏆 Leaderboard</button>
      <button onClick={() => setScr('ach')}>🎖 Achievements</button>
    </div>
  </>)

  if (scr === 'lb') return (<>{tst}<h1>LEADERBOARD</h1><div className="box">
    {load(LB, []).length ? <table><thead><tr><th>#</th><th>Name</th><th>Score</th><th>Mode</th><th>Reached</th><th>Date</th></tr></thead><tbody>
      {load(LB, []).map((r, i) => <tr key={i}><td>{i + 1}</td><td>{r.name}</td><td>{r.score}</td><td>{r.diff}/{r.lang}</td><td>{r.won ? 'ESCAPED' : `Room ${r.room}`} L{r.level}</td><td>{r.date}</td></tr>)}
    </tbody></table> : <p>No runs yet. Start a game to claim the first spot.</p>}
    {back}<button onClick={() => { if (confirm('Clear leaderboard?')) { save(LB, []); setScr('menu') } }}>Clear</button></div></>)

  if (scr === 'ach') return (<>{tst}<h1>ACHIEVEMENTS</h1><div className="box">
    <p>{ach.length}/{ACH.length} unlocked</p>
    {ACH.map(a => <p key={a[0]} className={ach.includes(a[0]) ? '' : 'dim'}>{ach.includes(a[0]) ? '🏆' : '🔒'} <b>{a[1]}</b>: {a[2]}</p>)}
    {back}</div></>)

  if (scr === 'end') return (<>{tst}<h1>{fin.won ? 'YOU ESCAPED!' : 'GAME OVER'}</h1><div className="box c">
    <div className="big">{fin.won ? '🏆' : '💀'}</div>
    <p>{fin.name}, level {fin.level}, reached room {fin.room}/{ROOMS} on {fin.diff}</p>
    <p>Correct answers: {fin.correct}, best streak: {fin.best}, bosses beaten: {fin.bosses}</p>
    <h2>Score: {fin.score}</h2>
    <button onClick={start}>▶ Play again</button><button onClick={() => setScr('lb')}>🏆 Leaderboard</button>{back}</div></>)

  const inv = <div className="box"><b>INVENTORY </b>{Object.keys(ITEMS).map(k =>
    <button key={k} disabled={!g.inv[k]} title={ITEMS[k].d} onClick={() => use(k)}>{ITEMS[k].i} {ITEMS[k].n} x{g.inv[k]}</button>)}</div>
  const hud = <div className="box">
    <div className="row"><span>👤 {g.name}</span><span>LV {g.level}</span><span>🪙 {g.coins}</span><span>🚪 {g.room}/{ROOMS}</span><span>🔥 {g.streak}</span></div>
    <div>HP {g.hp}/{g.maxHp} {g.shield && '🛡️'}</div><Bar v={g.hp} m={g.maxHp} c="hp" />
    <div>XP {g.xp}/{g.level * 50}</div><Bar v={g.xp} m={g.level * 50} c="xp" /></div>

  if (scr === 'shop') return (<>{tst}<h1>THE SHOP</h1>{hud}
    <div className="box"><p>Room {g.room} cleared! Spend coins before descending.</p>
      {Object.keys(ITEMS).map(k => <p key={k}><button disabled={g.coins < ITEMS[k].p} onClick={() => buy(k)}>{ITEMS[k].i} {ITEMS[k].n} - {ITEMS[k].p} 🪙</button> {ITEMS[k].d}</p>)}
      <button onClick={descend}>▼ Descend to room {g.room + 1}</button></div>{inv}</>)

  const boss = isBoss(g.room), mon = boss ? BOSSES[g.room] : { n: MON[(g.room - 1) % MON.length], i: '👾' }
  return (<>{tst}{hud}
    <div className="box c"><div className="big">{mon.i}</div>
      <h3 className={boss ? 'boss' : ''}>{boss && 'BOSS: '}{mon.n} {boss && '❤'.repeat(g.bossHp)}</h3></div>
    <div className="box">
      <div className="row"><span>[{q.lang}] {'★'.repeat(q.d)}</span><span className={t <= 5 && sel === null ? 'boss' : ''}>⏱ {t}s</span></div>
      <pre>{q.text}</pre>
      {q.opts.map((o, i) => !q.gone.includes(i) && (
        <button key={i} className={'opt ' + (sel === null ? '' : o.ok ? 'ok' : i === sel ? 'bad' : '')} disabled={sel !== null} onClick={() => answer(i)}>{i + 1}. {o.t}</button>))}
      {sel !== null && <p><button onClick={next}>{g.hp <= 0 ? 'Face your fate ▶' : 'Continue ▶'}</button></p>}
    </div>
    {inv}
    <div className="box dim">{log.map((l, i) => <div key={i}>&gt; {l}</div>)}</div>
  </>)
}
