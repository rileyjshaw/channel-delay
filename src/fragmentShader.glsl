#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;
uniform highp sampler2DArray u_inputStream;
uniform int u_frame;
uniform vec2 u_resolution;
uniform int u_frameDelay;

// Crop the texture to preserve its aspect ratio (object-fit: contain).
vec2 correctAspectRatio(vec2 uv, vec2 canvasResolution, vec2 textureResolution) {
	float canvasAspect = canvasResolution.x / canvasResolution.y;
	float textureAspect = textureResolution.x / textureResolution.y;
	vec2 scale = vec2(min(canvasAspect / textureAspect, 1.0), min(textureAspect / canvasAspect, 1.0));
	return (uv - 0.5) * scale + 0.5;
}

void main() {
	ivec3 texSize = textureSize(u_inputStream, 0);
	vec2 textureResolution = vec2(texSize.xy);
	int historyDepth = texSize.z;

	vec2 uv = vec2(1.0 - v_uv.x, v_uv.y); // Selfie mode: flip X-axis.
	uv = correctAspectRatio(uv, u_resolution, textureResolution);

	vec4 redChannel = texture(u_inputStream, vec3(uv, u_frame % historyDepth));
	vec4 greenChannel = texture(u_inputStream, vec3(uv, (u_frame + historyDepth - u_frameDelay) % historyDepth));
	vec4 blueChannel = texture(u_inputStream, vec3(uv, (u_frame + historyDepth - u_frameDelay * 2) % historyDepth));

	outColor = vec4(redChannel.r, greenChannel.g, blueChannel.b, 1.0);
}
