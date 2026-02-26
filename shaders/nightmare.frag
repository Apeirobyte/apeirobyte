#ifdef GL_ES
precision highp float;
#endif

uniform vec2 u_resolution;
uniform float u_time;

// Random and noise functions by Inigo Quilez - iq/2013
// Modified to take advantage of SIMD
vec4 randomParallel(vec4 st) {
	st = vec4(
		dot(st.xy, vec2(127.1, 311.7)),
		dot(st.xy, vec2(269.5, 183.3)),
		dot(st.zw, vec2(127.1, 311.7)),
		dot(st.zw, vec2(269.5, 183.3))
	);
	return 2. * fract(sin(st) * 43758.5453123) - 1.;
}

vec2 noiseParallel(vec4 st) {
	const vec2 o = vec2(0., 1.);
	vec4 i = floor(st);
	vec4 f = fract(st);
	vec4 u = f * f * (3. - 2. * f);
	vec4 r1 = randomParallel(i + o.xxxx);
	vec4 r2 = randomParallel(i + o.yxyx);
	vec4 r3 = randomParallel(i + o.xyxy);
	vec4 r4 = randomParallel(i + o.yyyy);
	return vec2(
		mix(mix(dot(r1.xy, f.xy),
				dot(r2.xy, f.xy - o.yx), u.x),
			mix(dot(r3.xy, f.xy - o.xy),
				dot(r4.xy, f.xy - o.yy), u.x), u.y),
		mix(mix(dot(r1.zw, f.zw),
				dot(r2.zw, f.zw - o.yx), u.z),
			mix(dot(r3.zw, f.zw - o.xy),
				dot(r4.zw, f.zw - o.yy), u.z), u.w)
	);
}

void main() {
	vec2 uv = gl_FragCoord.xy / u_resolution.xy;

	vec2 coord = uv * 5. - 2.5;
	coord.x *= u_resolution.x / u_resolution.y;

    vec2 transformedCoord = coord + vec2(sin(coord.y * 70. - u_time * -50.), 0.) * .5;

	#define NOISE_LAYERS(colorDecl, hue1, hue2)                                     \
		/* hsv2rgb from https://gist.github.com/983/e170a24ae8eba2cd174f */         \
		const vec4 K = vec4(1., 2./3., 1./3., 3.);                                  \
		const vec3 P1 = abs(fract(vec3(hue1) + K.xyz) * 6. - K.www);                \
		const vec3 P2 = abs(fract(vec3(hue2) + K.xyz) * 6. - K.www);                \
		const vec3 noiseColor1 = clamp(P1 - K.xxx, 0., 1.);                         \
		const vec3 noiseColor2 = clamp(P2 - K.xxx, 0., 1.);                         \
		const vec4 hueVec = vec4(.5 * hue1, .5 * hue2, 2. + hue1, 2. + hue2);       \
		vec2 value = .4 * noiseParallel(transformedCoord.xyxy * hueVec.xxyy - vec4( \
			hue1, u_time * hueVec.z,                                                \
			hue2, u_time * hueVec.w                                                 \
		)) + .135;                                                                  \
		colorDecl noiseColor1 * value.x + noiseColor2 * value.y;

	  NOISE_LAYERS(vec3 color =, .0, .1)
	{ NOISE_LAYERS(color +=,     .2, .3) }
	{ NOISE_LAYERS(color +=,     .4, .5) }
	{ NOISE_LAYERS(color +=,     .6, .7) }
	{ NOISE_LAYERS(color +=,     .8, .9) }
	
	color *= fract(sin(dot(transformedCoord, vec2(12.9898, 78.233))) * 43758.5453123) * .3 + .9;
	color *= smoothstep(0., 1., 3. - 5.5 * abs(uv.x - .5));

	gl_FragColor = vec4(color, 1.);
}