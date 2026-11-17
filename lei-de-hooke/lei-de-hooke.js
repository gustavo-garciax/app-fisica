const $ = id => document.getElementById(id), PI = Math.PI, V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const fmt = (n, d = 2) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const MT = c => new THREE.MeshStandardMaterial({ color: c, roughness: .5, metalness: .05 });
const stage = $('stage'), rd = new THREE.WebGLRenderer({ antialias: true, alpha: true });
rd.setPixelRatio(Math.min(devicePixelRatio, 2)); stage.appendChild(rd.domElement);
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(42, 1, .1, 300);
scene.add(new THREE.AmbientLight(0xffffff, .75));
const sun = new THREE.DirectionalLight(0xffffff, .8); sun.position.set(6, 14, 10); scene.add(sun);
const grid = new THREE.GridHelper(44, 44, 0x8a94a0, 0x8a94a0); grid.material.transparent = true; grid.material.opacity = .28; scene.add(grid);
let az = .4, el = .1, dist = 32, tg = V3(0, 6.2, 0);
function cam() { camera.position.set(tg.x + dist * Math.cos(el) * Math.sin(az), tg.y + dist * Math.sin(el), tg.z + dist * Math.cos(el) * Math.cos(az)); camera.lookAt(tg) }
function size() { const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; rd.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix() }
new ResizeObserver(size).observe(stage);
const cv = rd.domElement; let dr = null;
cv.addEventListener('pointerdown', e => { dr = [e.clientX, e.clientY]; cv.setPointerCapture(e.pointerId) });
cv.addEventListener('pointermove', e => { if (!dr) return; az -= (e.clientX - dr[0]) * .008; el = Math.max(.03, Math.min(1.4, el + (e.clientY - dr[1]) * .008)); dr = [e.clientX, e.clientY] });
cv.addEventListener('pointerup', () => dr = null);
cv.addEventListener('wheel', e => { e.preventDefault(); dist = Math.max(14, Math.min(70, dist * (1 + e.deltaY * .001))) }, { passive: false });

const L0 = 1, P = { k: 25, m: 1, A: .25, D: .4, g: 9.8, modo: 0 };
const CT = [
    { k: 'k', l: 'Rigidez da mola (k)', min: 5, max: 100, step: 1, u: 'N/m', d: 0 },
    { k: 'm', l: 'Massa', min: .1, max: 5, step: .1, u: 'kg', d: 1 },
    { k: 'A', l: 'Deslocamento inicial (amplitude)', min: .05, max: .5, step: .01, u: 'm', d: 2, modo: 0 },
    { k: 'D', l: 'Alongamento da mola', min: 0, max: 1, step: .01, u: 'm', d: 2, modo: 1 },
    { k: 'g', l: 'Gravidade', min: 1, max: 25, step: .1, u: 'm/s²', d: 1 }];
const PRE = [['Terra', 9.8], ['Lua', 1.6], ['Marte', 3.7], ['Júpiter', 24.8]], MOD = ['Oscilação', 'Alongamento manual'];
const ref = {};
let G = null, S = {}, t = 0, paused = matchMedia('(prefers-reduced-motion:reduce)').matches;
function arr(c) { const a = new THREE.ArrowHelper(V3(0, 1, 0), V3(), 1, c); G.add(a); return a }
function setArr(a, pos, dir, len) { len = Math.max(len, .05); a.position.copy(pos); a.setDirection(dir); a.setLength(len, Math.min(.4, len * .6), .2) }
function hline(y, c) { return new THREE.Line(new THREE.BufferGeometry().setFromPoints([V3(2.4, y, 0), V3(3.8, y, 0)]), new THREE.LineBasicMaterial({ color: c })) }

function setup() {
    if (G) { scene.remove(G); G.traverse(o => { if (o.geometry) o.geometry.dispose() }) }
    G = new THREE.Group(); scene.add(G);
    const man = P.modo === 1, w = Math.sqrt(P.k / P.m), T = 2 * PI / w, W = P.m * P.g, xe = W / P.k;
    const Dmax = man ? 1 : xe + P.A, Dmin = man ? 0 : Math.min(0, xe - P.A), s = Math.min(5, 9.5 / (L0 + Dmax)), sz = .8 + .25 * Math.cbrt(P.m), Ts = Math.min(Math.max(T, 1.2), 6);
    S = { w, T, W, xe, Dmax, Dmin, s, sz, f: T / Ts, tau: 0, F0: Math.max(W, P.k * Dmax, P.k * Math.abs(Dmin), .01), Dl: 0, v: 0 };
    const ce = new THREE.Mesh(new THREE.BoxGeometry(6, .3, 2), MT(0x9aa0aa)); ce.position.y = 12.15; G.add(ce);
    S.geo = new THREE.BufferGeometry(); S.geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(121 * 3), 3));
    G.add(new THREE.Line(S.geo, new THREE.LineBasicMaterial({ color: 0xc2410c })));
    S.blk = new THREE.Mesh(new THREE.BoxGeometry(sz, sz, sz * .9), MT(0x475569)); G.add(S.blk);
    G.add(hline(12 - L0 * s - sz / 2, 0x8a94a0), hline(12 - (L0 + xe) * s - sz / 2, 0x0d9488));
    S.aP = arr(0xd97706); S.aE = arr(0xdc2626); S.aR = arr(0x2563eb);
    const rows = man ? [['Alongamento de equilíbrio (m·g/k)', fmt(xe) + ' m'], ['Peso (m·g)', fmt(W) + ' N'], ['Força elástica (k·x)', fmt(P.k * P.D) + ' N'], ['Energia elástica (½·k·x²)', fmt(.5 * P.k * P.D * P.D, 3) + ' J']]
        : [['Alongamento de equilíbrio (m·g/k)', fmt(xe) + ' m'], ['Peso (m·g)', fmt(W) + ' N'], ['Período (2π·√(m/k))', fmt(T) + ' s'], ['Frequência', fmt(1 / T) + ' Hz'], ['Energia da oscilação (½·k·A²)', fmt(.5 * P.k * P.A * P.A, 3) + ' J']];
    $('vals').innerHTML = rows.map(r => `<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join('');
    $('nota').textContent = man ? `Dobrar o alongamento dobra a força: a razão F/x é sempre k = ${fmt(P.k, 0)} N/m.`
        : `Parada, a mola já fica esticada ${fmt(xe)} m para segurar o peso. A massa oscila em torno desse ponto de equilíbrio (linha verde-água).`;
    syncChips(); t = 0; S.tau = 0; frame(0)
}

function place(Dl, v) {
    S.Dl = Dl; S.v = v; const top = 12 - (L0 + Dl) * S.s, cy = top - S.sz / 2; S.blk.position.set(0, cy, 0);
    const a = S.geo.attributes.position.array, N = 120;
    for (let i = 0; i <= N; i++) { const u = i / N, e = (i === 0 || i === N) ? 0 : 1; a[i * 3] = .45 * Math.cos(2 * PI * 12 * u) * e; a[i * 3 + 1] = 12 - (12 - top) * u; a[i * 3 + 2] = .45 * Math.sin(2 * PI * 12 * u) * e }
    S.geo.attributes.position.needsUpdate = true;
    const Fe = P.k * Dl, Fr = S.W - Fe, k = 3.4 / S.F0, o = S.sz / 2 + .5, on = $('forcas').checked;
    setArr(S.aP, V3(o, cy, 0), V3(0, -1, 0), S.W * k);
    setArr(S.aE, V3(-o, cy, 0), V3(0, Fe >= 0 ? 1 : -1, 0), Math.abs(Fe) * k);
    setArr(S.aR, V3(o + .9, cy, 0), V3(0, Fr >= 0 ? -1 : 1, 0), Math.abs(Fr) * k);
    S.aP.visible = S.aE.visible = S.aR.visible = on
}

function frame(dt) {
    if (P.modo === 1) { place(P.D, 0); return }
    S.tau += dt * S.f; const y = P.A * Math.cos(S.w * S.tau); place(S.xe + y, -P.A * S.w * Math.sin(S.w * S.tau))
}
function step(dt) { t += dt; frame(dt) }

function live() {
    const Dl = S.Dl, Fe = P.k * Dl, Fr = S.W - Fe; let txt;
    if (P.modo === 1) txt = `Alongamento = ${fmt(Dl)} m · F = k·x = ${fmt(Fe)} N\nForça resultante = ${fmt(Fr)} N ${Math.abs(Fr) < .005 ? '(equilíbrio)' : Fr > 0 ? '(a massa desceria)' : '(a massa subiria)'}`;
    else {
        txt = `Agora: x = ${fmt(Dl)} m (${Dl >= 0 ? 'esticada' : 'comprimida'}) · F elástica = ${fmt(Fe)} N\nv = ${fmt(Math.abs(S.v))} m/s ${S.v > .005 ? 'para baixo' : S.v < -.005 ? 'para cima' : ''} · resultante = ${fmt(Fr)} N`;
        if (S.f < .95) txt += `\nAnimação em câmera lenta (${fmt(S.f)}× do tempo real)`; else if (S.f > 1.05) txt += `\nAnimação acelerada (${fmt(S.f)}× o tempo real)`
    }
    return txt
}

function graf() {
    const c = $('graf'), x = c.getContext('2d'), w = c.width, h = c.height, d = devicePixelRatio || 1, cs = getComputedStyle(document.documentElement),
        ln = cs.getPropertyValue('--linha').trim() || '#ccc', ac = cs.getPropertyValue('--acento').trim() || '#c2410c', su = cs.getPropertyValue('--suave').trim() || '#888',
        pad = 14 * d, Dn = S.Dmin, Dx = S.Dmax, X = v => pad + (w - 2 * pad) * (v - Dn) / (Dx - Dn), Y = f => h - pad - (h - 2 * pad) * (f - P.k * Dn) / (P.k * (Dx - Dn));
    x.clearRect(0, 0, w, h);
    x.strokeStyle = ln; x.lineWidth = d; x.beginPath(); x.moveTo(X(0), pad * .4); x.lineTo(X(0), h - pad * .4); x.moveTo(pad * .4, Y(0)); x.lineTo(w - pad * .4, Y(0)); x.stroke();
    x.strokeStyle = ac; x.lineWidth = 2 * d; x.beginPath(); x.moveTo(X(Dn), Y(P.k * Dn)); x.lineTo(X(Dx), Y(P.k * Dx)); x.stroke();
    x.strokeStyle = '#0d9488'; x.lineWidth = 2 * d; x.beginPath(); x.arc(X(S.xe), Y(S.W), 4 * d, 0, 2 * PI); x.stroke();
    x.fillStyle = ac; x.beginPath(); x.arc(X(S.Dl), Y(P.k * S.Dl), 4.5 * d, 0, 2 * PI); x.fill();
    x.fillStyle = su; x.font = `${11 * d}px Inter,system-ui,sans-serif`; x.fillText('força elástica × alongamento (inclinação = k)', X(0) + 8 * d, pad + 2 * d)
}
new ResizeObserver(() => { const c = $('graf'), d = devicePixelRatio || 1; c.width = c.clientWidth * d; c.height = c.clientHeight * d }).observe($('graf'));

/* Controles */
const divs = [];
CT.forEach(q => {
    const d = document.createElement('div'); d.className = 'ctl';
    const tx = v => (fmt(v, q.d) + ' ' + q.u).trim();
    d.innerHTML = `<label for="i${q.k}">${q.l}<output>${tx(P[q.k])}</output></label><input id="i${q.k}" type="range" min="${q.min}" max="${q.max}" step="${q.step}" value="${P[q.k]}">`;
    const inp = d.querySelector('input'), out = d.querySelector('output'); ref[q.k] = { inp, out, tx };
    inp.addEventListener('input', e => { P[q.k] = +e.target.value; out.textContent = tx(P[q.k]); setup() });
    divs.push([q, d]); $('ctls').appendChild(d)
});
function aplicaModo() {
    divs.forEach(([q, d]) => { d.hidden = q.modo !== undefined && q.modo !== P.modo });
    $('modos').querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(i === P.modo)))
}
MOD.forEach((n, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = n; b.onclick = () => { P.modo = i; aplicaModo(); setup() }; $('modos').appendChild(b) });
PRE.forEach(([nome, g]) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = `${nome} ${fmt(g, 1)}`; b.dataset.g = g;
    b.onclick = () => { P.g = g; ref.g.inp.value = g; ref.g.out.textContent = ref.g.tx(g); setup() }; $('chips').appendChild(b)
});
function syncChips() { $('chips').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.g === P.g))) }
$('forcas').addEventListener('change', () => place(S.Dl, S.v));
$('pp').onclick = () => { paused = !paused; $('pp').textContent = paused ? 'Continuar' : 'Pausar' };
$('pp').textContent = paused ? 'Continuar' : 'Pausar';
$('rs').onclick = setup;

let last = performance.now();
function loop(now) { const dt = Math.min((now - last) / 1000, .1); last = now; if (!paused) step(dt); $('live').textContent = live(); graf(); cam(); rd.render(scene, camera); requestAnimationFrame(loop) }
size(); aplicaModo(); setup(); requestAnimationFrame(loop);