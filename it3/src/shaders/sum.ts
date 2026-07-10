import * as THREE from "three";

export function hrcSum() {
    return new THREE.ShaderMaterial({
        uniforms: {
            multiplier: { value: null },

            f1: { value: null },
            f2: { value: null },
            f3: { value: null },
            f4: { value: null },
            size: { value: null },
        },
        glslVersion: THREE.GLSL3,
        vertexShader: `
            out vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            precision highp float;

            in vec2 vUv;

            uniform float multiplier;

            uniform sampler2D f1;
            uniform sampler2D f2;
            uniform sampler2D f3;
            uniform sampler2D f4;
            uniform ivec2 size;

            out vec4 fragColor;

            #define TAU 6.283185

            void main() {
                vec4 rad = vec4(0.0);
                vec2 c = vUv;
                vec2 offset = vec2(1.0, 1.0) / vec2(size);

                rad += texture(f1, c + vec2(offset.x, 0.0) );
                rad += texture(f2, vec2(c.y, 1.0 - c.x) + vec2(offset.y, 0.0) );
                rad += texture(f3, 1.0 - c + vec2(offset.x, 0.0) );
                rad += texture(f4, vec2(1.0 - c.y, c.x) + vec2(offset.y, 0.0) );

                vec4 norm = rad / TAU * multiplier;
                fragColor = vec4(pow(norm, vec4(1.0 / 2.2)));
            }

        `,
    });
}
