(function (global) {
	'use strict';

	const PROTO = 1;
	const pending = new Map();

	function cfg() {
		return global.__SUPRA_MINI_APP__ || {};
	}

	function post(type, payload, requestId) {
		global.parent.postMessage({
			v: PROTO,
			type,
			requestId: requestId || null,
			payload: payload ?? null,
		}, global.location.origin);
	}

	function request(type, payload) {
		return new Promise((resolve, reject) => {
			const requestId = 'r_' + Date.now() + '_' + Math.random().toString(36).slice(2);
			pending.set(requestId, { resolve, reject });
			post(type, payload, requestId);
			setTimeout(() => {
				if (pending.has(requestId)) {
					pending.delete(requestId);
					reject(new Error('timeout'));
				}
			}, 15000);
		});
	}

	global.addEventListener('message', (event) => {
		if (event.source !== global.parent) return;
		const data = event.data;
		if (!data || data.v !== PROTO || !data.requestId) return;
		const slot = pending.get(data.requestId);
		if (!slot) return;
		pending.delete(data.requestId);
		if (data.error) slot.reject(new Error(data.error));
		else slot.resolve(data.payload);
	});

	global.SupraMiniApp = {
		ready() { post('ready'); },
		close() { post('close'); },
		sendData(payload) { return request('sendData', payload); },
		getUser() { return request('getUser'); },
		getContext() { return request('getContext'); },
		getInitData() { return cfg().initData ?? null; },
	};
})(typeof window !== 'undefined' ? window : globalThis);
