import * as THREE from "three";

//this can be greatly reduced in size its just explicit rn

export function hrcCones() {
    return new THREE.ShaderMaterial({
        uniforms: {
            cascade: { value: null },
            frustum: { value: null },
            opt: { value: null },

            sky: { value: null },

            nCones: { value: null },
            coneSize: { value: null },

            cRays: { value: null },
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

            uniform sampler2D sky;

            uniform sampler2D nCones;
            uniform ivec2 coneSize;

            uniform sampler2D cRays;
            uniform ivec2 raySize;

            out vec4 fragColor;

            #define TAU 6.283185

            struct Light {
                vec3 rad;
                float tran;
            };

            Light curRay(int plane, int ind, vec2 probe, int rays) {
                vec2 pos = vec2(plane * rays + ind, floor(probe.y) / float(opt)) + 0.5;
                pos /= vec2(raySize);

                Light r;

                if(floor(pos) != vec2(0.0)) {
                    //sky is not contant emission everywhere its infinitely far away
                    r.rad = vec3(0.0);
                    r.tran = 1.0;
                    return r;
                }

                vec4 s = texture(cRays, pos);
                r.rad = s.rgb;
                r.tran = s.a;

                return r;
            }

            vec3 nextCone(vec2 probe, int ind, float top, float bottom) {

                vec2 pos = vec2(probe.x + float(ind), floor(probe.y) / float(opt) + 0.5);
                pos /= vec2(coneSize);

                if(floor(pos) == vec2(0.0)) return texture(nCones, pos).rgb;

                //atp sample sky, get corresponding weight for the next cone
                //our dir is going to be the middle of the cone

                float angle = (top + bottom) / 2.0; //this is fine because consecutive rays in c1 and above never jump quadrants

                if(angle < 0.0) angle += TAU; //cvrt -pi..0 to pi..2pi
                angle += TAU / 4.0 * float(frustum);
                angle = mod(angle, TAU);
                angle = angle / TAU;

                vec4 ss = texture(sky, vec2(angle, 0.5)); //linear
                return ss.rgb * (top - bottom);
            }

            void main() {
                ivec2 coord = ivec2(gl_FragCoord.xy);

                int twoN = 1 << cascade;
                int twoN1 = twoN * 2;
                int rays = twoN + 1;

                int plane = coord.x / twoN;
                int ind = coord.x % twoN;

                vec2 probe = vec2(plane * twoN, coord.y * opt) + 0.5;

                int even = plane % 2 == 0 ? 2 : 1;

                ivec2 dRay = ivec2(twoN, 2 * ind - twoN);
                ivec2 uRay = ivec2(twoN, 2 * (ind + 1) - twoN);

                int dCone = ind * 2;
                int uCone = ind * 2 + 1;

                //A_n+1(j) = ang(v_n+1(j + 1/2)) - ang(v_n+1(j - 1/2)) eq 13 there is a little switch up between the paper and integer indexes here
                float one = atan(float(2 * dCone - twoN1), float(twoN1));
                float two = atan(float(2 * uCone - twoN1), float(twoN1));
                float three = atan(float(2 * (uCone + 1) - twoN1), float(twoN1));

                float dWeight = two - one;
                float uWeight = three - two;

                Light dTrace = curRay(plane, ind, probe, rays);
                Light uTrace = curRay(plane, ind + 1, probe, rays);

                vec3 dVal = nextCone(probe + vec2(even * dRay), dCone, two, one);
                vec3 uVal = nextCone(probe + vec2(even * uRay), uCone, three, two);

                vec3 dRad = dWeight * dTrace.rad + dTrace.tran * dVal;
                vec3 uRad = uWeight * uTrace.rad + uTrace.tran * uVal;

                if(even == 2) {
                    Light dTraceNext = curRay(plane + 1, ind,  probe + vec2(dRay), rays);
                    Light uTraceNext = curRay(plane + 1, ind + 1, probe + vec2(uRay), rays);

                    vec3 dRayRad = dTrace.rad + (dTrace.tran * dTraceNext.rad);
                    float dRayTran = dTrace.tran * dTraceNext.tran;

                    vec3 uRayRad = uTrace.rad + (uTrace.tran * uTraceNext.rad);
                    float uRayTran = uTrace.tran * uTraceNext.tran;

                    dRad = dWeight * dRayRad + dRayTran * dVal;
                    uRad = uWeight * uRayRad + uRayTran * uVal;

                    vec3 dNear = nextCone(probe, dCone, 0.0, 0.0);
                    vec3 uNear = nextCone(probe, uCone, 0.0, 0.0);

                    dRad = (dRad + dNear) / 2.0;
                    uRad = (uRad + uNear) / 2.0;
                }

                fragColor = vec4(dRad + uRad, 1.0);
            }

        `,
    });
}
