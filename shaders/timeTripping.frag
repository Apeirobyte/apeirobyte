#ifdef GL_ES
precision highp float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_inverseModeContrast;

const vec3 backgroundColor = vec3(0.222, 0.012, 0.575);
const vec3 cloudColor = vec3(0.990, 0.780, 0.937);

const float PI  = 3.14159265359;
const float TAU = 6.28318530718;

// Individual Letters
bool I(vec2 coord) {
    float offset = max(0., abs(coord.y) * 13. - 5.5);
    return abs(coord.x) - .1 * offset < .05;
}

bool V(vec2 coord) {
    return I(vec2(
    	abs(coord.x) - .075 - coord.y * .25,
        max(coord.y, 0.)
    ));
}

bool X(vec2 coord) {
    return I(vec2(
    	abs(coord.x) - abs(coord.y) * .4,
        coord.y
    ));
}

// Combinations
bool II(vec2 coord) {
    coord.x = abs(abs(coord.x) - .12);
    return I(coord);
}

bool III(vec2 coord) {
    coord.x = abs(abs(abs(coord.x) - .12) - .12);
    return I(coord);
}

bool IV(vec2 coord) {
    return I(coord + vec2(0.3,0.)) || V(coord - vec2(0.1,0.));
}

bool VI(vec2 coord) {
    return I(coord - vec2(0.3,0.)) || V(coord + vec2(0.1,0.));
}

bool VII(vec2 coord) {
    return II(coord - vec2(0.3084375,0.)) || V(coord + vec2(0.2265625,0.));
}

bool VIII(vec2 coord) {
    return III(coord - vec2(0.316875,0.)) || V(coord + vec2(0.353125,0.));
}

bool IX(vec2 coord) {
    return I(coord + vec2(0.3,0.)) || X(coord - vec2(0.1,0.));
}

bool XI(vec2 coord) {
    return I(coord - vec2(0.3,0.)) || X(coord + vec2(0.1,0.));
}

bool XII(vec2 coord) {
    return II(coord - vec2(0.3084375,0.)) || X(coord + vec2(0.2265625,0.));
}

// Letter Picker
bool romanNumeral(vec2 coord, float number) {
    if(abs(coord.y) >= .5)
        return false;

    if(number < 6.) {
        if(number < 3.) {
            if(number == 0.)
                return I(coord);
            else if(number == 1.)
                return II(coord);
            else
                return III(coord);
        } else {
            if(number == 3.)
                return IV(coord);
            else if(number == 4.)
                return V(coord);
            else
                return VI(coord);
        }
    } else {
        if(number < 9.) {
            if(number == 6.)
                return VII(coord);
            else if(number == 7.)
                return VIII(coord);
            else
                return IX(coord);
        } else {
            if(number == 9.)
                return X(coord);
            else if(number == 10.)
                return XI(coord);
            else
                return XII(coord);
        }
    }
}

// Random Function by Inigo Quilez
vec2 random(vec2 st) {
    st = vec2(dot(st,vec2(127.1, 311.7)),
              dot(st,vec2(269.5, 183.3)));
    return 2. * fract(sin(st) * 43758.5453123) - 1.;
}

// Gradient Noise by Inigo Quilez
// https://www.shadertoy.com/view/XdXGW8
// Modified to loop seamlessly
float loopingNoise(vec2 st, float size) {
    vec2 i = floor(st) + 524288.;
    vec4 m = mod(vec4(i, i + 1.), size);
    vec2 f = fract(st);
    vec4 v = vec4(f, f - 1.);
    vec2 u = f * f * (3. - 2. * f);
    return mix(mix(dot(random(m.xy), f),
                   dot(random(m.zy), v.zy), u.x),
               mix(dot(random(m.xw), v.xw),
                   dot(random(m.zw), v.zw), u.x), u.y);
}

// Hue Shift by Vmedea
// https://gist.github.com/mairod/a75e7b44f68110e1576d77419d608786?permalink_comment_id=4438484#gistcomment-4438484
vec3 hueShift(vec3 color, float dhue) {
	float s = sin(dhue);
	float c = cos(dhue);
	return (color * c) + (color * s) * mat3(
		vec3(0.167444, 0.329213, -0.496657),
		vec3(-0.327948, 0.035669, 0.292279),
		vec3(1.250268, -1.047561, -0.202707)
	) + dot(vec3(0.299, 0.587, 0.114), color) * (1.0 - c);
}

void main() {
	vec3 shiftedBackgroundColor = hueShift(backgroundColor, u_time * (u_inverseModeContrast > 0. ? TAU / -4. : TAU / -48.));
	vec3 shiftedCloudColor = hueShift(cloudColor, u_time * (u_inverseModeContrast > 0. ? TAU / -4. : TAU / -288.));

    vec2 coord = (gl_FragCoord.xy / u_resolution.xy) * 50. - 25.;
    coord.x *= u_resolution.x / u_resolution.y;

    float angle = atan(coord.y, coord.x);
    float distance = length(coord);
    float perspectiveDistance = (u_inverseModeContrast > 0. ? 90. : 120.) / distance;
    
    float cloudAlpha = .5 + .5 * loopingNoise(vec2(angle / PI * 15. + 2. * u_time - distance * .125, perspectiveDistance), 15.);
    cloudAlpha *= clamp(distance * .1 - .2, 0., 1.);
    vec3 color = mix(shiftedBackgroundColor, shiftedCloudColor, cloudAlpha);

    vec2 speedLineRandom = random(vec2(floor(angle * 128.) * .0078125));
    float speedLineAlpha = clamp(distance * .05 - .2, 0., .5);
    color += speedLineAlpha * max(0., cos(u_time * 5. + perspectiveDistance + 3235.4325 * speedLineRandom.x) - 1.3 - speedLineRandom.y);
    
	angle += u_time * 3.2;
    float spiralOffset = (angle + perspectiveDistance) / TAU;
    vec2 spiralCoord = vec2(
        floor(spiralOffset) - angle / TAU + u_time * .6,
    	fract(spiralOffset)
    );
    
    float clockAlpha = smoothstep(0., 1., distance * .25 - 1.) * float(spiralCoord.y < .725);
    float clockBackground = smoothstep(0., 1., .25 + 1.5 * spiralCoord.y);
    bool clockForeground = romanNumeral(
    	vec2(fract(spiralCoord.x * 12.) - .5, -1.3 * (spiralCoord.y - .5) - .15) * 2.,
        floor(fract(spiralCoord.x) * 12.)
    )    
        || abs(abs(spiralCoord.y - .06) - .05) < .01
        || (spiralCoord.y < .1 && (
            cos(fract(spiralCoord.x * 60. + 7.5) * TAU) > .95
            || cos(fract(spiralCoord.x * 12. + 1.5) * TAU) > .975
        ))
        || abs(spiralCoord.y - .7) < .025;

    if(u_inverseModeContrast > 0.) {
        color = mix(color, vec3(clockBackground - float(clockForeground)), -u_inverseModeContrast) * clockAlpha;
        
    	float rippleNoise = sin(u_time * 2.5 + loopingNoise(coord * 0.086, 15.) * TAU) * .5 + .75;
        color += shiftedBackgroundColor * (1. - clockAlpha) * rippleNoise * .4;
    } else
        color = mix(color, vec3(clockBackground - float(clockForeground)), clockAlpha);

    gl_FragColor = vec4(color, 1.);
}