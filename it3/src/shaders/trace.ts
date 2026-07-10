import * as THREE from "three";

//https://threejs.org/examples/?q=rendertar#webgl_multiple_rendertargets
//above is only needed for full transmittance

export function hrcTrace() {
    return new THREE.ShaderMaterial({
        uniforms: {
            cascade: { value: null },
            frustum: { value: null },
            opt: { value: null },

            scene: { value: null },
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

            uniform int cascade;
            uniform int frustum;
            uniform int opt;

            uniform sampler2D scene;
            uniform ivec2 size;

            out vec4 fragColor;

            struct Light {
                vec3 rad;
                float tran;
            };

            Light DDA(vec2 probe, vec2 dir) {
                Light r;
                r.rad = vec3(0.0);
                r.tran = 1.0;

                vec2 sgn = sign(dir);
                vec2 base = floor(probe);

                vec2 dist = vec2(sqrt(1.0 + (dir.y / dir.x) * (dir.y / dir.x)),
                                 sqrt(1.0 + (dir.x / dir.y) * (dir.x / dir.y)));

                vec2 frac = fract(probe);
                vec2 ray;

                ray.x = (dir.x < 0.0) ? (frac.x * dist.x) : ((1.0 - frac.x) * dist.x);
                ray.y = (dir.y < 0.0) ? (frac.y * dist.y) : ((1.0 - frac.y) * dist.y);

                float cur = 0.0;
                float mx = length(dir);

                for(int i = 0; ; ++i) {
                    if(cur >= mx) break;
                    float next = min(ray.x, ray.y);
                    float step = min(next, mx) - cur;
                    cur = next;

                    vec2 c = (base + 0.5) / vec2(size);

                    if(floor(c) != vec2(0.0)) {
                        //we reached the sky!
                        break;
                    }

                    //rotating idea from yaazarai's but without flipping, old syntax was breaking mobile
                    //also be careful where uv(0, 0) is changes the below eqs
                    vec2 rotate[4];
                    rotate[0] = c;
                    rotate[1] = vec2(1.0 - c.y, c.x);
                    rotate[2] = 1.0 - c;
                    rotate[3] = vec2(c.y, 1.0 - c.x);

                    //ok so this part is a little confusing, first of rn absortion values are between 0 to 1 but absrp 1 gives tran = 0.24 at max step length so it can be bigger?
                    //way to think about this is if absrp is 0.0 then transmittance is 1.0 meaning all light passes through and emits none
                    //if absrp going to infinity then transmittance is going to 0. If absrp inf then only emit, anywhere in between means you emit some and let some
                    //but also eq 4 on the paper comes out to be divided by absrp but we don't do that?

                    //what I dont understand is, if absrp 0.0 lets all the light through then a light source should have infinite absrp for this to properly work?
                    //but then you would also divide by inf absrp???? i dont know maybe this is a problem of representing things in the 0 to 1 range
                    //logic is if absrp 1 then its a fully opaque object. if absrp remained 1.0 then tran becomes 0.24 - 0.36 which is not what we want
                    //you could also just give absrp values > 1 to the texture which probably makes more sense than just jumping the value but again anything below 1 becomes related to volumetrics
                    //even with volumetrics since anything absrp > 0 leads to tran being < 1, in just a few steps l.tran becomes small anyways so it shouldnt differ much
                    //anyways since I overlay opque surface that is handled

                    //whaaa? look later

                    vec4 s = pow(texture(scene, rotate[frustum]), vec4(2.2));
                    vec3 emiss = s.rgb;
                    float absrp = s.a;

                    float tran = exp(-absrp * step); //eq2
                    vec3 rad = emiss * (1.0 - tran); //eq4 (no absrp div)

                    r.rad += r.tran * rad; //eq5
                    r.tran *= tran; //eq6

                    if (ray.x < ray.y) {
                        base.x += sgn.x;
                        ray.x += dist.x;
                    } else {
                        base.y += sgn.y;
                        ray.y += dist.y;
                    }
                }

                return r;
            }

            void main() {
                ivec2 coord = ivec2(gl_FragCoord.xy);

                int twoN = 1 << cascade;
                int rays = twoN + 1;

                int plane = coord.x / rays;
                int ind = coord.x % rays;

                vec2 probe = vec2(plane * twoN, coord.y * opt) + 0.5;
                ivec2 dir = ivec2(twoN, 2 * ind - twoN);

                Light trace = DDA(probe, vec2(dir));

                fragColor = vec4(trace.rad, trace.tran);
            }

        `,
    });
}
