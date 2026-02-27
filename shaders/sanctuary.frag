#ifdef GL_ES
precision highp float;
#endif

const float TAU = 6.28318530718;

const vec3 bgColor = vec3(0.);
const vec3 lineColor = vec3(.3, 0., .15);
const vec3 fgColorLight = vec3(0.940, 0.435, 0.679);
const vec3 fgColorDark = vec3(0.470, 0.160, 0.275);

const float numRings = 10.;
const float lineThickness = .00675;

uniform vec2 u_resolution;
uniform float u_time;

float random(float seed) {
	return fract(sin(dot(vec2(seed), vec2(12.9898, 78.233))) * 43758.5453123);
}

void sineColor(inout vec3 color, vec3 newColor, float period, float threshold, float x, float alpha) {
	color = mix(color, newColor, sin(TAU * x / period) > threshold ? alpha : 0.);
}
 
void createRing(inout vec3 color, vec2 screen) {
	float ring = floor(length(screen) * numRings);
	float numSegments = floor(4. + random(ring) * 4.);
	float angle = random(ring * 1.7) * TAU;
	vec3 newColor = mix(fgColorDark, fgColorLight, .5 + .5 * sin(u_time * -4. - ring));
	sineColor(color, newColor, TAU / numSegments, random(ring * 2.17) - .5, atan(screen.y, screen.x) + angle, .7);
}

void main() {
	vec3 color = bgColor;
	vec2 screen = gl_FragCoord.xy / u_resolution.xy * 2. - 1.;
	screen.x *= u_resolution.x / u_resolution.y;

	float line = floor(screen.y / lineThickness);
	float lineSign = mod(line, 2.) * 2. - 1.;
	sineColor(color, lineColor, .2 + random(line * 122.3254), .9, screen.x + u_time * lineSign * 3., 1.);
	color *= smoothstep(0., 1., min(length(screen) * .5, 1.));
	
	vec2 displacement = vec2(sin(screen.y * 5. + u_time * 3.) / 15., 0.);
	createRing(color, screen + displacement);
	createRing(color, screen + displacement.yx);

	gl_FragColor = vec4(color, 1.);
}