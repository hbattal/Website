import type { State } from "../state";

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
        //console.log("entered");
        state.changeCursor(true);
    });

    mesh.addEventListener("mouseleave", (_e: any) => {
        //console.log("exited");
        state.changeCursor(false);
    });

    if (some) {
        mesh.addEventListener("click", (_e: any) => {
            state.exitSeq(some);
        });
    }
}
