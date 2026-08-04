import * as THREE from "three";
import { Playable } from "./playable";
import type { State } from "../state";
import { Text } from "troika-three-text";
import { addCursor, textSettings } from "./utils";

export class Projects extends Playable {
    texture: THREE.Texture;
    texture2: THREE.Texture;
    texture3: THREE.Texture;

    vw = 1920;
    vh = 1080;

    media: any;
    back: any;
    next: any;

    state: State;

    actualWidth: number;
    actualHeight: number;

    projText: any;
    index = 0;

    front: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
    frontTexture: THREE.Texture;

    constructor(width: number, height: number, state: State) {
        super(width, height);
        this.state = state;

        this.createScene();
        this.reset();
    }

    reset() {
        const aspect = this.width / this.height;

        const mobile = aspect <= 1;

        let scale = Math.min(this.width / this.vw, this.height / this.vh) * (mobile ? 0.8 : 0.44);

        //yes hacky but if anyone has a gigantic aspect ratio atp its not my fault
        if (aspect > this.vw / this.vh) {
            scale = scale * Math.pow(aspect / (this.vw / this.vh), 0.3);
        }

        this.actualWidth = this.vw * scale;
        this.actualHeight = this.vh * scale;

        this.projText.maxWidth = this.actualWidth / (mobile ? 1 : 1.2);

        this.back.fontSize = this.next.fontSize = scale * 100;
        this.projText.fontSize = scale * 70;

        this.back.sync();
        this.next.sync();
        this.projText.sync();

        if (mobile) {
            this.media.position.set(0, this.actualHeight / 2, -1);
            this.front.position.set(0, this.actualHeight / 2, -1);

            this.back.position.set(-this.actualWidth / 2.25, this.actualHeight / 2 + this.actualHeight / 1.5, -1);
            this.next.position.set(this.actualWidth / 2.25, this.actualHeight / 2 + this.actualHeight / 1.5, -1);
            this.projText.position.set(0, -this.actualHeight / 2, 0);
        } else {
            this.media.position.set(-this.actualWidth / 2, 0, -1);
            this.front.position.set(-this.actualWidth / 2, 0, -1);

            this.back.position.set(-this.actualWidth / 2, this.actualHeight / 2 + this.actualHeight / 4, -1);
            this.next.position.set(this.actualWidth / 2, this.actualHeight / 2 + this.actualHeight / 4, -1);
            this.projText.position.set(this.actualWidth / 2, 0, 0);
        }

        this.media.scale.set(this.actualWidth, this.actualHeight, 1);
        this.front.scale.set(this.actualWidth, this.actualHeight, 1);
    }

    createScene() {
        this.back = new Text();
        this.next = new Text();
        this.projText = new Text();

        textSettings(this.back, false);
        textSettings(this.next, false);
        textSettings(this.projText, false);

        this.projText.textAlign = "left";

        this.back.text = "Back";
        this.next.text = "Next";

        this.texture2 = this.state.projectTexs[0]!;
        this.texture3 = this.state.projectTexs[1]!;
        this.texture = this.state.projectTexs[2]!;

        this.frontTexture = this.state.projectTexs[3]!; //vid

        const geom = new THREE.PlaneGeometry(1, 1);

        const mat = new THREE.MeshBasicMaterial({ map: this.frontTexture });
        this.media = new THREE.Mesh(geom, mat);

        const mat2 = new THREE.MeshBasicMaterial({ map: this.texture });
        this.front = new THREE.Mesh(geom, mat2);

        const text = "See my github (click on the picture), I am planning to have more on there as I keep learning about new technologies. Currently learning C++, reading some textbooks, and making a new full-stack project.";
        const lightsText = "2D Global Illumination with Holographic Radiance Cascades. I initially saw a basic version of 2DGI on Lusion's Akari project. After going down the rabbit hole of tracing, Radiance Cascades, and finally Holographic Radiance Cascades, I ended up with this little playground. I hope to add more modes as I have more ideas. This website is also using the same algorithm!";
        const pathText = "You can have a path tracer on the web! This is no new technology, as WebGL has existed for some time. But what if I told you this project is also written in Rust? Yep, apparently that is possible, doesn't it feel like magic?. Anyways, this is a basic PBR path tracer, currently it's pretty barebones. This was as far as I was able to get without reading PBRT, so the time has come.";

        const texts = [text, lightsText, pathText];
        const media = [this.frontTexture, this.texture2, this.texture3];
        const urls = ["https://github.com/hbattal", "https://github.com/hbattal/2D-Lights", "https://github.com/hbattal/wgpu-path-tracer"];

        this.projText.text = text;

        addCursor(this.back, this.state, "home");
        addCursor(this.next, this.state, null);
        addCursor(this.media, this.state, null);

        this.next.addEventListener("click", (_e: any) => {
            this.index += 1;
            this.index %= 3;

            this.projText.text = texts[this.index];
            this.projText.sync();

            this.media.material.map = media[this.index];

            if (this.index === 0) {
                this.front.visible = true;
            } else {
                this.front.visible = false;
            }
        });

        this.media.addEventListener("click", (_e: any) => {
            const url = urls[this.index];
            window.open(url, "_blank")?.focus();
        });
    }

    sequence(time: number, start: boolean) {
        if (start) time = Math.min(time, 1);
        else time = Math.max(1 - time, 0);

        if (time === 1 && start) {
            this.state.interact.add(this.back);
            this.state.interact.add(this.next);
            this.state.interact.add(this.media);
        }
        if (time === 0 && !start) {
            this.state.interact.remove(this.back);
            this.state.interact.remove(this.next);
            this.state.interact.remove(this.media);
        }

        this.media.scale.set(time * this.actualWidth, time * this.actualHeight, 1);
        this.front.scale.set(time * this.actualWidth, time * this.actualHeight, 1);

        this.back.scale.set(time, time, 1);
        this.next.scale.set(time, time, 1);
        this.projText.scale.set(time, time, 1);
    }

    update() {}

    volumetrics(toggle: boolean): void {
        if (toggle) {
            this.volScene.add(this.media);
            this.volScene.add(this.next);
            this.volScene.add(this.back);
            this.volScene.add(this.projText);
            this.volScene.add(this.state.cursor);

            this.volScene.add(this.front);
        } else {
            this.scene.add(this.media);
            this.scene.add(this.next);
            this.scene.add(this.back);
            this.scene.add(this.state.cursor);
        }
    }
}
