import ShaderPad, { save, history } from 'shaderpad';
import handleTouch from './handleTouch';
import fragmentShaderSrc from './fragmentShader.glsl';

const MIN_FRAME_DELAY = 5;
const MAX_FRAME_DELAY = 60;
const HISTORY_DEPTH = MAX_FRAME_DELAY * 2 + 1;
const MAX_EXPORT_DIMENSION = 1920;

async function getWebcamStream(facingMode = 'user') {
	const video = document.createElement('video');
	video.autoplay = video.playsInline = video.muted = true;

	try {
		const constraints = {
			video: {
				facingMode,
				width: MAX_EXPORT_DIMENSION,
			},
		};
		const stream = await navigator.mediaDevices.getUserMedia(constraints);
		video.srcObject = stream;
		await new Promise(resolve => (video.onloadedmetadata = resolve));
	} catch (error) {
		console.error('Error accessing webcam:', error);
		throw error;
	}

	return video;
}

async function main() {
	// State.
	let currentFacingMode = 'user'; // Selfie camera.
	let frameDelay = 20;

	const app = document.getElementById('app');
	const shutter = document.querySelector('#shutter button');
	app.classList.add('ready');

	let videoInput = await getWebcamStream(currentFacingMode);
	document.body.appendChild(videoInput); // HACK: Desktop Safari won’t update the shader otherwise.

	const shader = new ShaderPad(fragmentShaderSrc, { plugins: [save(), history()] });
	const { canvas } = shader;
	shader.initializeUniform('u_frameDelay', 'int', frameDelay);
	shader.initializeTexture('u_inputStream', videoInput, HISTORY_DEPTH);

	function exportHighRes() {
		shader.pause();
		let exportWidth = videoInput.videoWidth;
		let exportHeight = videoInput.videoHeight;

		if (exportWidth > MAX_EXPORT_DIMENSION || exportHeight > MAX_EXPORT_DIMENSION) {
			const aspectRatio = exportWidth / exportHeight;
			if (exportWidth > exportHeight) {
				exportWidth = MAX_EXPORT_DIMENSION;
				exportHeight = Math.round(MAX_EXPORT_DIMENSION / aspectRatio);
			} else {
				exportHeight = MAX_EXPORT_DIMENSION;
				exportWidth = Math.round(MAX_EXPORT_DIMENSION * aspectRatio);
			}
		}
		const originalWidth = canvas.width;
		const originalHeight = canvas.height;
		canvas.width = exportWidth;
		canvas.height = exportHeight;

		setTimeout(async () => {
			await shader.save('channel-delay');
			canvas.width = originalWidth;
			canvas.height = originalHeight;
			play();
		}, 8);
	}

	function stopWebcamStream() {
		if (videoInput.srcObject) {
			videoInput.srcObject.getTracks().forEach(track => track.stop());
		}
	}

	async function switchCamera() {
		stopWebcamStream();
		const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
		try {
			videoInput = await getWebcamStream(newFacingMode);
			shader.updateTextures({ u_inputStream: videoInput });
			currentFacingMode = newFacingMode;
			document.body.classList.toggle('flipped', newFacingMode === 'environment');
		} catch (error) {
			console.error('Failed to switch camera:', error);
		}
	}

	document.addEventListener('keydown', e => {
		switch (e.key) {
			case 'ArrowUp':
				frameDelay = Math.min(MAX_FRAME_DELAY, frameDelay + 1);
				shader.updateUniforms({ u_frameDelay: frameDelay });
				break;
			case 'ArrowDown':
				frameDelay = Math.max(MIN_FRAME_DELAY, frameDelay - 1);
				shader.updateUniforms({ u_frameDelay: frameDelay });
				break;
			case 's':
				exportHighRes();
				break;
		}
	});

	shutter.addEventListener('click', () => {
		exportHighRes();
	});

	handleTouch(document.body, (direction, diff) => {
		if (diff > 16) lastTapTime = 0;
		if (direction === 'y') {
			frameDelay = Math.max(MIN_FRAME_DELAY, Math.min(MAX_FRAME_DELAY, frameDelay - Math.sign(diff)));
			shader.updateUniforms({ u_frameDelay: frameDelay });
		}
	});

	// Double-tap to switch camera.
	let lastTapTime = 0;
	document.body.addEventListener('touchend', () => {
		const currentTime = Date.now();
		if (currentTime - lastTapTime < 300) {
			switchCamera();
		}
		lastTapTime = currentTime;
	});

	let play = function play() {
		shader.play(() => {
			shader.updateTextures({ u_inputStream: videoInput });
		});
	};
	play();
}

document.addEventListener('DOMContentLoaded', main);
