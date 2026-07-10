import type { State } from "../state";
import * as THREE from "three";

export function textSettings(mesh: any, bold: boolean) {
    mesh.textAlign = "center";
    mesh.anchorX = "center";
    mesh.anchorY = "middle";
    mesh.overflowWrap = "break-word";
    mesh.font = bold ? "/cm.ttf" : "/cr.ttf";
    //mesh.material.defines.IS_DEPTH_MATERIAL = "";
}

export function addCursor(mesh: any, state: State, some: string | null) {
    mesh.addEventListener("mouseenter", (_e: any) => {
        state.changeCursor(true);
    });

    mesh.addEventListener("mouseleave", (_e: any) => {
        state.changeCursor(false);
    });

    if (some) {
        mesh.addEventListener("click", (_e: any) => {
            state.exitSeq(some);
        });
    }
}

export function loadVideo(path: string){
    const video = document.createElement("video");
    video.src = path;
    video.loop = true;
    video.muted = true;
    video.volume = 0;
    video.play();

    return new THREE.VideoTexture(video);
}