import * as THREE from "three";

import type { State } from "./state.js";
import { hrcCones } from "./shaders/cones.js";
import { hrcExtend } from "./shaders/extensions.js";
import { hrcTrace } from "./shaders/trace.js";
import { hrcSum } from "./shaders/sum.js";

//https://www.typescriptlang.org/docs/handbook/2/classes.html
export class HRC {
    state: State;
    renderer: THREE.WebGLRenderer;

    scene: THREE.Scene;
    camera: THREE.OrthographicCamera;

    width: number;
    height: number;

    fixWidth: number;
    fixHeight: number;
    ccWidth: number;
    ccHeight: number;
    opt: number;

    skyTex: THREE.DataTexture;

    modelRT: THREE.WebGLRenderTarget;
    raysW: THREE.WebGLRenderTarget[];
    raysH: THREE.WebGLRenderTarget[];
    conesW: THREE.WebGLRenderTarget[];
    conesH: THREE.WebGLRenderTarget[];
    frustums: THREE.WebGLRenderTarget[];
    final: THREE.WebGLRenderTarget; //not needed rn

    traceShader: THREE.ShaderMaterial;
    extendShader: THREE.ShaderMaterial;
    coneShader: THREE.ShaderMaterial;
    sumShader: THREE.ShaderMaterial;

    displayMaterial: THREE.MeshBasicMaterial;

    geometry: THREE.PlaneGeometry;
    mesh: THREE.Mesh;

    frameCount: number;

    constructor(state: State) {
        this.state = state;

        this.renderer = new THREE.WebGLRenderer({ canvas: this.state.canvas, antialias: true });
        this.renderer.autoClear = false;
        this.renderer.setClearColor(0x000000, 0); //premultiplied
        this.renderer.info.autoReset = false;
        this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        this.calculateBounds();
        this.targets();
        this.shaders();
        this.sky("none");

        this.renderer.setSize(this.width, this.height, false);
        this.renderer.setAnimationLoop(this.render.bind(this));

        this.frameCount = 0;
    }

    calculateBounds() {
        this.width = Math.floor(this.state.canvas.clientWidth * this.state.dpr);
        this.height = Math.floor(this.state.canvas.clientHeight * this.state.dpr);

        //has to be even
        this.fixWidth = this.state.settings.resolution;

        this.fixHeight = Math.floor(this.fixWidth / (this.width / this.height));
        if (this.fixHeight % 2 === 1) this.fixHeight += 1;

        if (this.height > this.width) {
            this.fixHeight = this.state.settings.resolution;
            this.fixWidth = Math.floor(this.fixHeight / (this.height / this.width));
            if (this.fixWidth % 2 === 1) this.fixWidth += 1;
        }

        this.ccWidth = Math.ceil(Math.log2(this.fixWidth));
        this.ccHeight = Math.ceil(Math.log2(this.fixHeight));
        this.opt = 2;
    }

    targets() {
        const nearestRT = {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            type: THREE.HalfFloatType,
        };

        const linearRT = {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            type: THREE.HalfFloatType,
        };

        this.dispose(false);

        this.modelRT = new THREE.WebGLRenderTarget(this.fixWidth, this.fixHeight, nearestRT);

        this.raysW = [];
        this.raysH = [];

        //linear in c0 cuz when opt = 2, c1 needs interpolation when extending the second half the ray + c0 needs interp ray data during merge
        for (let i = 0; i < this.ccWidth; ++i) {
            const height = this.fixHeight / this.opt;
            const width = Math.ceil(this.fixWidth / Math.pow(2, i)) * (Math.pow(2, i) + 1);

            const typ = i === 0 ? linearRT : nearestRT;
            this.raysW.push(new THREE.WebGLRenderTarget(width, height, typ));
        }

        for (let i = 0; i < this.ccHeight; ++i) {
            const height = this.fixWidth / this.opt;
            const width = Math.ceil(this.fixHeight / Math.pow(2, i)) * (Math.pow(2, i) + 1);

            const typ = i === 0 ? linearRT : nearestRT;
            this.raysH.push(new THREE.WebGLRenderTarget(width, height, typ));
        }

        this.conesW = [];
        this.conesH = [];

        //linear in c1 because when opt = 2, c0 needs interpolation when reading nextCone values
        for (let i = 1; i < this.ccWidth; ++i) {
            const height = this.fixHeight / this.opt;
            const width = Math.ceil(this.fixWidth / Math.pow(2, i)) * Math.pow(2, i);

            const typ = i === 1 ? linearRT : nearestRT;

            this.conesW.push(new THREE.WebGLRenderTarget(width, height, typ));
        }

        for (let i = 1; i < this.ccHeight; ++i) {
            const height = this.fixWidth / this.opt;
            const width = Math.ceil(this.fixHeight / Math.pow(2, i)) * Math.pow(2, i);
            const typ = i === 1 ? linearRT : nearestRT;

            this.conesH.push(new THREE.WebGLRenderTarget(width, height, typ));
        }

        this.frustums = [];
        for (let i = 0; i < 4; ++i) {
            if (i % 2 === 0) this.frustums.push(new THREE.WebGLRenderTarget(this.fixWidth, this.fixHeight / this.opt, linearRT));
            else this.frustums.push(new THREE.WebGLRenderTarget(this.fixHeight, this.fixWidth / this.opt, linearRT));
        }
    }

    shaders() {
        this.traceShader = hrcTrace();
        this.extendShader = hrcExtend();
        this.coneShader = hrcCones();
        this.sumShader = hrcSum();

        this.displayMaterial = new THREE.MeshBasicMaterial();
        this.geometry = new THREE.PlaneGeometry(2, 2);
        this.mesh = new THREE.Mesh(this.geometry, this.traceShader);
        this.scene.add(this.mesh);
    }

    sky(mode: string) {
        let skyData = new Float32Array(200 * 4); //each texel covers an angle of 2pi/num
        //new Float16Array()
        const hsl = new THREE.Color();

        for (let i = 0; i < 200; ++i) {
            hsl.set(0.0, 0.0, 0.0);
            if (i <= 50 && mode === "rainbow") hsl.setHSL(i / 50, 1.0, 0.5, THREE.SRGBColorSpace);

            skyData[i * 4] = hsl.r;
            skyData[i * 4 + 1] = hsl.g;
            skyData[i * 4 + 2] = hsl.b;
            skyData[i * 4 + 3] = 1;
        }

        this.skyTex?.dispose();
        this.skyTex = new THREE.DataTexture(skyData, 200, 1, THREE.RGBAFormat, THREE.FloatType);
        this.skyTex.needsUpdate = true;
    }

    dispose(all: boolean) {
        this.modelRT?.dispose();

        this.raysW?.forEach((target) => {
            target.dispose();
        });

        this.raysH?.forEach((target) => {
            target.dispose();
        });

        this.conesW?.forEach((target) => {
            target.dispose();
        });

        this.conesH?.forEach((target) => {
            target.dispose();
        });

        this.frustums?.forEach((target) => {
            target.dispose();
        });

        if (!all) return;

        this.skyTex?.dispose();

        this.mesh.geometry.dispose();

        this.traceShader.dispose();
        this.extendShader.dispose();
        this.coneShader.dispose();
        this.sumShader.dispose();
        this.displayMaterial.dispose();

        this.renderer.setAnimationLoop(null);
        this.renderer.dispose();
    }

    resize() {
        this.calculateBounds();
        this.targets();
        this.state.active.resize(this.fixWidth, this.fixHeight);

        //https://github.com/mrdoob/three.js/blob/dev/src/core/RenderTarget.js setSize disposes for us! love that
        this.renderer.setSize(this.width, this.height, false);
    }

    //4 * (ceil(log2(num)) * 2) + 2 passes every frame (82 for 1024, 90 for 2048)
    //1 + 2 * ccWidth - 1 + 2 * ccHeight - 1 + 4 textures in total
    render() {
        if (Math.floor(this.state.canvas.clientWidth * this.state.dpr) !== this.width || Math.floor(this.state.canvas.clientHeight * this.state.dpr) !== this.height) {
            this.resize();
        }

        this.state.update();
        this.state.active.volumetrics(false);

        this.renderer.setRenderTarget(this.modelRT);
        this.renderer.clear();
        this.renderer.render(this.state.active.scene, this.state.active.camera);

        for (let i = 0; i < 4; ++i) {
            let num;
            let cones;
            let rays;
            let fw;
            let fh;

            if (i % 2 === 0) {
                num = this.ccWidth;
                cones = this.conesW;
                rays = this.raysW;
                fw = this.fixWidth;
                fh = this.fixHeight;
            } else {
                num = this.ccHeight;
                cones = this.conesH;
                rays = this.raysH;
                fw = this.fixHeight;
                fh = this.fixWidth;
            }

            //trace pass c0 only or c0...c2 as per paper
            this.mesh.material = this.traceShader;
            this.traceShader.uniforms.cascade.value = 0;
            this.traceShader.uniforms.frustum.value = i;
            this.traceShader.uniforms.opt.value = this.opt;

            this.traceShader.uniforms.scene.value = this.modelRT.texture;
            this.traceShader.uniforms.size.value = [fw, fh];

            this.renderer.setRenderTarget(rays[0]);
            this.renderer.render(this.scene, this.camera);

            //extension pass
            this.mesh.material = this.extendShader;

            for (let j = 1; j < num; ++j) {
                this.extendShader.uniforms.cascade.value = j;
                this.extendShader.uniforms.frustum.value = i;
                this.extendShader.uniforms.opt.value = this.opt;

                this.extendShader.uniforms.raySize.value = [rays[j - 1].width, rays[j - 1].height];
                this.extendShader.uniforms.pRays.value = rays[j - 1].texture;

                this.renderer.setRenderTarget(rays[j]);
                this.renderer.render(this.scene, this.camera);
            }

            //cone pass
            this.mesh.material = this.coneShader;

            for (let j = num - 1; j >= 0; --j) {
                let width = j === num - 1 ? 1 : cones[j].width;
                let height = j === num - 1 ? 1 : cones[j].height;
                let tex = j === num - 1 ? null : cones[j].texture;

                this.coneShader.uniforms.cascade.value = j;
                this.coneShader.uniforms.frustum.value = i;
                this.coneShader.uniforms.opt.value = this.opt;

                this.coneShader.uniforms.sky.value = this.skyTex;

                this.coneShader.uniforms.nCones.value = tex;
                this.coneShader.uniforms.coneSize.value = [width, height];

                this.coneShader.uniforms.cRays.value = rays[j].texture;
                this.coneShader.uniforms.raySize.value = [rays[j].width, rays[j].height];

                this.renderer.setRenderTarget(j === 0 ? this.frustums[i] : cones[j - 1]);
                this.renderer.render(this.scene, this.camera);
            }
        }

        this.mesh.material = this.sumShader;
        this.sumShader.uniforms.multiplier.value = this.state.settings.fluence;

        this.sumShader.uniforms.f1.value = this.frustums[0].texture;
        this.sumShader.uniforms.f2.value = this.frustums[1].texture;
        this.sumShader.uniforms.f3.value = this.frustums[2].texture;
        this.sumShader.uniforms.f4.value = this.frustums[3].texture;
        this.sumShader.uniforms.size.value = [this.fixWidth, this.fixHeight];

        this.renderer.setRenderTarget(null);
        this.renderer.render(this.scene, this.camera);

        //dont render overlay on volumetrics
        this.state.active.volumetrics(true);
        this.renderer.clearDepth();
        this.renderer.render(this.state.active.volScene, this.state.active.camera);

        this.frameCount = this.frameCount + 1; // % 2;

        //https://github.com/mrdoob/three.js/blob/dev/src/renderers/webgl/WebGLInfo.js
        this.renderer.info.reset();
    }
}
