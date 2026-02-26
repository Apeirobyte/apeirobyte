#ifdef GL_ES
precision highp float;
#endif

const float maxZ = 100.;
const vec3 baseColor = vec3(.156862745, .0, .392156863);

uniform vec2 u_resolution;
uniform float u_time;

// Gradient Noise by Inigo Quilez - iq/2013
// https://www.shadertoy.com/view/XdXGW8
vec2 random(vec2 st) {
    st = vec2(dot(st,vec2(127.1, 311.7)),
              dot(st,vec2(269.5, 183.3)));
    return 2. * fract(sin(st) * 43758.5453123) - 1.;
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    vec2 u = f * f * (3. - 2. * f);
    return mix(mix(dot(random(i), f),
                   dot(random(i + vec2(1., 0.)), f - vec2(1., 0.)), u.x),
               mix(dot(random(i + vec2(0., 1.)), f - vec2(0., 1.)),
                   dot(random(i + vec2(1., 1.)), f - vec2(1., 1.)), u.x), u.y);
}

void main() {
    vec2 stretchedCoord = gl_FragCoord.xy / u_resolution.xy - .5;
    vec2 coord = stretchedCoord * vec2(u_resolution.x / u_resolution.y, 1.);
    
    // Background
    vec3 color = baseColor - noise(coord + u_time * vec2(.083, .133)) * .286;
    
    // Nebula
    vec2 nebulaCoord = coord * 3. + vec2(u_time * .0625, 0.);
    color = max(color - noise(nebulaCoord + noise(nebulaCoord * 2.1)) * .125, 0.);
    
    // Vignette
    color *= 1. - .5 * length(stretchedCoord);
    
	// Stars
    for(float z = 0.; z <= maxZ; z += 10.) {
        float actualZ = mod(z - 10. * u_time, maxZ);
        vec2 planeCoord = coord * actualZ;
		vec2 floorCoord = floor(planeCoord);
		
		// Unlikely to be true, so the performance impact of branching is less than the impact of all the calculations done
		if(fract(sin(dot(z * floorCoord, vec2(12.9898, 78.233))) * 43758.5453123) > .93) {
			float randomValue = tan(floorCoord.x + floorCoord.y * .1371 + z);
			
			// Offset
			vec2 offset = .5 + .4 * vec2(cos(randomValue), sin(randomValue));
			
			// Color
			float temperature = fract(randomValue * 69.420) - .5;
			vec3 starColor = min(1. + temperature * vec3(.6, -.6, -.6), 1.);
			
			// Shape
			float radius = .05 + fract(randomValue * 7.1773) * .05;
			color += starColor * max(0., 1. - distance(fract(planeCoord), offset) / radius)
                * smoothstep(0., 1., (maxZ - actualZ) / maxZ);
		}
    }

    gl_FragColor = vec4(color, 1.);
}