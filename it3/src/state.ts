import * as THREE from "three";
import { HRC } from "./hrc_vis.ts";
import type { Playable } from "./playables/playable.ts";
import { Home } from "./playables/home.ts";
import { Projects } from "./playables/projects.ts";
import { InteractionManager } from "three.interactive";
import { About } from "./playables/about.ts";

export class State {
    canvas: HTMLCanvasElement;
    dpr: number;

    isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    settings = {
        fluence: 1,
        resolution: this.isMobile ? 600 : 750,
    };

    alg: HRC;
    active: Playable;
    renderer: THREE.WebGLRenderer;

    mouse = { x: 9999, y: 9999 };
    mspos = { x: 9999, y: 9999 };
    pspos = { x: 9999, y: 9999 };

    lastTime = 0;
    isInput = false;
    matchPos = false;

    //move this later
    cursor: THREE.Group;
    parent: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
    children: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>[];

    hit = false;
    hitLast = false;
    t = 0;
    begin: number;
    movement: boolean;
    gap = 600;
    trigger = false;
    col = 0;

    cursorScale: number;
    parentScale: number;
    childrenScale: number;

    interact: InteractionManager;
    camera: THREE.OrthographicCamera;

    //move this later
    prog = 0;
    gap2 = 600;
    exiting = false;
    exitBegin: number;
    tpTo: string;

    starting = false;
    startBegin: number;

    projects: Playable;
    home: Playable;
    about: Playable;

    homeTexs: (THREE.VideoTexture | null)[] = [null, null];
    aboutTexs: THREE.Texture[] = [];
    projectTexs: (THREE.Texture | THREE.VideoTexture | null)[] = [null, null, null, null];

    loading = document.getElementById("loader")! as HTMLDivElement;
    txt = document.getElementById("txt")! as HTMLSpanElement;

    constructor() {
        this.init(); //stupid
    }

    async init() {
        this.canvas = document.querySelector("canvas")!;
        this.dpr = window.devicePixelRatio;

        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });

        //load textures this is bad
        await this.loadTextures();

        this.canvas.addEventListener("mousemove", (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = this.canvas.clientHeight - e.clientY;
        });

        this.canvas.addEventListener("mousedown", () => {
            this.isInput = true;
            this.matchPos = true;
        });

        this.canvas.addEventListener("mouseup", () => {
            this.isInput = false;
        });

        this.canvas.addEventListener("mouseleave", () => {
            this.isInput = false;
        });

        this.canvas.addEventListener("touchmove", (e) => {
            this.mouse.x = e.touches[0].clientX;
            this.mouse.y = this.canvas.clientHeight - e.touches[0].clientY;
        });

        this.canvas.addEventListener("touchstart", (e) => {
            this.isInput = true;
            this.mouse.x = e.touches[0].clientX;
            this.mouse.y = this.canvas.clientHeight - e.touches[0].clientY;

            this.matchPos = true;
        });

        this.canvas.addEventListener("touchend", () => {
            this.isInput = false;
        });

        this.canvas.addEventListener("click", () => {
            this.trigger = true;
        });

        this.alg = new HRC(this);

        //move this later
        this.camera = new THREE.OrthographicCamera(-this.alg.fixWidth / 2, this.alg.fixWidth / 2, this.alg.fixHeight / 2, -this.alg.fixHeight / 2, 0, 1);
        this.interact = new InteractionManager(this.alg.renderer, this.camera, this.alg.renderer.domElement);

        this.cursor = new THREE.Group();

        const mat = new THREE.MeshBasicMaterial();
        const geom = new THREE.CircleGeometry(1, 64);
        const geom2 = new THREE.CircleGeometry(1, 16);

        this.parent = new THREE.Mesh(geom, mat);

        this.cursor.add(this.parent);

        this.children = [];
        for (let i = 0; i < 7; ++i) {
            const mat2 = mat.clone();
            mat2.color.setHSL(i / 7, 1.0, 0.7);
            this.children.push(new THREE.Mesh(geom2, mat2));
            this.cursor.add(this.children.at(-1)!);
        }

        this.projects = new Projects(this.alg.fixWidth, this.alg.fixHeight, this);
        this.home = new Home(this.alg.fixWidth, this.alg.fixHeight, this);
        this.about = new About(this.alg.fixWidth, this.alg.fixHeight, this);
        this.active = this.home;

        setTimeout(() => {
            this.txt.textContent = "Halil Battal";

            window.addEventListener("resize", () => {
                this.updateBoot();
            });

            this.updateBoot();
        }, 1000);

        setTimeout(() => {
            this.loading.style.background = "transparent";
            this.txt.style.color = "transparent";
        }, 1600);
    }

    async loadVideo(vid: HTMLVideoElement) {
        return new Promise((res) => {
            vid.oncanplaythrough = () => {
                res(vid);
            };
        });
    }

    createVid(path: string) {
        const video = document.createElement("video");
        video.src = path;
        video.loop = true;
        video.muted = true;

        return video;
    }

    //should be loadAll and compile everything at once
    async loadTextures() {
        //home, home, projects
        const vidPaths = ["/home1.mp4", "/home2.mp4", "/back1.mp4"];
        const imgPaths = ["/2d.png", "/path.png", "/gh.jpg"];

        let proms: any = [];
        let ind = 1;

        const loader = new THREE.TextureLoader();
        for (let i = 1; i <= 20; ++i) {
            const prom = loader.loadAsync("/m" + i + ".jpg").then((tex) => {
                this.aboutTexs.push(tex);
                this.renderer.initTexture(tex);
                this.updateLoader(ind++);
            });

            proms.push(prom);
        }

        for (let i = 0; i < imgPaths.length; ++i) {
            const prom = loader.loadAsync(imgPaths[i]).then((tex) => {
                this.projectTexs[i] = tex;
                this.renderer.initTexture(tex);

                this.updateLoader(ind++);
            });

            proms.push(prom);
        }

        for (let i = 0; i < 3; ++i) {
            const video = this.createVid(vidPaths[i]);

            const prom = this.loadVideo(video).then(() => {
                video.play();

                const tex = new THREE.VideoTexture(video);
                this.renderer.initTexture(tex);

                if (i === 2) this.projectTexs[3] = tex;
                else this.homeTexs[i] = tex;

                this.updateLoader(ind++);
            });

            proms.push(prom);
        }

        await Promise.all(proms);
    }

    updateLoader(prog: number) {
        this.txt.textContent = "Loading " + ((prog / 26) * 100).toFixed(0) + "%";
    }

    updateBoot() {
        this.txt.style.fontSize = "100px"; //if its small its bad i have no idea why
        const bbox = this.txt.getBoundingClientRect();
        const w = bbox.width;
        const h = bbox.height;

        const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        const scale = (Math.min(this.canvas.clientWidth / w, this.canvas.clientHeight / h) / (aspect <= 1 ? 1.1 : 1.6)) * 100;

        this.txt.style.fontSize = scale + "px";
    }

    exitSeq(room: string) {
        this.exiting = true;
        this.exitBegin = performance.now();
        this.tpTo = room;
    }

    startSeq() {
        this.starting = true;
        this.startBegin = performance.now();
    }

    changeScenes(room: string) {
        //this.active.dispose();
        if (room === "projects") this.active = this.projects;
        else if (room === "home") this.active = this.home;
        else if (room === "about") this.active = this.about;

        this.active.resize(this.alg.fixWidth, this.alg.fixHeight);
    }

    changeCursor(ent: boolean) {
        this.hit = ent;
    }

    updateCursor() {
        const aspect = this.alg.fixWidth / this.alg.fixHeight;
        const use = aspect <= 1 ? this.alg.fixWidth * 1.9 : this.alg.fixWidth * 1.2;

        this.parentScale = use / 140;
        this.childrenScale = use / 215;

        this.parent.scale.set(this.parentScale, this.parentScale, 1);

        for (let i = 0; i < 7; ++i) {
            this.children[i].scale.set(this.childrenScale, this.childrenScale, 1);
        }

        this.cursorScale = use / 47;
    }

    update() {
        const curTime = performance.now();
        const delta = curTime - this.lastTime;
        this.lastTime = curTime;

        const mpos = {
            x: (this.mouse.x * this.dpr) / (this.alg.width / this.alg.fixWidth) - this.alg.fixWidth / 2,
            y: (this.mouse.y * this.dpr) / (this.alg.height / this.alg.fixHeight) - this.alg.fixHeight / 2,
        };

        this.mspos = {
            x: mpos.x + this.alg.fixWidth / 2,
            y: mpos.y + this.alg.fixHeight / 2,
        };

        if (this.matchPos) {
            this.pspos = this.mspos;
            this.matchPos = false;
        }

        this.updateCursor();

        this.interact.camera = this.active.camera;
        this.interact.update();
        this.active.scene.add(this.cursor);

        if (this.hitLast !== this.hit) {
            //trigger anim where t is to 1
            this.begin = curTime;

            if (this.hitLast === true) {
                //winddown
                this.movement = false;
                this.begin -= (1 - this.t) * this.gap;
            } else {
                //windup
                this.movement = true;
                this.begin -= this.t * this.gap;
            }
        }

        if (this.movement === false) this.t = Math.max(1 - (curTime - this.begin) / this.gap, 0);
        if (this.movement === true) this.t = Math.min((curTime - this.begin) / this.gap, 1);

        this.cursor.position.set(mpos.x, mpos.y, -0.2);

        if (this.trigger) {
            if (this.col === 10) this.parent.material.color.setHSL(0.0, 0.0, 0.0);
            else if (this.col === 11) (this.parent.material.color.setHSL(0.0, 0.0, 1.0), (this.col = 0));
            else {
                this.parent.material.color.setHSL(this.col / 10, 1.0, 0.7);
            }

            ++this.col;
        }

        const c1 = 1.70158;
        const c2 = c1 * 1.525;
        const ease = this.t < 0.5 ? (Math.pow(2 * this.t, 2) * ((c2 + 1) * 2 * this.t - c2)) / 2 : (Math.pow(2 * this.t - 2, 2) * ((c2 + 1) * (this.t * 2 - 2) + c2) + 2) / 2;

        for (let i = 0; i < 7; ++i) {
            const dist = THREE.MathUtils.lerp(0, this.cursorScale, ease);
            const ang = curTime * 0.002 + (i * 2 * Math.PI) / 7;
            this.children[i].position.set(Math.cos(ang) * dist, Math.sin(ang) * dist, -0.1);
        }

        const t = THREE.MathUtils.lerp(1, 1.5, ease);
        this.parent.scale.set(t * this.parentScale, t * this.parentScale, 1);

        //done

        //move this later

        if (this.exiting) {
            const t = (curTime - this.exitBegin) / this.gap2;
            if (t >= 1) {
                this.active.sequence(1, false);
                this.exiting = false;
                this.changeScenes(this.tpTo);
                this.startSeq();
            } else {
                const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                this.active.sequence(ease, false);
            }
        }

        if (this.starting) {
            const t = (curTime - this.startBegin) / this.gap2;
            if (t >= 1) {
                this.active.sequence(1, true);
                this.starting = false;
            } else {
                const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                this.active.sequence(ease, true);
            }
        }

        this.active.update(delta);

        this.pspos = this.mspos;
        this.hitLast = this.hit;
        this.trigger = false;
    }
}

new State();
