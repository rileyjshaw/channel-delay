import basicSsl from '@vitejs/plugin-basic-ssl';
import glsl from 'vite-plugin-glsl';

export default {
	base: '/channel-delay/',
	plugins: [basicSsl(), glsl()],
	server: {
		https: true,
		host: true,
	},
};
