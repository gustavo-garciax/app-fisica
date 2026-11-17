const $ = id => document.getElementById(id), PI = Math.PI, V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const fmt = (n, d = 2) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const MT = c => new THREE.MeshStandardMaterial({ color: c, roughness: .5, metalness: .05 });
const stage = $('stage'), rd = new THREE.WebGLRenderer({ antialias: true, alpha: true });
rd.setPixelRatio(Math.min(devicePixelRatio, 2)); stage.appendChild(rd.domElement);
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(42, 1, .1, 300);
scene.add(new THREE.AmbientLight(0xffffff, .75));
const sun = new THREE.DirectionalLight(0xffffff, .8); sun.position.set(6, 14, 10); scene.add(sun);
const grid = new THREE.GridHelper(44, 44, 0x8a94a0, 0x8a94a0); grid.material.transparent = true; grid.material.opacity = .28; scene.add(grid);
let az = .55, el = .2, dist = 32, tg = V3(0, 5, 0);
function cam() { camera.position.set(tg.x + dist * Math.cos(el) * Math.sin(az), tg.y + dist * Math.sin(el), tg.z + dist * Math.cos(el) * Math.cos(az)); camera.lookAt(tg) }
function size() { const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; rd.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix() }
new ResizeObserver(size).observe(stage);
const cv = rd.domElement; let dr = null;
cv.addEventListener('pointerdown', e => { dr = [e.clientX, e.clientY]; cv.setPointerCapture(e.pointerId) });
cv.addEventListener('pointermove', e => { if (!dr) return; az -= (e.clientX - dr[0]) * .008; el = Math.max(.03, Math.min(1.4, el + (e.clientY - dr[1]) * .008)); dr = [e.clientX, e.clientY] });
cv.addEventListener('pointerup', () => dr = null);
cv.addEventListener('wheel', e => { e.preventDefault(); dist = Math.max(14, Math.min(60, dist * (1 + e.deltaY * .001))) }, { passive: false });

const P = { a: 30, mu: .25, m: 2, g: 9.8 }, CT = [
    { k: 'a', l: 'Ângulo da rampa', min: 1, max: 70, step: 1, u: '°', d: 0 },
    { k: 'mu', l: 'Coeficiente de atrito (μ)', min: 0, max: 1, step: .01, u: '', d: 2 },
    { k: 'm', l: 'Massa do bloco', min: .5, max: 20, step: .5, u: 'kg', d: 1 },
    { k: 'g', l: 'Gravidade', min: 1, max: 25, step: .1, u: 'm/s²', d: 1 }];
let G = null, S = {}, t = 0, paused = matchMedia('(prefers-reduced-motion:reduce)').matches;
function arr(c) { const a = new THREE.ArrowHelper(V3(1, 0, 0), V3(), 1, c); G.add(a); return a }
function setArr(a, pos, dir, len) { len = Math.max(len, .05); a.position.copy(pos); a.setDirection(dir); a.setLength(len, Math.min(.45, len * .6), .22) }

function setup() {
    if (G) { scene.remove(G); G.traverse(o => { if (o.geometry) o.geometry.dispose() }) }
    G = new THREE.Group(); scene.add(G);
    const th = P.a * PI / 180, sn = Math.sin(th), cs = Math.cos(th), Lr = 14, Lx = Lr * cs, H = Lr * sn, W = P.m * P.g, N = W * cs, Px = W * sn;
    const acc = Math.max(0, P.g * (sn - P.mu * cs)), slide = acc > 0, Fat = slide ? P.mu * N : Px, sz = .9 + .2 * Math.cbrt(P.m), D = Lr - sz, tc = slide ? Math.sqrt(2 * D / acc) : 0;
    S = { th, sn, cs, W, acc, slide, Fat, sz, D, tc, k: Math.max(1, tc / 10), d: V3(cs, -sn, 0), n: V3(sn, cs, 0), T0: V3(-Lx / 2, H, 0), s: 0, v: 0, tn: 0, ts: 0 };
    const sh = new THREE.Shape(); sh.moveTo(-Lx / 2, 0); sh.lineTo(Lx / 2, 0); sh.lineTo(-Lx / 2, H); sh.closePath();
    const gm = new THREE.ExtrudeGeometry(sh, { depth: 3, bevelEnabled: false }); gm.translate(0, 0, -1.5);
    G.add(new THREE.Mesh(gm, MT(0x9aa0aa)), new THREE.LineSegments(new THREE.EdgesGeometry(gm), new THREE.LineBasicMaterial({ color: 0x5b616b })));
    const pts = []; for (let i = 0; i <= 24; i++) { const f = PI - th + th * i / 24; pts.push(V3(Lx / 2 + 2.6 * Math.cos(f), 2.6 * Math.sin(f), 1.6)) }
    G.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xc2410c })));
    S.blk = new THREE.Mesh(new THREE.BoxGeometry(sz, sz, sz), MT(0xc2410c)); S.blk.rotation.z = -th; G.add(S.blk);
    S.aP = arr(0xd97706); S.aN = arr(0x0d9488); S.aF = arr(0xdc2626); S.aX = arr(0x64748b); S.aY = arr(0x64748b);
    tg.y = H * .45 + 1;
    const crit = Math.atan(P.mu) * 180 / PI;
    const rows = [['Situação', slide ? 'Desliza' : 'Fica parado'], ['Aceleração', fmt(acc) + ' m/s²'], ['Peso (m·g)', fmt(W) + ' N'], ['Normal (m·g·cos θ)', fmt(N) + ' N'], ['Peso ao longo da rampa', fmt(Px) + ' N'], [slide ? 'Atrito cinético' : 'Atrito estático', fmt(Fat) + ' N'], ['Desliza acima de', fmt(crit, 1) + '°']];
    $('vals').innerHTML = rows.map(r => `<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join('');
    t = 0; place()
}

function place() {
    const pos = S.T0.clone().addScaledVector(S.d, S.sz / 2 + S.s).addScaledVector(S.n, S.sz / 2); S.blk.position.copy(pos);
    const L = 3.4, sn = S.sn, cs = S.cs, dn = S.d.clone().negate(), nn = S.n.clone().negate(), show = $('comp').checked;
    setArr(S.aP, pos, V3(0, -1, 0), L); setArr(S.aN, pos, S.n, L * cs); setArr(S.aF, pos, dn, L * S.Fat / S.W);
    setArr(S.aX, pos, S.d, L * sn); setArr(S.aY, pos, nn, L * cs); S.aX.visible = S.aY.visible = show
}

function step(dt) {
    if (S.slide) { S.ts += dt * S.k; if (S.ts > S.tc + 1.2) S.ts = 0; const tt = Math.min(S.ts, S.tc); S.tn = tt; S.s = .5 * S.acc * tt * tt; S.v = S.acc * tt }
    place()
}
function live() { return S.slide ? `Agora: t = ${fmt(S.tn)} s · v = ${fmt(S.v)} m/s · distância = ${fmt(S.s)} m` + (S.k > 1 ? ` (tempo acelerado ×${fmt(S.k, 1)})` : '') : 'O atrito é suficiente: o bloco não se move.' }

const box = $('ctls');
CT.forEach(q => {
    const d = document.createElement('div'); d.className = 'ctl';
    const tx = v => (fmt(v, q.d) + ' ' + q.u).trim();
    d.innerHTML = `<label for="i${q.k}">${q.l}<output>${tx(P[q.k])}</output></label><input id="i${q.k}" type="range" min="${q.min}" max="${q.max}" step="${q.step}" value="${P[q.k]}">`;
    d.querySelector('input').addEventListener('input', e => { P[q.k] = +e.target.value; d.querySelector('output').textContent = tx(P[q.k]); setup() });
    box.appendChild(d)
});
$('comp').addEventListener('change', place);
$('pp').onclick = () => { paused = !paused; $('pp').textContent = paused ? 'Continuar' : 'Pausar' };
$('pp').textContent = paused ? 'Continuar' : 'Pausar';
$('rs').onclick = setup;
let last = performance.now();
function loop(now) { const dt = Math.min((now - last) / 1000, .1); last = now; if (!paused) step(dt); $('live').textContent = live(); cam(); rd.render(scene, camera); requestAnimationFrame(loop) }
size(); setup(); requestAnimationFrame(loop);