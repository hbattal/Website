import * as THREE from "three";

export abstract class Playable {
    scene: THREE.Scene;
    volScene: THREE.Scene;

    camera: THREE.OrthographicCamera;

    width: number;
    height: number;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;

        this.scene = new THREE.Scene();
        this.volScene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-this.width / 2, this.width / 2, this.height / 2, -this.height / 2, 0, 1);
    }

    resize(width: number, height: number) {
        this.width = width;
        this.height = height;

        this.camera = new THREE.OrthographicCamera(-this.width / 2, this.width / 2, this.height / 2, -this.height / 2, 0, 1);

        this.reset();
    }

    abstract reset(): void;
    abstract createScene(): void;
    abstract update(...args: any[]): void;
    abstract volumetrics(toggle: boolean): void;
    abstract sequence(time: number, start: boolean): void;
}
