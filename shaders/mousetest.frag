#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_mouse;
uniform mat4 u_mouseClickPositions;

float sdSegment( in vec2 p, in vec2 a, in vec2 b )
{
    vec2 pa = p-a, ba = b-a;
    float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
    return length( pa - ba*h );
}

void main() {
	vec2 screen = gl_FragCoord.xy;
    vec3 color = vec3(distance(screen, u_mouse) < 5. ? 1. : 0., 0., 0.);

	#define SEGMENT(index) if(u_mouseClickPositions[index].x >= 0.) { \
		float dist = sdSegment( \
			screen, \
			u_mouseClickPositions[index].xy, \
			u_mouseClickPositions[index].z < 0. ? u_mouse : u_mouseClickPositions[index].zw \
		); \
		color += float(dist < 5.); \
	}
	
	SEGMENT(0)
	SEGMENT(1)
	SEGMENT(2)
	SEGMENT(3)

    gl_FragColor = vec4(color, 1.);
}