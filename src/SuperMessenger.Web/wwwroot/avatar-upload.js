window.AvatarUpload = {
	MAX_DIMENSION: 1200,

	async compress(file, maxSize = 1200, quality = 0.85) {
		if (!file || !file.type.startsWith('image/')) return file;
		return new Promise((resolve) => {
			const img = new Image();
			const objUrl = URL.createObjectURL(file);
			img.onload = () => {
				URL.revokeObjectURL(objUrl);
				let w = img.naturalWidth;
				let h = img.naturalHeight;
				if (w === 0 || h === 0) { resolve(file); return; }
				if (w > maxSize || h > maxSize) {
					if (w >= h) { h = Math.round(h * maxSize / w); w = maxSize; }
					else { w = Math.round(w * maxSize / h); h = maxSize; }
				}
				const canvas = document.createElement('canvas');
				canvas.width = w;
				canvas.height = h;
				canvas.getContext('2d').drawImage(img, 0, 0, w, h);
				canvas.toBlob(blob => {
					if (!blob) { resolve(file); return; }
					resolve(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
				}, 'image/jpeg', quality);
			};
			img.onerror = () => { URL.revokeObjectURL(objUrl); resolve(file); };
			img.src = objUrl;
		});
	},
};
