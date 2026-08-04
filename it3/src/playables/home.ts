import * as THREE from "three";
import { Text } from "troika-three-text";
import { Playable } from "./playable";
import type { State } from "../state";
import { addCursor, textSettings } from "./utils";

export class Home extends Playable {
    name: any;
    projects: any;
    about: any;

    scale: number;
    childScale: number;

    upd = 0;

    state: State;
    constructor(width: number, height: number, state: State) {
        super(width, height);

        this.state = state;

        this.createScene();

        this.about.fontSize = this.projects.fontSize = this.name.fontSize = 1;
        const texts = [this.name, this.projects, this.about];

        texts.forEach((text) => {
            text.sync(() => {
                this.upd++;
                if (this.upd === 3) this.reset();
            });
        });
    }

    reset() {
        if (this.upd !== 3) return;

        const aspect = this.width / this.height;

        const width = this.name.geometry.boundingBox.max.x - this.name.geometry.boundingBox.min.x;
        const height = this.name.geometry.boundingBox.max.y - this.name.geometry.boundingBox.min.y;

        const widthProject = this.projects.geometry.boundingBox.max.x - this.projects.geometry.boundingBox.min.x;
        const widthAbout = this.about.geometry.boundingBox.max.x - this.about.geometry.boundingBox.min.x;

        this.scale = Math.min(this.width / width, this.height / height) / (aspect <= 1 ? 1.1 : 1.6); //different rule for mobile
        this.childScale = this.scale / 3;

        this.name.scale.set(this.scale, this.scale, 1);
        this.projects.scale.set(this.childScale, this.childScale, 1);
        this.about.scale.set(this.childScale, this.childScale, 1);

        this.projects.position.set(this.name.geometry.boundingBox.min.x * this.scale, this.name.geometry.boundingBox.max.y * this.scale, -1);
        this.about.position.set(this.name.geometry.boundingBox.max.x * this.scale, this.name.geometry.boundingBox.max.y * this.scale, -1);

        this.projects.position.x += (widthProject * this.childScale) / 1.8;
        this.about.position.x -= (widthAbout * this.childScale) / 1.8;
    }

    createScene() {
        const mat = new THREE.ShaderMaterial({
            uniforms: {
                tex: { value: null },
                tex2: { value: null },
                tex3: { value: null },
            },
            vertexShader: `
            varying vec2 vUv;
            varying float vIndex;

            void main() {
                vUv = uv;
                vIndex = aTroikaGlyphBounds.x;

                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
            fragmentShader: `
            precision highp float;
            varying vec2 vUv;
            varying float vIndex;
            uniform sampler2D tex;
            uniform sampler2D tex2;
            uniform sampler2D tex3;

            void main() {
                if(vUv.x > 0.3  && vUv.x < 0.35 && vUv.y > 0.65 && vUv.y < 1.0){
                    gl_FragColor = vec4(1.0);
                }
                else if(vUv.x <= 0.4) {
                    gl_FragColor = texture(tex, vUv);
                } else if(vUv.x <= 1.0){
                    gl_FragColor = texture(tex2, vUv);
                }
            }`,
        });

        mat.uniforms.tex.value = this.state.homeTexs[0];
        mat.uniforms.tex2.value = this.state.homeTexs[1];

        this.name = new Text();
        this.projects = new Text();
        this.about = new Text();

        textSettings(this.name, true);
        textSettings(this.projects, false);
        textSettings(this.about, false);

        addCursor(this.projects, this.state, "projects");
        addCursor(this.about, this.state, "about");

        this.name.text = "Halil Battal";
        this.projects.text = "Projects";
        this.about.text = "About";

        this.name.material = mat;

        this.state.interact.add(this.projects);
        this.state.interact.add(this.about);

        this.scene.add(this.name);
        this.scene.add(this.projects);
        this.scene.add(this.about);
        this.volScene = this.scene;
    }

    sequence(time: number, start: boolean) {
        if (start) time = Math.min(time, 1);
        else time = Math.max(1 - time, 0);

        if (time === 1 && start) {
            this.state.interact.add(this.projects);
            this.state.interact.add(this.about);
        }
        if (time === 0 && !start) {
            this.state.interact.remove(this.projects);
            this.state.interact.remove(this.about);
        }

        this.name.scale.set(time * this.scale, time * this.scale, 1);
        this.projects.scale.set(time * this.childScale, time * this.childScale, 1);
        this.about.scale.set(time * this.childScale, time * this.childScale, 1);
    }

    update() {}

    volumetrics(_toggle: boolean): void {}
}
