// Maquette 3D des compétences, rendue en WebGL (Three.js) comme une maquette d'architecte :
// bâtiment blanc mat, occlusion ambiante, ombre portée douce, un étage par catégorie
// et une zone aménagée par compétence. Les données sont lues dans .sk-data (masqué).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const root = document.getElementById('sk3d');
if (root) init();

function init() {
    const LEVELS = { mid: 1, high: 2, expert: 3 };
    const floors = [...document.querySelectorAll('.sk-card')].map(card => ({
        title: card.querySelector('.sk-card__title').textContent.trim(),
        icon: card.querySelector('.sk-card__icon i').className,
        skills: [...card.querySelectorAll('.sk-item')].map(item => {
            const lvl = item.querySelector('.sk-level');
            const key = Object.keys(LEVELS).find(k => lvl.classList.contains('sk-level--' + k)) || 'mid';
            return { name: item.querySelector('.sk-name').textContent.trim(), level: lvl.textContent.trim(), rank: LEVELS[key], icon: null };
        })
    }));
    const soft = document.querySelector('.sk-soft');
    if (soft) {
        floors.push({
            title: 'Soft Skills',
            icon: 'fa-solid fa-star',
            skills: [...soft.querySelectorAll('.sk-tag')].map(tag => ({
                name: tag.textContent.trim(), level: 'Savoir-être', rank: 2,
                icon: tag.querySelector('i')?.className || null
            }))
        });
    }
    if (!floors.length) return;


    // ---------------------------------------------------------------- Interface
    root.innerHTML = `
        <div class="sk3d-canvas"></div>
        <div class="sk3d-pins"></div>
        <div class="sk3d-head">
            <h3 class="sk3d-title" aria-live="polite"></h3>
            <p class="sk3d-sub"></p>
            <div class="sk3d-card" hidden></div>
        </div>
        <div class="sk3d-bar">
            <div class="sk3d-bar__main">
                <div class="sk3d-bar__levels" role="group" aria-label="Choisir un étage"></div>
            </div>
            <button class="sk3d-bar__side" type="button" aria-label="Vue d'ensemble du bâtiment"><span></span><span></span><span></span></button>
        </div>
        <div class="sk3d-grain" aria-hidden="true"></div>
        <aside class="sk3d-panel" aria-label="Projets, expériences et formations liés à la compétence" aria-hidden="true">
            <div class="sk3d-panel__head">
                <div>
                    <p class="sk3d-panel__eyebrow">Utilisé dans</p>
                    <h3 class="sk3d-panel__title"></h3>
                    <p class="sk3d-panel__level"></p>
                </div>
                <button class="sk3d-panel__close" type="button" aria-label="Fermer le panneau">&times;</button>
            </div>
            <div class="sk3d-panel__list"></div>
        </aside>`;
    const $ = (s) => root.querySelector(s);
    const holder = $('.sk3d-canvas'), pinLayer = $('.sk3d-pins');
    const titleEl = $('.sk3d-title'), subEl = $('.sk3d-sub'), cardEl = $('.sk3d-card');
    const levelsEl = $('.sk3d-bar__levels');

    // Grain léger par-dessus la scène, comme sur la référence.
    {
        const c = document.createElement('canvas');
        c.width = c.height = 128;
        const g = c.getContext('2d'), img = g.createImageData(128, 128);
        for (let i = 0; i < img.data.length; i += 4) {
            const v = 110 + Math.random() * 146;
            img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
            img.data[i + 3] = 255;
        }
        g.putImageData(img, 0, 0);
        $('.sk3d-grain').style.backgroundImage = `url(${c.toDataURL()})`;
    }

    // ---------------------------------------------------------------- Scène
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    // Résolution plafonnée : l'occlusion ambiante est coûteuse sur les écrans très denses.
    // Téléphones et tablettes : rendu allégé (pas d'occlusion ambiante, résolution et ombre réduites).
    const LITE = matchMedia('(pointer: coarse), (max-width: 768px)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, LITE ? 1.25 : 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // L'ombre n'est recalculée que quand le bâtiment bouge (pas pour les personnages).
    renderer.shadowMap.autoUpdate = false;
    holder.append(renderer.domElement);

    const BG = new THREE.Color(0xfffbf1);
    const scene = new THREE.Scene();
    scene.background = BG;

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -400, 400);
    const AZ = THREE.MathUtils.degToRad(37.5), EL = THREE.MathUtils.degToRad(40.5);
    const camDir = new THREE.Vector3(Math.sin(AZ) * Math.cos(EL), Math.sin(EL), Math.cos(AZ) * Math.cos(EL));
    const view = { target: new THREE.Vector3(0, 4, 0), zoom: 1 };

    scene.add(new THREE.HemisphereLight(0xffffff, 0xf2ebe3, 2.35));
    const sun = new THREE.DirectionalLight(0xfff8f0, 1.35);
    sun.position.set(22, 26, -30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(LITE ? 1024 : 2048, LITE ? 1024 : 2048);
    Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 200 });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    sun.shadow.radius = 6;
    scene.add(sun, sun.target);

    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(600, 600),
        new THREE.ShadowMaterial({ color: 0x6e6446, opacity: 0.17 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // ---------------------------------------------------------------- Matériaux
    function slatTexture() {
        const c = document.createElement('canvas');
        c.width = 256; c.height = 64;
        const g = c.getContext('2d');
        g.fillStyle = '#f5e9e2';
        g.fillRect(0, 0, 256, 64);
        for (let x = 0; x < 256; x += 8) {
            g.fillStyle = '#eadbd2';
            g.fillRect(x, 0, 1.5, 64);
            g.fillStyle = '#fbf3ee';
            g.fillRect(x + 3, 0, 2, 64);
        }
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        return t;
    }
    const SLAT = slatTexture();
    function sheenTexture() {
        const c = document.createElement('canvas');
        c.width = c.height = 256;
        const g = c.getContext('2d');
        const base = g.createLinearGradient(0, 0, 0, 256);
        base.addColorStop(0, '#dfeeee');
        base.addColorStop(1, '#c9dcdc');
        g.fillStyle = base;
        g.fillRect(0, 0, 256, 256);
        // Bandes de reflet obliques, comme le ciel renvoyé par une vitre.
        g.globalCompositeOperation = 'lighter';
        for (const [x, w, a] of [[30, 70, 0.32], [120, 26, 0.22], [175, 50, 0.18]]) {
            const s = g.createLinearGradient(x, 0, x + w, 0);
            s.addColorStop(0, 'rgba(255,255,255,0)');
            s.addColorStop(0.5, `rgba(255,255,255,${a})`);
            s.addColorStop(1, 'rgba(255,255,255,0)');
            g.save();
            g.translate(128, 128); g.transform(1, 0, -0.55, 1, 0, 0); g.translate(-128, -128);
            g.fillStyle = s;
            g.fillRect(x, -60, w, 380);
            g.restore();
        }
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        return t;
    }
    const SHEEN = sheenTexture();
    const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0, ...extra });
    // Chaque étage a ses propres matériaux pour pouvoir s'effacer en fondu.
    function makeMaterials() {
        return {
            white: std(0xf7f2f0),
            wall: std(0xf6f0ee),
            slab: std(0xf2ebe8),
            wood: std(0xf1e8e3),
            screen: std(0xded8d5),
            slat: std(0xffffff, { map: SLAT }),
            glass: new THREE.MeshStandardMaterial({ color: 0xe6edf0, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.38, depthWrite: false }),
            // Vitrage de façade : teinte verte d'un verre clair, reflets en diagonale peints dans une texture.
            facadeGlass: new THREE.MeshStandardMaterial({ color: 0xffffff, map: SHEEN, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide }),
            frame: std(0xf3eeec),
            mullion: std(0xe9e3e0)
        };
    }

    // ---------------------------------------------------------------- Géométrie
    const H = 3.0, SLAB = 0.3, WALL_T = 0.32, WALL_H = 2.6;
    // Emprise en plan (x le long du bâtiment, z vers l'avant), en mètres : un long volume
    // au pignon gauche en biais, avec un décroché en façade, comme la maquette de référence.
    const LEN = 44, DEP = 20;
    const FOOT = [[0, 0], [LEN, 0], [LEN, DEP], [19, DEP], [18, 16.6], [3.4, 16.6]];
    const OFFSET = new THREE.Vector3(-LEN / 2 - 2, 0, -DEP / 2);
    const GLASS_X = 29;
    // Les zones commencent après le noyau de circulation (ascenseur + escalier) côté gauche.
    const INNER = { x0: 7.4, x1: LEN - 0.7, z0: 0.7, z1: 15.9 };

    const footShape = new THREE.Shape(FOOT.map(([x, z]) => new THREE.Vector2(x, -z)));
    function slabGeometry(depth) {
        const g = new THREE.ExtrudeGeometry(footShape, { depth, bevelEnabled: false });
        g.rotateX(-Math.PI / 2);
        return g;
    }
    const SLAB_GEO = slabGeometry(SLAB);
    // Une couleur de sol par zone : teintes claires, distinctes, en accord avec l'orange du site.
    const ZONE_COLORS = [0xffdcc8, 0xdcebd6, 0xd6e6f2, 0xf5e8c4, 0xd3ece7, 0xeadfd2, 0xdfe3ec, 0xffe9b8];

    function mesh(geo, mat, cast = true, receive = true) {
        const m = new THREE.Mesh(geo, mat);
        m.castShadow = cast;
        m.receiveShadow = receive;
        return m;
    }
    function rbox(w, h, d, mat, r = 0.04) {
        const rr = Math.min(r, w / 2.2, h / 2.2, d / 2.2);
        return mesh(rr > 0.005 ? new RoundedBoxGeometry(w, h, d, 2, rr) : new THREE.BoxGeometry(w, h, d), mat);
    }
    // Mur entre deux points du plan, posé au sol de l'étage.
    function wallBetween([x1, z1], [x2, z2], h, t, mat) {
        const len = Math.hypot(x2 - x1, z2 - z1);
        const m = mesh(new THREE.BoxGeometry(len + t, h, t), mat);
        m.position.set((x1 + x2) / 2, SLAB + h / 2, (z1 + z2) / 2);
        m.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
        return m;
    }
    // Façade vitrée : mur-rideau toute hauteur. Allège basse et linteau pleins, vitrage teinté
    // posé en retrait, montants fins réguliers (épais aux trames de 3 m) et traverse d'imposte.
    function glazing([x1, z1], [x2, z2], mats) {
        const g = new THREE.Group();
        const len = Math.hypot(x2 - x1, z2 - z1);
        const sill = 0.18, head = 0.22, depth = 0.34;
        const gh = WALL_H - sill - head;
        const sillM = mesh(new THREE.BoxGeometry(len + WALL_T, sill, depth), mats.wall);
        sillM.position.y = SLAB + sill / 2;
        const headM = mesh(new THREE.BoxGeometry(len + WALL_T, head, depth), mats.wall);
        headM.position.y = SLAB + WALL_H - head / 2;
        g.add(sillM, headM);
        const pane = mesh(new THREE.PlaneGeometry(len, gh), mats.facadeGlass, false, false);
        pane.geometry.attributes.uv.array.forEach((v, n, arr) => { arr[n] = n % 2 ? v : v * len / 4; });
        pane.position.set(0, SLAB + sill + gh / 2, -0.04);
        g.add(pane);
        const bay = 1.5, n = Math.max(1, Math.round(len / bay));
        for (let k = 0; k <= n; k++) {
            const major = k % 2 === 0;
            const w = major ? 0.16 : 0.07;
            const m = mesh(new THREE.BoxGeometry(w, gh, major ? depth : 0.22), mats.mullion);
            m.position.set(-len / 2 + (k * len) / n, SLAB + sill + gh / 2, major ? 0 : -0.02);
            g.add(m);
        }
        const transom = mesh(new THREE.BoxGeometry(len, 0.07, 0.22), mats.mullion);
        transom.position.set(0, SLAB + sill + gh * 0.8, -0.02);
        g.add(transom);
        g.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
        g.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
        return g;
    }
    const PERSON_BODY = new THREE.CapsuleGeometry(0.17, 0.95, 3, 8);
    const PERSON_HEAD = new THREE.SphereGeometry(0.13, 10, 8);
    function person(mats, s = 1) {
        const p = new THREE.Group();
        const body = mesh(PERSON_BODY, mats.white, false, false);
        body.position.y = 0.66 * s;
        const head = mesh(PERSON_HEAD, mats.white, false, false);
        head.position.y = 1.5 * s;
        p.add(body, head);
        return p;
    }

    const desk = [
        [0.18, 0.18, 0.64, 0.3, 20, 0, 'wood'],
        [0.34, 0.2, 0.32, 0.05, 22, 20, 'screen'],
        [0.4, 0.58, 0.2, 0.16, 12, 0, 'accent'],
        [0.4, 0.74, 0.2, 0.04, 28, 0, 'accent']
    ];
    const plant = [
        [0.84, 0.1, 0.09, 0.09, 12, 0, 'pot'],
        [0.82, 0.08, 0.13, 0.13, 16, 12, 'plant']
    ];
    const chairs = (y) => [0.24, 0.42, 0.6].map(x => [x, y, 0.12, 0.1, 10, 0, 'accent']);
    // Un espace différent par compétence, comme les zones d'un plan (café, agora, accueil…).
    const ZONE_KINDS = {
        // Langages
        openspace: [
            [0.08, 0.2, 0.84, 0.22, 18, 0, 'wood'],
            [0.14, 0.22, 0.16, 0.04, 18, 18, 'screen'],
            [0.42, 0.22, 0.16, 0.04, 18, 18, 'screen'],
            [0.7, 0.22, 0.16, 0.04, 18, 18, 'screen'],
            ...chairs(0.56).map(([x, ...r]) => [x - 0.06, ...r]),
            [0.84, 0.56, 0.09, 0.1, 10, 0, 'accent']
        ],
        labo: [
            [0.08, 0.1, 0.12, 0.2, 46, 0, 'rack'],
            [0.08, 0.34, 0.12, 0.2, 46, 0, 'rack'],
            [0.08, 0.58, 0.12, 0.2, 46, 0, 'rack'],
            [0.42, 0.3, 0.44, 0.24, 18, 0, 'wood'],
            [0.52, 0.32, 0.24, 0.05, 20, 18, 'screen'],
            [0.58, 0.66, 0.12, 0.12, 12, 0, 'accent']
        ],
        tableur: [
            [0.1, 0.06, 0.8, 0.04, 34, 10, 'screen'],
            [0.22, 0.42, 0.56, 0.24, 18, 0, 'wood'],
            [0.4, 0.44, 0.2, 0.04, 16, 18, 'screen'],
            [0.44, 0.74, 0.12, 0.12, 12, 0, 'accent'],
            ...plant
        ],
        electronique: [
            [0.1, 0.12, 0.8, 0.26, 20, 0, 'wood'],
            [0.18, 0.18, 0.12, 0.1, 8, 20, 'rack'],
            [0.38, 0.16, 0.2, 0.14, 4, 20, 'accent'],
            [0.66, 0.16, 0.1, 0.12, 12, 20, 'white'],
            [0.3, 0.52, 0.12, 0.12, 12, 0, 'accent'],
            [0.6, 0.52, 0.12, 0.12, 12, 0, 'accent'],
            [0.82, 0.66, 0.12, 0.24, 30, 0, 'white']
        ],
        // Bureautique & Data
        archives: [
            [0.06, 0.08, 0.1, 0.84, 40, 0, 'white'],
            [0.22, 0.08, 0.1, 0.84, 40, 0, 'white'],
            [0.5, 0.3, 0.4, 0.24, 18, 0, 'wood'],
            [0.6, 0.32, 0.2, 0.04, 16, 18, 'screen'],
            [0.64, 0.64, 0.12, 0.12, 12, 0, 'accent']
        ],
        dashboards: [
            [0.08, 0.06, 0.38, 0.04, 30, 12, 'screen'],
            [0.54, 0.06, 0.38, 0.04, 30, 12, 'screen'],
            [0.18, 0.52, 0.64, 0.14, 12, 0, 'white'],
            [0.18, 0.66, 0.64, 0.08, 22, 0, 'white'],
            [0.38, 0.3, 0.24, 0.12, 7, 0, 'wood'],
            [0.06, 0.4, 0.1, 0.12, 10, 0, 'accent']
        ],
        accueil: [
            [0.22, 0.3, 0.52, 0.12, 22, 0, 'white'],
            [0.22, 0.42, 0.12, 0.3, 22, 0, 'white'],
            [0.44, 0.32, 0.14, 0.04, 14, 22, 'screen'],
            [0.5, 0.18, 0.12, 0.1, 12, 0, 'accent'],
            ...plant
        ],
        planning: [
            [0.1, 0.06, 0.8, 0.03, 28, 8, 'board'],
            [0.2, 0.36, 0.6, 0.28, 16, 0, 'wood'],
            ...chairs(0.22).map(([x, ...r]) => [x + 0.02, ...r]),
            ...chairs(0.7).map(([x, ...r]) => [x + 0.02, ...r])
        ],
        // Logiciels métier
        dessin: [
            [0.1, 0.16, 0.34, 0.26, 22, 0, 'white'],
            [0.12, 0.18, 0.3, 0.22, 3, 22, 'board'],
            [0.56, 0.16, 0.34, 0.26, 22, 0, 'white'],
            [0.58, 0.18, 0.3, 0.22, 3, 22, 'board'],
            [0.22, 0.54, 0.1, 0.1, 14, 0, 'accent'],
            [0.68, 0.54, 0.1, 0.1, 14, 0, 'accent'],
            ...plant.map(([x, y, ...r]) => [x, y + 0.7, ...r])
        ],
        maquette: [
            [0.12, 0.22, 0.76, 0.46, 18, 0, 'wood'],
            [0.3, 0.3, 0.2, 0.26, 26, 18, 'white'],
            [0.5, 0.36, 0.16, 0.18, 14, 18, 'accent'],
            [0.68, 0.32, 0.1, 0.12, 34, 18, 'white'],
            [0.42, 0.76, 0.14, 0.12, 14, 0, 'accent'],
            ...plant
        ],
        metre: [
            [0.1, 0.1, 0.5, 0.26, 18, 0, 'wood'],
            [0.16, 0.14, 0.3, 0.16, 2, 18, 'board'],
            [0.7, 0.08, 0.2, 0.3, 36, 0, 'white'],
            [0.14, 0.5, 0.06, 0.3, 6, 0, 'white'],
            [0.24, 0.5, 0.06, 0.3, 6, 0, 'white'],
            [0.5, 0.56, 0.12, 0.12, 12, 0, 'accent']
        ],
        projection: [
            [0.1, 0.06, 0.8, 0.04, 36, 10, 'screen'],
            ...chairs(0.4),
            ...chairs(0.58),
            ...chairs(0.76),
            [0.8, 0.5, 0.08, 0.08, 20, 0, 'rack']
        ],
        // Création & Médias
        montage: [
            [0.14, 0.2, 0.72, 0.26, 20, 0, 'wood'],
            [0.24, 0.22, 0.22, 0.04, 20, 20, 'screen'],
            [0.54, 0.22, 0.22, 0.04, 20, 20, 'screen'],
            [0.06, 0.22, 0.06, 0.1, 22, 0, 'rack'],
            [0.88, 0.22, 0.06, 0.1, 22, 0, 'rack'],
            [0.44, 0.6, 0.12, 0.12, 12, 0, 'accent']
        ],
        motion: [
            [0.1, 0.12, 0.42, 0.28, 18, 0, 'wood'],
            [0.18, 0.14, 0.26, 0.04, 18, 18, 'screen'],
            [0.2, 0.26, 0.2, 0.1, 2, 18, 'board'],
            [0.24, 0.56, 0.12, 0.12, 12, 0, 'accent'],
            [0.64, 0.5, 0.26, 0.3, 8, 0, 'accent'],
            ...plant
        ],
        photo: [
            [0.2, 0.06, 0.6, 0.04, 40, 0, 'board'],
            [0.2, 0.1, 0.6, 0.4, 1, 0, 'board'],
            [0.44, 0.24, 0.12, 0.12, 12, 0, 'accent'],
            [0.08, 0.5, 0.04, 0.04, 34, 0, 'rack'],
            [0.05, 0.47, 0.1, 0.1, 10, 34, 'white'],
            [0.86, 0.5, 0.04, 0.04, 34, 0, 'rack'],
            [0.83, 0.47, 0.1, 0.1, 10, 34, 'white'],
            [0.46, 0.76, 0.06, 0.06, 20, 0, 'rack']
        ],
        streaming: [
            [0.14, 0.12, 0.6, 0.26, 20, 0, 'wood'],
            [0.24, 0.14, 0.4, 0.04, 22, 20, 'screen'],
            [0.36, 0.5, 0.14, 0.14, 14, 0, 'accent'],
            [0.36, 0.64, 0.14, 0.04, 30, 0, 'accent'],
            [0.82, 0.3, 0.04, 0.04, 30, 0, 'rack'],
            [0.78, 0.26, 0.12, 0.12, 4, 30, 'accent']
        ],
        // Soft Skills
        direction: [
            [0.18, 0.18, 0.64, 0.3, 20, 0, 'wood'],
            [0.42, 0.06, 0.16, 0.1, 22, 0, 'accent'],
            [0.26, 0.6, 0.14, 0.12, 12, 0, 'white'],
            [0.6, 0.6, 0.14, 0.12, 12, 0, 'white'],
            ...plant
        ],
        agora: [
            [0.06, 0.06, 0.88, 0.2, 24, 0, 'white'],
            [0.06, 0.26, 0.88, 0.2, 14, 0, 'white'],
            [0.06, 0.46, 0.88, 0.18, 6, 0, 'white'],
            [0.4, 0.74, 0.2, 0.14, 16, 0, 'accent']
        ],
        creatif: [
            [0.1, 0.06, 0.8, 0.03, 26, 8, 'board'],
            [0.14, 0.38, 0.24, 0.22, 10, 0, 'accent'],
            [0.56, 0.5, 0.24, 0.22, 10, 0, 'accent'],
            [0.36, 0.7, 0.18, 0.16, 8, 0, 'wood']
        ],
        flex: [
            [0.12, 0.14, 0.18, 0.18, 30, 0, 'white'],
            [0.62, 0.14, 0.18, 0.18, 30, 0, 'white'],
            [0.38, 0.56, 0.18, 0.18, 30, 0, 'white'],
            [0.82, 0.7, 0.1, 0.1, 10, 0, 'accent']
        ],
        warroom: [
            [0.06, 0.06, 0.88, 0.03, 30, 6, 'board'],
            [0.24, 0.34, 0.52, 0.34, 16, 0, 'wood'],
            [0.1, 0.42, 0.1, 0.16, 12, 0, 'accent'],
            [0.8, 0.42, 0.1, 0.16, 12, 0, 'accent'],
            [0.44, 0.78, 0.12, 0.1, 12, 0, 'accent']
        ],
        scrum: [
            [0.06, 0.06, 0.88, 0.03, 32, 4, 'kanban'],
            [0.26, 0.44, 0.1, 0.1, 10, 0, 'accent'],
            [0.46, 0.36, 0.1, 0.1, 10, 0, 'accent'],
            [0.64, 0.44, 0.1, 0.1, 10, 0, 'accent'],
            [0.36, 0.64, 0.1, 0.1, 10, 0, 'accent'],
            [0.56, 0.64, 0.1, 0.1, 10, 0, 'accent']
        ],
        securite: [
            [0.08, 0.1, 0.24, 0.24, 26, 0, 'rack'],
            [0.44, 0.2, 0.46, 0.24, 18, 0, 'wood'],
            [0.52, 0.22, 0.14, 0.04, 16, 18, 'screen'],
            [0.7, 0.22, 0.14, 0.04, 16, 18, 'screen'],
            [0.62, 0.58, 0.12, 0.12, 12, 0, 'accent']
        ],
        strategie: [
            [0.06, 0.06, 0.03, 0.8, 30, 6, 'board'],
            [0.3, 0.24, 0.36, 0.36, 14, 0, 'wood'],
            [0.42, 0.36, 0.12, 0.12, 6, 14, 'accent'],
            [0.76, 0.3, 0.12, 0.12, 12, 0, 'accent'],
            [0.42, 0.72, 0.12, 0.12, 12, 0, 'accent']
        ]
    };
    // Espaces de chaque étage, dans l'ordre des compétences.
    // Associés par nom d'étage : l'ordre des étages se règle dans skills.html.
    const FLOOR_ZONES = {
        'Langages': ['openspace', 'labo', 'tableur', 'electronique'],
        'Bureautique & Data': ['archives', 'dashboards', 'accueil', 'planning'],
        'Logiciels métier': ['dessin', 'maquette', 'metre', 'projection'],
        'Création & Médias': ['montage', 'motion', 'photo', 'streaming'],
        'Soft Skills': ['direction', 'agora', 'creatif', 'flex', 'warroom', 'scrum', 'securite', 'strategie']
    };
    const DEFAULT_ZONES = Object.values(FLOOR_ZONES).flat();

    // Découpages de plateau [x, y, largeur, profondeur] en fraction, façon plan d'architecte.
    const LAYOUTS_4 = [
        [[0, 0, 0.4, 0.56], [0.4, 0, 0.6, 0.44], [0, 0.56, 0.58, 0.44], [0.58, 0.44, 0.42, 0.56]],
        [[0, 0, 0.6, 0.5], [0.6, 0, 0.4, 0.5], [0, 0.5, 0.35, 0.5], [0.35, 0.5, 0.65, 0.5]],
        [[0, 0, 0.3, 1], [0.3, 0, 0.7, 0.42], [0.3, 0.42, 0.35, 0.58], [0.65, 0.42, 0.35, 0.58]],
        [[0, 0, 0.5, 0.6], [0.5, 0, 0.5, 0.38], [0.5, 0.38, 0.5, 0.62], [0, 0.6, 0.5, 0.4]]
    ];
    function zoneLayout(n, floorIndex) {
        if (n === 4) return LAYOUTS_4[floorIndex % LAYOUTS_4.length];
        if (n === 8) return [
            [0, 0, 0.22, 0.5], [0.22, 0, 0.3, 0.46], [0.52, 0, 0.2, 0.5], [0.72, 0, 0.28, 0.46],
            [0, 0.5, 0.3, 0.5], [0.3, 0.46, 0.22, 0.54], [0.52, 0.5, 0.26, 0.5], [0.78, 0.46, 0.22, 0.54]
        ];
        const rows = n > 3 ? 2 : 1, cols = Math.ceil(n / rows);
        return Array.from({ length: n }, (_, k) => [(k % cols) / cols, Math.floor(k / cols) / rows, 1 / cols, 1 / rows]);
    }

    // ---------------------------------------------------------------- Bâtiment
    const building = new THREE.Group();
    building.position.copy(OFFSET);
    scene.add(building);

    const MAT_OF = { screen: 'screen', rack: 'screen', wood: 'wood' };
    // Le mobilier d'un espace est un module d'environ 5 × 4 m, répété pour remplir la zone :
    // des objets à taille réelle, nombreux et serrés, comme sur la maquette de référence.
    const MOD_W = 7.5, MOD_D = 6.2, HK = 0.04;
    function furnish(group, kind, mats, x0, z0, rw, rd) {
        const nx = Math.max(1, Math.round(rw / MOD_W)), nz = Math.max(1, Math.round(rd / MOD_D));
        const mw = rw / nx, md = rd / nz, pad = 0.9;
        const cw = mw - pad * 2, cd = md - pad * 2;
        for (let ix = 0; ix < nx; ix++) {
            for (let iz = 0; iz < nz; iz++) {
                const ox = x0 + ix * mw + pad, oz = z0 + iz * md + pad;
                for (const [fx, fy, fw, fd, h, z, mat] of kind) {
                    const w = Math.max(0.12, fw * cw), d = Math.max(0.12, fd * cd), hh = h * HK;
                    const m = rbox(w, hh, d, mats[MAT_OF[mat] || 'white'], mat === 'plant' ? 0.2 : 0.05);
                    m.position.set(ox + fx * cw + w / 2, SLAB + z * HK + hh / 2, oz + fy * cd + d / 2);
                    group.add(m);
                }
            }
        }
        return { nx, nz, mw, md };
    }

    // Personnages qui se déplacent : ils marchent d'un carrefour à l'autre dans les allées
    // laissées libres entre les modules de mobilier, donc sans traverser les meubles.
    function walkers(group, mats, x0, z0, rw, rd, { nx, nz, mw, md }) {
        const m = 0.45;
        const node = (ix, iz) => new THREE.Vector2(
            THREE.MathUtils.clamp(x0 + ix * mw, x0 + m, x0 + rw - m),
            THREE.MathUtils.clamp(z0 + iz * md, z0 + m, z0 + rd - m));
        const count = Math.min(3, Math.max(1, Math.round(nx * nz * 0.8)));
        return Array.from({ length: count }, (_, n) => {
            const p = person(mats);
            const at = [(n * 2) % (nx + 1), (n + 1) % (nz + 1)];
            const pos = node(...at);
            p.position.set(pos.x, SLAB, pos.y);
            group.add(p);
            return { p, at, prev: null, from: pos.clone(), to: pos.clone(), t: 1, len: 0, speed: 0.9 + Math.random() * 0.4, wait: Math.random() * 2, node, nx, nz };
        });
    }
    function stepWalker(w, dt) {
        if (w.wait > 0) { w.wait -= dt; return; }
        if (w.t >= 1) {
            // Carrefour voisin au hasard, en évitant de revenir sur ses pas.
            const [ix, iz] = w.at;
            const options = [[ix + 1, iz], [ix - 1, iz], [ix, iz + 1], [ix, iz - 1]]
                .filter(([a, b]) => a >= 0 && b >= 0 && a <= w.nx && b <= w.nz)
                .filter(([a, b]) => !w.prev || a !== w.prev[0] || b !== w.prev[1]);
            const next = options[Math.floor(Math.random() * options.length)] || w.prev;
            w.prev = w.at; w.at = next;
            w.from.copy(w.to); w.to = w.node(...next);
            w.len = Math.max(0.01, w.from.distanceTo(w.to));
            w.t = 0;
            if (Math.random() < 0.25) w.wait = 1 + Math.random() * 2;
            w.p.rotation.y = Math.atan2(w.to.x - w.from.x, w.to.y - w.from.y);
        }
        w.t = Math.min(1, w.t + (w.speed * dt) / w.len);
        w.p.position.x = w.from.x + (w.to.x - w.from.x) * w.t;
        w.p.position.z = w.from.y + (w.to.y - w.from.y) * w.t;
        w.p.position.y = SLAB + Math.abs(Math.sin(w.t * w.len * 3.2)) * 0.04;
    }

    // Noyau de circulation : ascenseur vitré et escalier à deux volées avec palier.
    function circulation(mats) {
        const c = new THREE.Group();
        const X = 4.1, Z = 0.75;
        // Ascenseur : gaine vitrée, cabine blanche, montants d'angle et porte.
        const shaft = mesh(new THREE.BoxGeometry(2.3, WALL_H, 2.3), mats.glass, false, false);
        shaft.position.set(X + 1.15, SLAB + WALL_H / 2, Z + 1.15);
        c.add(shaft);
        const cabin = rbox(1.7, 1.5, 1.7, mats.white, 0.06);
        cabin.position.set(X + 1.15, SLAB + 1.1, Z + 1.15);
        c.add(cabin);
        for (const [dx, dz] of [[0, 0], [2.3, 0], [0, 2.3], [2.3, 2.3]]) {
            const post = mesh(new THREE.BoxGeometry(0.12, WALL_H, 0.12), mats.frame);
            post.position.set(X + dx, SLAB + WALL_H / 2, Z + dz);
            c.add(post);
        }
        const door = mesh(new THREE.BoxGeometry(1.1, 2.0, 0.08), mats.screen);
        door.position.set(X + 1.15, SLAB + 1.0, Z + 2.34);
        c.add(door);
        return c;
    }

    // ---- Escalier à deux volées droites et palier intermédiaire (escalier « à l'anglaise »).
    // Hauteur d'étage à franchir H = 3,00 m → 18 contremarches de 16,7 cm, 9 par volée ;
    // 8 marches de 29 cm par volée (giron), soit 2h + g = 62 cm (formule de Blondel).
    const ST = (() => {
        const risers = Math.round(H / 0.17), r = H / risers, per = risers / 2, run = 0.29, w = 1.1, gap = 0.12;
        const X = 4.1, Z0 = 4.3, L = (per - 1) * run, landD = 1.2;
        const pitch = Math.atan2(r, run), d = 0.2 / Math.cos(pitch); // paillasse de 20 cm
        return { risers, r, per, run, w, gap, X, Z0, L, landD, d, XB: X + w + gap, X1: X + 2 * w + gap, Z1: Z0 + L + landD };
    })();
    // Trémie : ouverture dans la dalle des étages au-dessus du rez-de-chaussée.
    const holeShape = footShape.clone();
    holeShape.holes.push(new THREE.Path([
        new THREE.Vector2(ST.X, -ST.Z0), new THREE.Vector2(ST.X, -ST.Z1),
        new THREE.Vector2(ST.X1, -ST.Z1), new THREE.Vector2(ST.X1, -ST.Z0)
    ]));
    const SLAB_HOLE_GEO = new THREE.ExtrudeGeometry(holeShape, { depth: SLAB, bevelEnabled: false }).rotateX(-Math.PI / 2);

    // Prisme : polygone dans le plan (z, y) extrudé selon x, de x0 à x0 + t.
    function prism(pts, x0, t, mat, cast = true) {
        const shape = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
        const geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false });
        geo.rotateY(-Math.PI / 2);
        geo.translate(x0 + t, 0, 0);
        return mesh(geo, mat, cast, true);
    }

    // Escalier montant d'un niveau (base = sol fini de l'étage), avec mur d'échiffre et garde-corps.
    function stair(mats, base) {
        const { r, per, run, w, X, XB, X1, Z0, L, landD, d, Z1 } = ST;
        const g = new THREE.Group();
        const B2 = base + per * r, Btop = base + 2 * per * r;
        // Volée 1 (côté A) : de Z0 vers le palier, contremarches régulières, sous-face inclinée.
        const a = [[Z0, base]];
        for (let k = 0; k < per; k++) {
            const z = Z0 + k * run;
            a.push([z, base + (k + 1) * r]);
            if (k < per - 1) a.push([z + run, base + (k + 1) * r]);
        }
        const soffitA = (z) => base + r + ((z - Z0) * r) / run - d;
        a.push([Z0 + L, soffitA(Z0 + L)], [Z0 + ((d - r) * run) / r, base]);
        g.add(prism(a, X, w, mats.white));
        // Palier intermédiaire.
        g.add(prism([[Z0 + L, B2 - d], [Z0 + L, B2], [Z1, B2], [Z1, B2 - d]], X, X1 - X, mats.white));
        // Volée 2 (côté B) : du palier vers Z0, arrive exactement au sol fini de l'étage supérieur.
        const b = [[Z0 + L + run, B2]];
        b.push([Z0 + L, B2]);
        for (let k = 0; k < per; k++) {
            const z = Z0 + L - k * run;
            b.push([z, B2 + (k + 1) * r]);
            if (k < per - 1) b.push([z - run, B2 + (k + 1) * r]);
        }
        b.push([Z0, Btop - d], [Z0 + L + run, B2 - d]);
        g.add(prism(b, XB, w, mats.white));
        // Garde-corps : limon plein, vitrage et main courante parallèles à la pente.
        const nosA = (z) => base + r + ((z - Z0) * r) / run;
        const nosB = (z) => B2 + r + ((Z0 + L - z) * r) / run;
        const rail = (x, za, ya, zb, yb, bottomA, bottomB) => {
            g.add(prism([[za, bottomA], [za, ya + 0.15], [zb, yb + 0.15], [zb, bottomB]], x, 0.06, mats.white));
            g.add(prism([[za, ya + 0.15], [za, ya + 0.95], [zb, yb + 0.95], [zb, yb + 0.15]], x, 0.03, mats.glass, false));
            g.add(prism([[za, ya + 0.95], [za, ya + 1.0], [zb, yb + 1.0], [zb, yb + 0.95]], x - 0.01, 0.08, mats.white));
        };
        rail(X - 0.06, Z0, nosA(Z0), Z0 + L, nosA(Z0 + L), base, B2 - d);
        rail(X1, Z0 + L, nosB(Z0 + L), Z0, nosB(Z0), B2 - d, Btop - d);
        // Côté jour (entre les volées) : garde-corps sur chaque volée.
        rail(X + w - 0.06, Z0, nosA(Z0), Z0 + L, nosA(Z0 + L), base, B2 - d);
        rail(XB, Z0 + L, nosB(Z0 + L), Z0, nosB(Z0), B2 - d, Btop - d);
        // Palier : garde-corps sur ses trois côtés libres.
        rail(X - 0.06, Z0 + L, B2, Z1, B2, B2 - d, B2 - d);
        rail(X1, Z0 + L, B2, Z1, B2, B2 - d, B2 - d);
        const back = mesh(new THREE.BoxGeometry(X1 - X + 0.12, 0.15 + d, 0.06), mats.white);
        back.position.set((X + X1) / 2, B2 - d + (0.15 + d) / 2, Z1 + 0.03);
        const backGlass = mesh(new THREE.BoxGeometry(X1 - X + 0.12, 0.8, 0.03), mats.glass, false, false);
        backGlass.position.set((X + X1) / 2, B2 + 0.55, Z1 + 0.03);
        const backRail = mesh(new THREE.BoxGeometry(X1 - X + 0.12, 0.05, 0.08), mats.white);
        backRail.position.set((X + X1) / 2, B2 + 0.975, Z1 + 0.03);
        g.add(back, backGlass, backRail);
        return g;
    }

    // Garde-corps autour de la trémie du dernier étage (pas de volée au-dessus), sauf l'arrivée.
    function wellGuard(mats) {
        const g = new THREE.Group();
        const { X, X1, Z0, Z1, XB } = ST;
        const y = SLAB;
        const seg = (x1, z1, x2, z2) => {
            const len = Math.hypot(x2 - x1, z2 - z1), rot = -Math.atan2(z2 - z1, x2 - x1);
            for (const [h, yy, t, mat] of [[0.8, y + 0.55, 0.03, mats.glass], [0.05, y + 0.975, 0.08, mats.white], [0.15, y + 0.075, 0.06, mats.white]]) {
                const m = mesh(new THREE.BoxGeometry(len, h, t), mat, mat !== mats.glass, false);
                m.position.set((x1 + x2) / 2, yy, (z1 + z2) / 2);
                m.rotation.y = rot;
                g.add(m);
            }
        };
        seg(X, Z0, XB, Z0);
        seg(X, Z0, X, Z1);
        seg(X, Z1, X1, Z1);
        seg(X1, Z1, X1, Z0);
        return g;
    }

    // Fusionne les meshes statiques d'un groupe par matériau : quelques appels de dessin
    // par étage au lieu de plusieurs centaines (rendu, ombres et occlusion ambiante).
    const inv = new THREE.Matrix4(), rel = new THREE.Matrix4();
    function bake(group, skip) {
        group.updateMatrixWorld(true);
        inv.copy(group.matrixWorld).invert();
        const buckets = new Map(), done = [];
        group.traverse(o => {
            if (!o.isMesh || skip(o) || o.material.transparent) return;
            rel.multiplyMatrices(inv, o.matrixWorld);
            let geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
            for (const name of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(name)) geo.deleteAttribute(name);
            geo.clearGroups();
            geo.applyMatrix4(rel);
            const key = o.material.uuid + o.castShadow + o.receiveShadow;
            if (!buckets.has(key)) buckets.set(key, { mat: o.material, cast: o.castShadow, receive: o.receiveShadow, geos: [] });
            buckets.get(key).geos.push(geo);
            done.push(o);
        });
        done.forEach(o => o.removeFromParent());
        for (const b of buckets.values()) group.add(mesh(mergeGeometries(b.geos), b.mat, b.cast, b.receive));
    }

    const floorObjs = floors.map((f, i) => {
        const mats = makeMaterials();
        const g = new THREE.Group();
        g.position.y = i * H;
        building.add(g);

        g.add(mesh(i === 0 ? SLAB_GEO : SLAB_HOLE_GEO, mats.slab));
        // Escalier montant (sauf au dernier étage) et, vue isolée d'un étage, la volée qui
        // arrive de l'étage inférieur, visible dans la trémie.
        const top = i === floors.length - 1;
        if (!top) g.add(stair(mats, SLAB));
        else g.add(wellGuard(mats));
        let down = null;
        if (i > 0) {
            down = stair(mats, SLAB - H);
            const well = mesh(new THREE.BoxGeometry(ST.X1 - ST.X, SLAB, ST.Z1 - ST.Z0), mats.slab);
            well.position.set((ST.X + ST.X1) / 2, SLAB / 2 - H, (ST.Z0 + ST.Z1) / 2);
            down.add(well);
            down.visible = false;
            g.add(down);
        }
        // Murs périphériques ; le pignon droit est vitré.
        FOOT.forEach((p, k) => {
            const q = FOOT[(k + 1) % FOOT.length];
            if (p[0] === LEN && q[0] === LEN) g.add(glazing(p, q, mats));
            else if (p[1] === DEP && q[1] === DEP) {
                // Façade avant : partie vitrée côté pignon, comme la vitrine de la référence.
                g.add(glazing([LEN, DEP], [GLASS_X, DEP], mats));
                g.add(wallBetween([GLASS_X, DEP], q, WALL_H, WALL_T, mats.wall));
            } else g.add(wallBetween(p, q, WALL_H, WALL_T, mats.wall));
        });
        g.add(circulation(mats));
        // Habillage en lattes de bois sur le mur du fond, comme sur la maquette.
        const slatLen = LEN - 8.2;
        const tex = SLAT.clone();
        tex.needsUpdate = true;
        tex.repeat.set(slatLen / 2.2, 1);
        const slatMat = mats.slat.clone();
        slatMat.map = tex;
        mats.slat = slatMat;
        const slat = mesh(new THREE.PlaneGeometry(slatLen, WALL_H - 0.05), slatMat, false, true);
        slat.position.set(7.4 + slatLen / 2, SLAB + WALL_H / 2, WALL_T / 2 + 0.02);
        g.add(slat);

        // Zones : une compétence par zone. L'intérieur est masqué quand un étage le recouvre.
        const inner = new THREE.Group();
        g.add(inner);
        const layout = zoneLayout(f.skills.length, i);
        const seq = FLOOR_ZONES[f.title] || DEFAULT_ZONES;
        const iw = INNER.x1 - INNER.x0, id = INNER.z1 - INNER.z0;
        const zoneWalkers = [];
        const zones = f.skills.map((s, k) => {
            const [fx, fz, fw, fd] = layout[k];
            const x0 = INNER.x0 + fx * iw, z0 = INNER.z0 + fz * id, rw = fw * iw, rd = fd * id;
            const zmat = std(ZONE_COLORS[k % ZONE_COLORS.length]);
            const floor = mesh(new THREE.BoxGeometry(rw - 0.12, 0.03, rd - 0.12), zmat, false, true);
            floor.position.set(x0 + rw / 2, SLAB + 0.015, z0 + rd / 2);
            floor.userData = { floor: i, zone: k, base: zmat.color.clone() };
            inner.add(floor);
            // Cloisons basses sur les limites intérieures, avec un passage.
            if (fx > 0.01) inner.add(wallBetween([x0, z0 + rd * 0.4], [x0, z0 + rd], 1.15, 0.14, mats.wall));
            if (fz > 0.01) inner.add(wallBetween([x0 + rw * 0.42, z0], [x0 + rw, z0], 1.15, 0.14, mats.wall));
            const kind = seq[k % seq.length];
            const grid = furnish(inner, ZONE_KINDS[kind], mats, x0, z0, rw, rd);
            zoneWalkers.push(...walkers(inner, mats, x0, z0, rw, rd, grid));
            // Colonne vitrée à l'angle des zones du fond, comme les colonnes de verre de la référence.
            if (fx > 0.01 && fz < 0.01) {
                const col = mesh(new THREE.CylinderGeometry(0.42, 0.42, WALL_H, 24), mats.glass, false, false);
                col.position.set(x0, SLAB + WALL_H / 2, z0 + rd * 0.2);
                inner.add(col);
            }
            return { skill: s, floor, x: x0 + rw / 2, z: z0 + rd / 2, back: fz < 0.01 };
        });

        const zoneFloors = new Set(zones.map(z => z.floor));
        const moving = new Set(zoneWalkers.flatMap(w => w.p.children));
        const within = (o, root) => { for (let x = o; x; x = x.parent) if (x === root) return true; return false; };
        // Les personnages restent des objets séparés : sinon, fusionnés, ils ne bougent plus.
        bake(inner, o => zoneFloors.has(o) || moving.has(o));
        if (down) bake(down, () => false);
        bake(g, o => within(o, inner) || (down && within(o, down)));

        const list = new Set();
        g.traverse(o => { if (o.material) list.add(o.material); });
        return { group: g, inner, down, mats: [...list], zones, walkers: zoneWalkers, lift: 0, opacity: 1 };
    });


    // ---------------------------------------------------------------- Post-traitement
    let composer = null, ao = null;
    if (!LITE) {
        composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        ao = new GTAOPass(scene, camera, 1, 1);
        ao.output = GTAOPass.OUTPUT.Default;
        ao.blendIntensity = 1;
        ao.updateGtaoMaterial({ radius: 0.9, distanceExponent: 1.4, thickness: 1.2, scale: 1, samples: 12 });
        ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 8 });
        composer.addPass(ao);
        composer.addPass(new OutputPass());
    }

    // ---------------------------------------------------------------- Caméra et rendu
    let width = 1, height = 1, dirty = true;
    const invalidate = () => { dirty = true; };
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), camDir).normalize();
    const cam = { target: new THREE.Vector3(0, 8, 0), zoom: 0.9, shift: 0 };

    // ?cam=azimut,élévation,demi-hauteur : vue de contrôle rapprochée sur l'escalier.
    const camParam = new URLSearchParams(location.search).get('cam');
    function updateCamera() {
        const aspect = width / height;
        if (camParam && current >= 0) {
            const [az, el, half, clip = 400] = camParam.split(',').map(Number);
            camera.near = 150 - clip;
            const A = THREE.MathUtils.degToRad(az), E = THREE.MathUtils.degToRad(el);
            const dir = new THREE.Vector3(Math.sin(A) * Math.cos(E), Math.sin(E), Math.cos(A) * Math.cos(E));
            camera.left = -half * aspect; camera.right = half * aspect; camera.top = half; camera.bottom = -half;
            camera.updateProjectionMatrix();
            const t = new THREE.Vector3((ST.X + ST.X1) / 2, SLAB + 1.6, (ST.Z0 + ST.Z1) / 2).add(building.position);
            t.y += floorObjs[current].group.position.y;
            camera.position.copy(t).addScaledVector(dir, 150);
            camera.lookAt(t);
            return;
        }
        const mobile = width < 700;
        const half = (mobile ? Math.max(24, 24 / aspect) : Math.max(24, 34 / aspect)) / cam.zoom;
        camera.left = -half * aspect; camera.right = half * aspect;
        camera.top = half; camera.bottom = -half;
        camera.updateProjectionMatrix();
        // Décalage vers la droite pour laisser la place au titre, comme sur la référence.
        const t = cam.target.clone().addScaledVector(right, mobile ? 0 : -cam.shift * half * aspect);
        camera.position.copy(t).addScaledVector(camDir, 150);
        camera.lookAt(t);
    }

    function resize() {
        const r = root.getBoundingClientRect();
        width = Math.max(1, r.width); height = Math.max(1, r.height);
        renderer.setSize(width, height);
        if (composer) {
            composer.setSize(width, height);
            ao.setSize(width * renderer.getPixelRatio(), height * renderer.getPixelRatio());
        }
        invalidate();
    }
    new ResizeObserver(resize).observe(root);
    resize();

    // ---------------------------------------------------------------- Animations
    // ?instant : sans animation (mouvement réduit, ou captures de contrôle).
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]instant\b/.test(location.search);
    const tweens = new Set();
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    function tween(duration, update, delay = 0) {
        return new Promise(done => {
            const tw = { start: performance.now() + delay, duration: reduced ? 1 : duration, update, done };
            tweens.add(tw);
            invalidate();
        });
    }
    // Renvoie vrai si une animation a avancé : l'image finale est ainsi toujours rendue.
    function stepTweens(now) {
        const active = tweens.size > 0;
        for (const tw of tweens) {
            const t = Math.min(1, Math.max(0, (now - tw.start) / tw.duration));
            if (now < tw.start) continue;
            tw.update(ease(t));
            if (t >= 1) { tweens.delete(tw); tw.done(); }
        }
        return active;
    }

    function setOpacity(obj, o) {
        obj.opacity = o;
        for (const m of obj.mats) {
            const base = m.userData.baseOpacity ?? (m.userData.baseOpacity = m.opacity);
            const transparent = o < 1 || m.userData.baseTransparent || (m.userData.baseTransparent = m.transparent);
            if (m.transparent !== transparent) { m.transparent = transparent; m.needsUpdate = true; }
            m.opacity = base * o;
            m.depthWrite = o >= 1 && !m.userData.noDepth;
        }
        obj.group.visible = o > 0.001;
    }
    floorObjs.forEach(o => o.mats.forEach(m => { m.userData.baseTransparent = m.transparent; m.userData.noDepth = !m.depthWrite; }));

    function animateStack(obj, lift, opacity, delay) {
        const l0 = obj.lift, o0 = obj.opacity, y0 = obj.group.position.y - l0;
        if (opacity > 0) obj.group.visible = true;
        return tween(1100, (t) => {
            obj.lift = l0 + (lift - l0) * t;
            obj.group.position.y = y0 + obj.lift;
            setOpacity(obj, o0 + (opacity - o0) * t);
        }, delay);
    }
    function animateBuilding(y) {
        const y0 = building.position.y;
        return tween(1100, (t) => { building.position.y = y0 + (y - y0) * t; });
    }
    function animateCamera(target, zoom, shift) {
        const t0 = cam.target.clone(), z0 = cam.zoom, s0 = cam.shift;
        return tween(1300, (t) => {
            cam.target.lerpVectors(t0, target, t);
            cam.zoom = z0 + (zoom - z0) * t;
            cam.shift = s0 + (shift - s0) * t;
        });
    }

    // ---------------------------------------------------------------- Titre, repères, fiche
    function setTitle(text, sub) {
        titleEl.innerHTML = [...text.toLowerCase()].map((ch, n) =>
            `<span style="animation-delay:${n * 28}ms">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');
        subEl.textContent = sub;
    }

    let current = -1, selected = -1, pins = [];
    function buildPins(i) {
        pinLayer.innerHTML = '';
        pins = floorObjs[i].zones.map((z, k) => {
            const b = document.createElement('button');
            b.type = 'button';
            // Zones du fond : repère vers le haut ; zones de devant : vers le bas, comme sur la référence.
            b.className = 'sk3d-pin' + (z.back ? '' : ' is-down');
            b.style.setProperty('--line', (z.back ? 110 : 64) + 'px');
            b.style.animationDelay = 250 + k * 70 + 'ms';
            b.setAttribute('aria-label', `${z.skill.name} — ${z.skill.level}`);
            b.innerHTML = `<span class="sk3d-pin__icon"><i class="${z.skill.icon || floors[i].icon}" aria-hidden="true"></i></span>
                <span class="sk3d-pin__label">${z.skill.name}</span>
                <span class="sk3d-pin__line"></span>
                <span class="sk3d-pin__dot"></span>`;
            b.addEventListener('click', () => selectSkill(k));
            b.addEventListener('mouseenter', () => hoverZone(k));
            b.addEventListener('mouseleave', () => hoverZone(-1));
            pinLayer.append(b);
            return { el: b, zone: z };
        });
    }
    const v = new THREE.Vector3();
    function placePins() {
        if (current < 0) return;
        const g = floorObjs[current].group;
        for (const p of pins) {
            v.set(p.zone.x, SLAB + 0.05, p.zone.z).add(building.position);
            v.y += g.position.y;
            v.project(camera);
            p.el.style.setProperty('--x', ((v.x + 1) / 2) * width + 'px');
            p.el.style.setProperty('--y', ((1 - v.y) / 2) * height + 'px');
        }
    }

    // Survol et sélection : la couleur de la zone tirée vers la couleur du site.
    const SITE = new THREE.Color(0xfc3d03);
    let hovered = -1;
    function hoverZone(k) {
        if (current < 0) return;
        floorObjs[current].zones.forEach((z, n) => {
            const on = n === k || n === selected;
            z.floor.material.color.copy(z.floor.userData.base);
            if (on) z.floor.material.color.lerp(SITE, 0.28);
        });
        pins.forEach((p, n) => p.el.classList.toggle('is-hover', n === k));
        hovered = k;
        invalidate();
    }

    // ---------------------------------------------------------------- Panneau des projets liés
    // Les projets sont lus dans projects.html ; une compétence y est liée par mots-clés
    // recherchés dans les étiquettes, le titre et les détails de chaque carte.
    const SKILL_KEYWORDS = {
        'HTML / CSS / JS': ['html', 'css', 'javascript', 'next.js', 'react', 'typescript', 'pwa'],
        'Python': ['python', 'streamlit', 'fastapi'],
        'VBA': ['vba', 'macro'],
        'C': ['c'],
        'Excel': ['excel'],
        'PowerBI': ['powerbi', 'power bi'],
        'Suite Microsoft 365': ['suite office', 'microsoft 365', 'office 365', 'word', 'powerpoint', 'outlook', 'teams'],
        'Ms Project': ['ms project', 'microsoft project'],
        'Revit / Autocad': ['revit', 'autocad'],
        'Navisworks / SketchUp': ['navisworks', 'sketchup'],
        'Devisoc / Kreo': ['devisoc', 'kreo', 'métré'],
        'EveBIM / BIMvision': ['evebim', 'bimvision', 'bim'],
        'Premiere Pro': ['premiere'],
        'After Effects': ['after effects'],
        'Photoshop': ['photoshop'],
        'OBS Studio': ['obs'],
        'Leadership': ['leadership', 'management'],
        'Communication': ['communication', 'formation'],
        'Résolution de problèmes': ['résolution', 'diagnostic'],
        'Adaptabilité': ['adaptabilité'],
        'Gestion de projet': ['gestion de projet', 'management de projet', 'chef de projet'],
        'Agile / Scrum': ['agile', 'scrum'],
        'Gestion des risques': ['risque'],
        'Planification stratégique': ['planification', 'planning']
    };
    let projectsPromise = null;
    function loadProjects() {
        projectsPromise ||= fetch('projects.html')
            .then(r => (r.ok ? r.text() : ''))
            .then(html => [...new DOMParser().parseFromString(html, 'text/html').querySelectorAll('.project__card')].map(c => ({
                id: c.dataset.project,
                category: c.dataset.category,
                title: c.querySelector('.project__title')?.textContent.trim() || '',
                company: c.querySelector('.project__company')?.textContent.trim() || '',
                image: c.querySelector('.project__image')?.getAttribute('src') || '',
                event: c.querySelector('.project__event')?.textContent.trim() || '',
                tags: [...c.querySelectorAll('.tech-tag')].map(t => t.textContent.trim()),
                haystack: [c.querySelector('.project__title'), ...c.querySelectorAll('.tech-tag, .project__detail span')]
                    .map(e => e?.textContent || '').join(' | ').toLowerCase()
            })))
            .catch(() => []);
        return projectsPromise;
    }
    // Expériences et formations (about.html) : liées par les outils listés sur chaque carte.
    let expPromise = null;
    function loadExperiences() {
        expPromise ||= fetch('about.html')
            .then(r => (r.ok ? r.text() : ''))
            .then(html => [...new DOMParser().parseFromString(html, 'text/html').querySelectorAll('[id].experience__card, [id].timeline__item')].map(c => ({
                id: c.id,
                school: c.classList.contains('timeline__item'),
                title: c.querySelector('h5, h4')?.textContent.trim() || '',
                org: c.querySelector('h5 + p, h4 + p')?.textContent.trim() || '',
                period: (c.querySelector('.experience__period, .timeline__year')?.textContent || '').trim(),
                haystack: [...c.querySelectorAll('.experience__tools span:not(.experience__tools-label)')].map(t => t.textContent.toLowerCase()).join(' | ')
            })).filter(e => e.haystack))
            .catch(() => []);
        return expPromise;
    }
    const panel = $('.sk3d-panel'), panelList = $('.sk3d-panel__list');
    const esc = (t) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    // Mot-clé court (≤ 3 lettres) : mot entier, pour éviter les faux positifs.
    const matches = (hay, kw) => kw.length <= 3 ? new RegExp(`(^|[^a-zà-ÿ])${kw}([^a-zà-ÿ]|$)`).test(hay) : hay.includes(kw);
    async function openPanel(skill) {
        $('.sk3d-panel__title').textContent = skill.name;
        $('.sk3d-panel__level').textContent = skill.level;
        panelList.innerHTML = '<p class="sk3d-panel__empty">Chargement…</p>';
        panel.classList.add('is-open');
        panel.setAttribute('aria-hidden', 'false');
        root.classList.add('has-panel');
        const keywords = SKILL_KEYWORDS[skill.name] ?? [skill.name.toLowerCase()];
        const [allProjects, allExps] = await Promise.all([loadProjects(), loadExperiences()]);
        const projects = allProjects.filter(p => keywords.some(k => matches(p.haystack, k)));
        const exps = allExps.filter(e => keywords.some(k => matches(e.haystack, k)));
        if ($('.sk3d-panel__title').textContent !== skill.name) return;
        const locale = document.documentElement.lang || 'fr';
        const expHtml = exps.map(e => `<a class="sk3d-exp" href="about.html#${e.id}">
                <span class="sk3d-exp__icon"><i class="fa-solid ${e.school ? 'fa-graduation-cap' : 'fa-briefcase'}" aria-hidden="true"></i></span>
                <span class="sk3d-proj__body">
                    <span class="sk3d-proj__title">${esc(e.title)}</span>
                    <span class="sk3d-proj__meta">${esc([e.org, e.period].filter(Boolean).join(' · '))}</span>
                </span>
                <i class="fa-solid fa-arrow-right sk3d-proj__go" aria-hidden="true"></i>
            </a>`).join('');
        const projHtml = projects.map(p => {
            return `<a class="sk3d-proj" href="projects.html#project-${p.id}">
                <img class="sk3d-proj__img" src="${esc(p.image)}" alt="" loading="lazy" width="96" height="48">
                <span class="sk3d-proj__body">
                    <span class="sk3d-proj__company">${esc(p.company)}</span>
                    <span class="sk3d-proj__title">${esc(p.title)}</span>
                    <span class="sk3d-proj__meta">${esc(p.event)}</span>
                </span>
                <i class="fa-solid fa-arrow-right sk3d-proj__go" aria-hidden="true"></i>
            </a>`;
        }).join('');
        panelList.innerHTML =
            `<p class="sk3d-panel__section">Projets <span>${projects.length}</span></p>` +
            (projHtml || '<p class="sk3d-panel__empty">Aucun projet lié pour l\'instant.</p>') +
            (exps.length ? `<p class="sk3d-panel__section">Expériences &amp; formations <span>${exps.length}</span></p>${expHtml}` : '');
    }
    function closePanel() {
        panel.classList.remove('is-open');
        panel.setAttribute('aria-hidden', 'true');
        root.classList.remove('has-panel');
    }
    $('.sk3d-panel__close').addEventListener('click', closePanel);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanel(); });

    function selectSkill(k) {
        selected = k;
        const s = floorObjs[current].zones[k].skill;
        openPanel(s);
        pins.forEach((p, n) => p.el.classList.toggle('is-selected', n === k));
        hoverZone(hovered);
        cardEl.hidden = false;
        cardEl.innerHTML = `<p class="sk3d-card__name">${s.name}</p>
            <p class="sk3d-card__level">${s.level}</p>
            <div class="sk3d-card__bar" aria-hidden="true">${[1, 2, 3].map(n => `<span class="${n <= s.rank ? 'on' : ''}"></span>`).join('')}</div>`;
    }

    // ---------------------------------------------------------------- Étages
    const levelBtns = floors.map((f, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = i;
        b.setAttribute('aria-label', `Étage ${i} : ${f.title}`);
        b.addEventListener('click', () => selectFloor(i));
        levelsEl.append(b);
        return b;
    });

    function selectFloor(i) {
        if (i === current) return;
        current = i; selected = -1; hovered = -1;
        cardEl.hidden = true;
        closePanel();
        levelBtns.forEach((b, n) => b.classList.toggle('is-active', n === i));
        root.classList.add('is-level');
        setTitle(floors[i].title, 'sélectionnez une zone');
        // Seul l'étage choisi reste : ceux du dessus s'envolent, ceux du dessous s'enfoncent,
        // en fondu, puis ne sont plus dessinés. Le bâtiment descend pour poser l'étage au sol.
        floorObjs.forEach((o, j) => {
            o.inner.visible = true;
            if (o.down) o.down.visible = j === i;
            o.zones.forEach(z => z.floor.material.color.copy(z.floor.userData.base));
            const lift = j > i ? 40 + (j - i) * 6 : j < i ? -8 - (i - j) * 4 : 0;
            animateStack(o, lift, j === i ? 1 : 0, j > i ? (j - i) * 60 : 0);
        });
        animateBuilding(-i * H);
        animateCamera(new THREE.Vector3(0, -0.5, 0), 1.0, 0.1);
        buildPins(i);
    }

    function showOverview() {
        current = -1; selected = -1;
        pinLayer.innerHTML = ''; pins = [];
        cardEl.hidden = true;
        closePanel();
        levelBtns.forEach(b => b.classList.remove('is-active'));
        root.classList.remove('is-level');
        setTitle('compétences', `${floors.length} étages · ${floors.reduce((a, f) => a + f.skills.length, 0)} zones`);
        // Pas de toit : l'étage du haut reste ouvert ; ceux du dessous, recouverts, ne sont plus dessinés.
        const top = floorObjs.length - 1;
        animateBuilding(0);
        floorObjs.forEach((o, j) => {
            o.inner.visible = true;
            if (o.down) o.down.visible = false;
            const t = animateStack(o, 0, 1, 0);
            if (j === top) t.then(() => { if (current < 0) floorObjs.forEach((f, n) => { f.inner.visible = n === top; }); invalidate(); });
        });
        animateCamera(new THREE.Vector3(0, (floors.length * H) / 2, 0), 0.66, 0.06);
    }
    $('.sk3d-bar__side').addEventListener('click', showOverview);

    // Clic et survol directement sur les zones de la maquette.
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    function pick(e) {
        if (current < 0) return -1;
        const r = renderer.domElement.getBoundingClientRect();
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObjects(floorObjs[current].zones.map(z => z.floor), false)[0];
        return hit ? hit.object.userData.zone : -1;
    }
    renderer.domElement.addEventListener('pointermove', (e) => {
        const k = pick(e);
        if (k !== hovered) hoverZone(k);
        renderer.domElement.style.cursor = k >= 0 ? 'pointer' : '';
    });
    renderer.domElement.addEventListener('click', (e) => { const k = pick(e); if (k >= 0) selectSkill(k); });

    // ---------------------------------------------------------------- Boucle
    // Les personnages de l'étage ouvert marchent en continu (environ 30 images/s) ;
    // sinon, rendu uniquement pendant les transitions.
    let lastWalk = 0, onScreen = true;
    new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; invalidate(); }).observe(root);
    function loop(now) {
        requestAnimationFrame(loop);
        const animating = stepTweens(now);
        let walking = false;
        if (current >= 0 && !reduced && !document.hidden && now - lastWalk > (LITE ? 50 : 40)) {
            const dtw = Math.min(0.1, (now - lastWalk) / 1000);
            lastWalk = now;
            floorObjs[current].walkers.forEach(w => stepWalker(w, dtw));
            walking = true;
        }
        if (!onScreen || (!animating && !dirty && !walking)) return;
        if (animating || dirty) renderer.shadowMap.needsUpdate = true;
        updateCamera();
        if (composer) composer.render(); else renderer.render(scene, camera);
        placePins();
        dirty = false;
    }
    requestAnimationFrame(loop);
    if (/[?&]perf\b/.test(location.search)) window.__sk3dInfo = renderer.info;

    // Arrivée : le bâtiment fermé apparaît, puis l'étage 0 s'ouvre.
    setTitle('compétences', `${floors.length} étages · ${floors.reduce((a, f) => a + f.skills.length, 0)} zones`);
    cam.target.set(0, (floors.length * H) / 2, 0); cam.zoom = 0.6; cam.shift = 0.06;
    animateCamera(new THREE.Vector3(0, (floors.length * H) / 2, 0), 0.66, 0.06);
    root.classList.add('is-ready');
    setTimeout(() => { if (current === -1) selectFloor(0); }, reduced ? 0 : 1500);
}
