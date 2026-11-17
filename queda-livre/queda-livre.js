const $ = id => document.getElementById(id), PI = Math.PI, V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const fmt = (n, d = 2) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const MT = c => new THREE.MeshStandardMaterial({ color: c, roughness: .5, metalness: .05 });
const stage = $('stage'), rd = new THREE.WebGLRenderer({ antialias: true, alpha: true });
rd.setPixelRatio(Math.min(devicePixelRatio, 2)); stage.appendChild(rd.domElement);
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(42, 1, .1, 300);
scene.add(new THREE.AmbientLight(0xffffff, .75));
const sun = new THREE.DirectionalLight(0xffffff, .8); sun.position.set(6, 14, 10); scene.add(sun);
const grid = new THREE.GridHelper(44, 44, 0x8a94a0, 0x8a94a0); grid.material.transparent = true; grid.material.opacity = .28; scene.add(grid);
let az = .45, el = .12, dist = 36, tg = V3(0, 7.5, 0);
function cam() { camera.position.set(tg.x + dist * Math.cos(el) * Math.sin(az), tg.y + dist * Math.sin(el), tg.z + dist * Math.cos(el) * Math.cos(az)); camera.lookAt(tg) }
function size() { const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; rd.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix() }
new ResizeObserver(size).observe(stage);
const cv = rd.domElement; let dr = null;
cv.addEventListener('pointerdown', e => { dr = [e.clientX, e.clientY]; cv.setPointerCapture(e.pointerId) });
cv.addEventListener('pointermove', e => { if (!dr) return; az -= (e.clientX - dr[0]) * .008; el = Math.max(.03, Math.min(1.4, el + (e.clientY - dr[1]) * .008)); dr = [e.clientX, e.clientY] });
cv.addEventListener('pointerup', () => dr = null);
cv.addEventListener('wheel', e => { e.preventDefault(); dist = Math.max(14, Math.min(70, dist * (1 + e.deltaY * .001))) }, { passive: false });

const P = { h: 45, g: 9.8 }, CT = [
    { k: 'h', l: 'Altura inicial', min: 5, max: 100, step: 1, u: 'm', d: 0 },
    { k: 'g', l: 'Gravidade', min: 1, max: 25, step: .1, u: 'm/s²', d: 1 }];
const PRE = [['Terra', 9.8], ['Lua', 1.6], ['Marte', 3.7], ['Júpiter', 24.8]];
const ref = {};
let G = null, S = {}, t = 0, paused = matchMedia('(prefers-reduced-motion:reduce)').matches;

function setup() {
    if (G) { scene.remove(G); G.traverse(o => { if (o.geometry) o.geometry.dispose() }) }
    G = new THREE.Group(); scene.add(G);
    const T = Math.sqrt(2 * P.h / P.g), s = 14 / P.h, D = Math.min(Math.max(T, 3), 8), vf = P.g * T;
    S = { T, s, D, vf, tt: 0, k: T / D };
    const bar = new THREE.Mesh(new THREE.BoxGeometry(5, .25, 1.6), MT(0x9aa0aa)); bar.position.y = P.h * s + 1.5; G.add(bar);
    S.b1 = new THREE.Mesh(new THREE.SphereGeometry(.6, 28, 18), MT(0xc2410c));
    S.b2 = new THREE.Mesh(new THREE.SphereGeometry(.3, 28, 18), MT(0x0d9488));
    S.b1.position.x = -1.3; S.b2.position.x = 1.3; G.add(S.b1, S.b2);
    S.arr = new THREE.ArrowHelper(V3(0, -1, 0), V3(), 1, 0x2563eb); G.add(S.arr);
    S.gh = new THREE.Group();
    for (let k = 0; k <= 8; k++) { const tt = T * k / 8, m = new THREE.Mesh(new THREE.SphereGeometry(.13, 12, 8), MT(0x8a94a0)); m.position.set(0, (P.h - .5 * P.g * tt * tt) * s + .13, 0); S.gh.add(m) }
    S.gh.visible = $('marcas').checked; G.add(S.gh);
    const st = [1, 2, 5, 10, 20, 25, 50].find(v => P.h / v <= 10) || 50, pts = [V3(-4.5, 0, 0), V3(-4.5, P.h * s, 0)];
    for (let m = 0; m <= P.h; m += st) { pts.push(V3(-4.5, m * s, 0), V3(-4, m * s, 0)) }
    G.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x8a94a0 })));
    const rows = [['Tempo de queda', fmt(T) + ' s'], ['Velocidade ao chegar', fmt(vf) + ' m/s'], ['Em quilômetros por hora', fmt(vf * 3.6, 0) + ' km/h'], ['Régua com marcas a cada', fmt(st, 0) + ' m']];
    $('vals').innerHTML = rows.map(r => `<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join('');
    syncChips(); t = 0; place(0)
}

function place(tt) {
    S.tt = tt; const y = (P.h - .5 * P.g * tt * tt) * S.s;
    S.b1.position.y = y + .6; S.b2.position.y = y + .3;
    const len = Math.max(.05, 4 * tt / S.T); S.arr.position.copy(S.b1.position); S.arr.setLength(len, Math.min(.45, len * .6), .22)
}

function step(dt) { t += dt; place(Math.min((t / S.D) % 1.35, 1) * S.T) }

function live() {
    const tt = S.tt, d = .5 * P.g * tt * tt;
    let txt = `Agora: t = ${fmt(tt)} s · v = ${fmt(P.g * tt)} m/s\ncaiu ${fmt(d)} m · faltam ${fmt(Math.max(0, P.h - d))} m`;
    if (S.k < .95) txt += `\nAnimação em câmera lenta (${fmt(S.k)}× do tempo real)`;
    else if (S.k > 1.05) txt += `\nAnimação acelerada (${fmt(S.k)}× o tempo real)`;
    return txt
}

function graf() {
    const c = $('graf'), x = c.getContext('2d'), w = c.width, h = c.height, d = devicePixelRatio || 1, cs = getComputedStyle(document.documentElement),
        ln = cs.getPropertyValue('--linha').trim() || '#ccc', ac = cs.getPropertyValue('--acento').trim() || '#c2410c', su = cs.getPropertyValue('--suave').trim() || '#888',
        pad = 14 * d, X = v => pad + (w - 2 * pad) * v / S.T, Y = v => h - pad - (h - 2 * pad) * v / S.vf;
    x.clearRect(0, 0, w, h);
    x.strokeStyle = ln; x.lineWidth = d; x.beginPath(); x.moveTo(pad, pad * .4); x.lineTo(pad, h - pad); x.lineTo(w - pad * .4, h - pad); x.stroke();
    x.strokeStyle = ac; x.lineWidth = 2 * d; x.beginPath(); x.moveTo(X(0), Y(0)); x.lineTo(X(S.T), Y(S.vf)); x.stroke();
    x.fillStyle = ac; x.beginPath(); x.arc(X(S.tt), Y(P.g * S.tt), 4.5 * d, 0, 2 * PI); x.fill();
    x.fillStyle = su; x.font = `${11 * d}px Inter,system-ui,sans-serif`; x.fillText('velocidade × tempo', pad + 8 * d, pad + 2 * d)
}
new ResizeObserver(() => { const c = $('graf'), d = devicePixelRatio || 1; c.width = c.clientWidth * d; c.height = c.clientHeight * d }).observe($('graf'));

/* Controles */
CT.forEach(q => {
    const d = document.createElement('div'); d.className = 'ctl';
    const tx = v => (fmt(v, q.d) + ' ' + q.u).trim();
    d.innerHTML = `<label for="i${q.k}">${q.l}<output>${tx(P[q.k])}</output></label><input id="i${q.k}" type="range" min="${q.min}" max="${q.max}" step="${q.step}" value="${P[q.k]}">`;
    const inp = d.querySelector('input'), out = d.querySelector('output');
    ref[q.k] = { inp, out, tx };
    inp.addEventListener('input', e => { P[q.k] = +e.target.value; out.textContent = tx(P[q.k]); setup() });
    $('ctls').appendChild(d)
});
PRE.forEach(([nome, g]) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = `${nome} ${fmt(g, 1)}`; b.dataset.g = g;
    b.onclick = () => { P.g = g; ref.g.inp.value = g; ref.g.out.textContent = ref.g.tx(g); setup() }; $('chips').appendChild(b)
});
function syncChips() { $('chips').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.g === P.g))) }
$('marcas').addEventListener('change', () => { S.gh.visible = $('marcas').checked });
$('pp').onclick = () => { paused = !paused; $('pp').textContent = paused ? 'Continuar' : 'Pausar' };
$('pp').textContent = paused ? 'Continuar' : 'Pausar';
$('rs').onclick = setup;

let last = performance.now();
function loop(now) { const dt = Math.min((now - last) / 1000, .1); last = now; if (!paused) step(dt); $('live').textContent = live(); graf(); cam(); rd.render(scene, camera); requestAnimationFrame(loop) }
size(); setup(); requestAnimationFrame(loop);