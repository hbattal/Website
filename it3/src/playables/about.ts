import * as THREE from "three";
import { Text } from "troika-three-text";
import { Playable } from "./playable";
import type { State } from "../state";
import { addCursor, textSettings } from "./utils";

export class About extends Playable {
    state: State;

    meshes: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>[] = [];

    back: any;
    about: any;
    imNum = 20;

    velocity = 0;
    imWidth = 100;
    spacing = 180;

    baseVel = 0.3;

    constructor(width: number, height: number, state: State) {
        super(width, height);

        this.state = state;

        this.createScene();
        this.reset();
    }

    //look i know the below layout is extremely hardcoded but dont you expect me to come up wiht a mastermind custom layout for this if it works, it works
    reset() {
        const aspect = this.width / this.height;
        const mobile = aspect <= 1;

        //let scale = this.width / 40 * Math.pow(aspect / 1.0, 0.5);
        let hacky = (this.height / 40) * Math.pow(aspect / 1.0, 0.5);

        this.back.fontSize = hacky * 1.1;
        this.back.position.set(0, this.height / 4, -1);

        this.about.fontSize = hacky / (mobile ? 1.2 : 1.4);
        this.about.position.set(0, this.height / 12, 0);
        this.about.maxWidth = mobile ? this.width : this.width / 2.0;

        this.back.sync();
        this.about.sync();

        this.imWidth = hacky * (mobile ? 9 : 6);
        this.spacing = hacky * (mobile ? 10 : 8);

        for (let i = 0; i < this.imNum; ++i) {
            this.meshes[i].scale.set(this.imWidth, this.imWidth, 1);
            this.meshes[i].position.set((i - 1) * this.spacing + -this.width / 2 + this.imWidth / 2, -this.height / (mobile ? 4.5 : 4), -1);
        }
    }

    createScene() {
        const geom = new THREE.PlaneGeometry(1, 1.328125, 16, 16);

        //this will be top level manage for now + loading screen
        for (let i = 0; i < this.imNum; ++i) {
            //idea comes from: https://tympanus.net/codrops/2025/11/26/creating-wavy-infinite-carousels-in-react-three-fiber-with-glsl-shaders/
            const mat = new THREE.ShaderMaterial({
                uniforms: {
                    image: { value: null },
                    speed: { value: null },
                },
                glslVersion: THREE.GLSL3,
                vertexShader: `
                    out vec2 vUv;
                    uniform float speed;

                    void main() {
                        vUv = uv;

                        vec3 pos = position;
                        float xDisp = sin(uv.y * 3.141592653) * speed;
                        pos.x += xDisp;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    }
                `,
                fragmentShader: `
                    precision highp float;

                    in vec2 vUv;
                    uniform sampler2D image;
                    out vec4 fragColor;

                    void main() {
                        fragColor = texture(image, vUv);
                    }

                `,
            });

            mat.uniforms.image.value = this.state.aboutTexs[i];

            const mesh = new THREE.Mesh(geom, mat);
            this.meshes.push(mesh);
        }

        this.back = new Text();
        textSettings(this.back, false);
        addCursor(this.back, this.state, "home");

        this.about = new Text();
        textSettings(this.about, false);

        this.about.text = "Hi, I'm Halil. I am an upcoming third-year student at UNC Chapel Hill studying computer science. Even though I am still learning where I can fit in this field, my main interests are computer graphics, creative web, and everything else that I find cool. I am currently learning more about graphics, full-stack development, and ML/DL (soon enough). Please hire me :(";
        this.back.text = "Back";

        this.state.canvas.addEventListener("wheel", (e) => {
            this.velocity = this.velocity - e.deltaY / 10;
        });
    }

    update(delta: number): void {
        const dist = this.imWidth * this.imNum + (this.spacing - this.imWidth) * this.imNum;
        const left = -this.width / 2 - this.imWidth / 2;

        const dt = delta / 10;

        this.velocity = Math.min(Math.max(this.velocity, -20), 20);

        for (let i = 0; i < this.imNum; ++i) {
            this.meshes[i].position.x += this.velocity * dt;

            this.meshes[i].position.x = left + ((((this.meshes[i].position.x - left) % dist) + dist) % dist);

            this.meshes[i].material.uniforms.speed.value = this.velocity / 90.0;
        }

        this.velocity *= Math.pow(0.98, dt);
        if (this.velocity < this.baseVel) this.velocity += 0.05 * dt;
    }

    volumetrics(toggle: boolean): void {
        if (toggle) {
            this.volScene.add(this.back);
            this.volScene.add(this.about);
            this.volScene.add(this.state.cursor);

            for (let i = 0; i < this.imNum; ++i) {
                this.volScene.add(this.meshes[i]);
            }
        } else {
            this.scene.add(this.back);
            this.scene.add(this.state.cursor);

            for (let i = 0; i < this.imNum; ++i) {
                this.scene.add(this.meshes[i]);
            }
        }
    }

    sequence(time: number, start: boolean): void {
        if (start) time = Math.min(time, 1);
        else time = Math.max(1 - time, 0);

        if (time === 1 && start) this.state.interact.add(this.back);
        if (time === 0 && !start) {
            this.state.interact.remove(this.back);
        }

        this.back.scale.set(time, time, 1);
        this.about.scale.set(time, time, 1);

        for (let i = 0; i < this.imNum; ++i) {
            this.meshes[i].scale.set(time * this.imWidth, time * this.imWidth, 1);
        }
    }
}
