const $ = id => document.getElementById(id), PI = Math.PI, V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const fmt = (n, d = 2) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const MT = c => new THREE.MeshStandardMaterial({ color: c, roughness: .5, metalness: .05 });
const stage = $('stage'), rd = new THREE.WebGLRenderer({ antialias: true, alpha: true });
rd.setPixelRatio(Math.min(devicePixelRatio, 2)); stage.appendChild(rd.domElement);
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(42, 1, .1, 300);
scene.add(new THREE.AmbientLight(0xffffff, .75));
const sun = new THREE.DirectionalLight(0xffffff, .8); sun.position.set(6, 14, 10); scene.add(sun);
const grid = new THREE.GridHelper(44, 44, 0x8a94a0, 0x8a94a0); grid.material.transparent = true; grid.material.opacity = .28; scene.add(grid);
let az = .25, el = .16, dist = 38, tg = V3(0, 5, 0);
function cam() { camera.position.set(tg.x + dist * Math.cos(el) * Math.sin(az), tg.y + dist * Math.sin(el), tg.z + dist * Math.cos(el) * Math.cos(az)); camera.lookAt(tg) }
function size() { const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; rd.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix() }
new ResizeObserver(size).observe(stage);
const cv = rd.domElement; let dr = null;
cv.addEventListener('pointerdown', e => { dr = [e.clientX, e.clientY]; cv.setPointerCapture(e.pointerId) });
cv.addEventListener('pointermove', e => { if (!dr) return; az -= (e.clientX - dr[0]) * .008; el = Math.max(.03, Math.min(1.4, el + (e.clientY - dr[1]) * .008)); dr = [e.clientX, e.clientY] });
cv.addEventListener('pointerup', () => dr = null);
cv.addEventListener('wheel', e => { e.preventDefault(); dist = Math.max(14, Math.min(80, dist * (1 + e.deltaY * .001))) }, { passive: false });

const P = { v: 25, a: 45, h: 0, g: 9.8 }, CT = [
    { k: 'v', l: 'Velocidade inicial', min: 5, max: 60, step: 1, u: 'm/s', d: 0 },
    { k: 'a', l: 'Ângulo de lançamento', min: 5, max: 85, step: 1, u: '°', d: 0 },
    { k: 'h', l: 'Altura inicial', min: 0, max: 30, step: 1, u: 'm', d: 0 },
    { k: 'g', l: 'Gravidade', min: 1, max: 25, step: .1, u: 'm/s²', d: 1 }];
const PRE = [['Terra', 9.8], ['Lua', 1.6], ['Marte', 3.7], ['Júpiter', 24.8]];
const ref = {};
let G = null, S = {}, t = 0, paused = matchMedia('(prefers-reduced-motion:reduce)').matches;

function kin(a) {
    const r = a * PI / 180, vx = P.v * Math.cos(r), vy = P.v * Math.sin(r), T = (vy + Math.sqrt(vy * vy + 2 * P.g * P.h)) / P.g;
    return { vx, vy, T, R: vx * T, H: P.h + vy * vy / (2 * P.g) }
}
function arr(c) { const a = new THREE.ArrowHelper(V3(1, 0, 0), V3(), 1, c); G.add(a); return a }
function setArr(a, pos, dir, len) { len = Math.max(len, .05); a.position.copy(pos); a.setDirection(dir); a.setLength(len, Math.min(.4, len * .6), .2) }

function setup() {
    if (G) { scene.remove(G); G.traverse(o => { if (o.geometry) o.geometry.dispose() }) }
    G = new THREE.Group(); scene.add(G);
    const A = kin(P.a), B = kin(90 - P.a), cp = $('compl').checked, R = cp ? Math.max(A.R, B.R) : A.R, Hm = cp ? Math.max(A.H, B.H) : A.H;
    const s = Math.min(22 / Math.max(R, 1), 11 / Math.max(Hm, 1)), off = R * s / 2, th = P.a * PI / 180, D = Math.min(Math.max(A.T, 3), 8);
    S = Object.assign({}, A, { s, off, D, k: A.T / D, tt: 0 });
    const W = (K, tt) => V3(K.vx * tt * s - off, (P.h + K.vy * tt - .5 * P.g * tt * tt) * s, 0);
    const path = K => { const p = []; for (let i = 0; i <= 80; i++)p.push(W(K, K.T * i / 80)); return new THREE.BufferGeometry().setFromPoints(p) };
    G.add(new THREE.Line(path(A), new THREE.LineBasicMaterial({ color: 0xc2410c })));
    if (cp) {
        const l = new THREE.Line(path(B), new THREE.LineDashedMaterial({ color: 0x8a94a0, dashSize: .4, gapSize: .3 })); l.computeLineDistances(); G.add(l);
        const m = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .04, 24), MT(0x8a94a0)); m.position.set(B.R * s - off, .02, 0); G.add(m)
    }
    if (P.h > 0) { const p = new THREE.Mesh(new THREE.BoxGeometry(.8, P.h * s, .8), MT(0x9aa0aa)); p.position.set(-off, P.h * s / 2, 0); G.add(p) }
    const gm = new THREE.BoxGeometry(1.6, .4, .5); gm.translate(.8, 0, 0); const can = new THREE.Mesh(gm, MT(0x5b616b)); can.position.set(-off, P.h * s, 0); can.rotation.z = th; G.add(can);
    const land = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, .05, 24), MT(0xc2410c)); land.position.set(A.R * s - off, .03, 0); G.add(land);
    const ap = new THREE.Mesh(new THREE.SphereGeometry(.14, 16, 12), MT(0x0d9488)); ap.position.copy(W(A, A.vy / P.g)); G.add(ap);
    S.ball = new THREE.Mesh(new THREE.SphereGeometry(.32, 24, 16), MT(0xd97706)); G.add(S.ball);
    S.aV = arr(0x2563eb); S.aX = arr(0x64748b); S.aY = arr(0x64748b);
    S.gh = new THREE.Group(); for (let k = 0; k <= 10; k++) { const m = new THREE.Mesh(new THREE.SphereGeometry(.1, 12, 8), MT(0x8a94a0)); m.position.copy(W(A, A.T * k / 10)); S.gh.add(m) }
    S.gh.visible = $('marcas').checked; G.add(S.gh);
    const st = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500].find(v => R / v <= 10) || 500, pts = [V3(-off, 0, 1.6), V3(R * s - off, 0, 1.6)];
    for (let m = 0; m <= R; m += st)pts.push(V3(m * s - off, 0, 1.6), V3(m * s - off, 0, 2.1));
    G.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x8a94a0 })));
    tg.set(0, Hm * s * .45 + .5, 0);
    const vi = Math.hypot(A.vx, A.vy - P.g * A.T);
    $('vals').innerHTML = [['Alcance', fmt(A.R) + ' m'], ['Altura máxima', fmt(A.H) + ' m'], ['Tempo de voo', fmt(A.T) + ' s'], ['Velocidade horizontal (vx)', fmt(A.vx) + ' m/s'], ['Velocidade vertical inicial (vy)', fmt(A.vy) + ' m/s'], ['Velocidade ao cair', fmt(vi) + ' m/s'], ['Régua com marcas a cada', fmt(st, 0) + ' m']].map(r => `<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join('');
    $('nota').textContent = cp ? (P.h > 0 ? 'Com altura inicial, os ângulos complementares deixam de ter o mesmo alcance.' : `Ângulos complementares (${P.a}° e ${90 - P.a}°) têm o mesmo alcance: ${fmt(A.R)} m.`) : (P.h > 0 ? 'Com altura inicial, o maior alcance acontece em um ângulo menor que 45°.' : 'Sem altura inicial, o maior alcance acontece em 45°.');
    syncChips(); t = 0; place(0)
}

function place(tt) {
    const y = Math.max(0, P.h + S.vy * tt - .5 * P.g * tt * tt), vy = S.vy - P.g * tt, sp = Math.hypot(S.vx, vy), k = 3.2 / P.v; S.tt = tt;
    const pos = V3(S.vx * tt * S.s - S.off, y * S.s, 0); S.ball.position.copy(pos);
    setArr(S.aV, pos, V3(S.vx, vy, 0).normalize(), Math.min(sp * k, 5));
    setArr(S.aX, pos, V3(1, 0, 0), S.vx * k); setArr(S.aY, pos, V3(0, vy >= 0 ? 1 : -1, 0), Math.abs(vy) * k);
    S.aX.visible = S.aY.visible = $('comp').checked
}
function step(dt) { t += dt; place(Math.min((t / S.D) % 1.35, 1) * S.T) }

function live() {
    const tt = S.tt, vy = S.vy - P.g * tt, y = Math.max(0, P.h + S.vy * tt - .5 * P.g * tt * tt);
    let txt = `Agora: t = ${fmt(tt)} s · x = ${fmt(S.vx * tt)} m · y = ${fmt(y)} m\nv = ${fmt(Math.hypot(S.vx, vy))} m/s (vx = ${fmt(S.vx)}, vy = ${fmt(vy)})`;
    if (S.k < .95) txt += `\nAnimação em câmera lenta (${fmt(S.k)}× do tempo real)`;
    else if (S.k > 1.05) txt += `\nAnimação acelerada (${fmt(S.k)}× o tempo real)`;
    return txt
}

function graf() {
    const c = $('graf'), x = c.getContext('2d'), w = c.width, h = c.height, d = devicePixelRatio || 1, cs = getComputedStyle(document.documentElement),
        ln = cs.getPropertyValue('--linha').trim() || '#ccc', ac = cs.getPropertyValue('--acento').trim() || '#c2410c', su = cs.getPropertyValue('--suave').trim() || '#888',
        vmax = Math.max(S.vx, S.vy, 1), vmin = Math.min(S.vy - P.g * S.T, 0), pad = 14 * d,
        X = v => pad + (w - 2 * pad) * v / S.T, Y = v => h - pad - (h - 2 * pad) * (v - vmin) / (vmax - vmin);
    x.clearRect(0, 0, w, h);
    x.strokeStyle = ln; x.lineWidth = d; x.beginPath(); x.moveTo(pad, pad * .4); x.lineTo(pad, h - pad * .4); x.moveTo(pad, Y(0)); x.lineTo(w - pad * .4, Y(0)); x.stroke();
    const L = (v0, v1, col) => { x.strokeStyle = col; x.lineWidth = 2 * d; x.beginPath(); x.moveTo(X(0), Y(v0)); x.lineTo(X(S.T), Y(v1)); x.stroke() };
    L(S.vx, S.vx, '#0d9488'); L(S.vy, S.vy - P.g * S.T, ac);
    const dot = (v, col) => { x.fillStyle = col; x.beginPath(); x.arc(X(S.tt), Y(v), 4.5 * d, 0, 2 * PI); x.fill() };
    dot(S.vx, '#0d9488'); dot(S.vy - P.g * S.tt, ac);
    x.fillStyle = su; x.font = `${11 * d}px Inter,system-ui,sans-serif`; x.fillText('vx (verde) e vy (laranja) × tempo', pad + 8 * d, pad + 2 * d)
}
new ResizeObserver(() => { const c = $('graf'), d = devicePixelRatio || 1; c.width = c.clientWidth * d; c.height = c.clientHeight * d }).observe($('graf'));

/* Controles */
CT.forEach(q => {
    const d = document.createElement('div'); d.className = 'ctl';
    const tx = v => (fmt(v, q.d) + ' ' + q.u).trim();
    d.innerHTML = `<label for="i${q.k}">${q.l}<output>${tx(P[q.k])}</output></label><input id="i${q.k}" type="range" min="${q.min}" max="${q.max}" step="${q.step}" value="${P[q.k]}">`;
    const inp = d.querySelector('input'), out = d.querySelector('output'); ref[q.k] = { inp, out, tx };
    inp.addEventListener('input', e => { P[q.k] = +e.target.value; out.textContent = tx(P[q.k]); setup() });
    $('ctls').appendChild(d)
});
PRE.forEach(([nome, g]) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = `${nome} ${fmt(g, 1)}`; b.dataset.g = g;
    b.onclick = () => { P.g = g; ref.g.inp.value = g; ref.g.out.textContent = ref.g.tx(g); setup() }; $('chips').appendChild(b)
});
function syncChips() { $('chips').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.g === P.g))) }
$('comp').addEventListener('change', () => place(S.tt));
$('marcas').addEventListener('change', () => { S.gh.visible = $('marcas').checked });
$('compl').addEventListener('change', setup);
$('pp').onclick = () => { paused = !paused; $('pp').textContent = paused ? 'Continuar' : 'Pausar' };
$('pp').textContent = paused ? 'Continuar' : 'Pausar';
$('rs').onclick = setup;

let last = performance.now();
function loop(now) { const dt = Math.min((now - last) / 1000, .1); last = now; if (!paused) step(dt); $('live').textContent = live(); graf(); cam(); rd.render(scene, camera); requestAnimationFrame(loop) }
size(); setup(); requestAnimationFrame(loop);