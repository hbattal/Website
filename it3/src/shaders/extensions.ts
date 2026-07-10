import * as THREE from "three";

export function hrcExtend() {
    return new THREE.ShaderMaterial({
        uniforms: {
            cascade: { value: null },
            frustum: { value: null },
            opt: { value: null },

            pRays: { value: null },
            raySize: { value: null },
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

            uniform int cascade;
            uniform int frustum;
            uniform int opt;

            uniform sampler2D pRays;
            uniform ivec2 raySize;

            out vec4 fragColor;

            struct Light {
                vec3 rad;
                float tran;
            };

            Light extend(int k1, int k2, int plane, vec2 probe, ivec2 coord) {
                //when 2k is even k1 and k2 are the same thing
                //when 2k is odd k1 is k2 = k1 + 1 or k1 = k2 + 1 depending on  F- or F+

                int twoP = 1 << cascade - 1;
                int prev = twoP + 1;

                //lower half
                vec2 pos = vec2(plane * 2 * prev + k1, coord.y) + 0.5;
                pos /= vec2(raySize);

                //upper half
                ivec2 dir = ivec2(twoP, 2 * k1 - twoP);
                vec2 tnvk = probe + vec2(dir);

                vec2 pos2 = vec2((plane * 2 + 1) * prev + k2, floor(tnvk.y) / float(opt)) + 0.5;
                pos2 /= vec2(raySize); //can be out of bounds

                Light r;

                vec4 s = texture(pRays, pos);
                vec3 rad = s.rgb;
                float tran = s.a;

                if(floor(pos2) != vec2(0.0)) {
                    r.rad = rad;
                    r.tran = tran;
                    return r;
                }

                vec4 su = texture(pRays, pos2);
                vec3 radTnvk = su.rgb;
                float tranTnvk = su.a;

                r.rad = rad + (tran * radTnvk);
                r.tran = tran * tranTnvk;

                return r;
            }


            void main() {
                ivec2 coord = ivec2(gl_FragCoord.xy);

                int twoN = 1 << cascade;

                int rays = twoN + 1;

                int plane = coord.x / rays;
                int ind = coord.x % rays;

                vec2 probe = vec2(plane * twoN, coord.y * opt) + 0.5;

                //if ind is even we only need rayLower
                int dRay = ind / 2;
                int uRay = (ind % 2 == 0) ? dRay : dRay + 1;

                Light d = extend(dRay, uRay, plane, probe, coord);
                vec3 rad = d.rad;
                float tran = d.tran;

                if(ind % 2 == 1) {
                    Light u = extend(uRay, dRay, plane, probe, coord);
                    rad = (d.rad + u.rad) / 2.0;
                    tran = (d.tran + u.tran) / 2.0;
                }

                fragColor = vec4(rad, tran);
            }

        `,
    });
}
