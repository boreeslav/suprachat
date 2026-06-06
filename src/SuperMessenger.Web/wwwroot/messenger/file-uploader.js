(function (window) {
    'use strict';
    const KB = 1024;
    const MB = KB * KB;
    const GB = MB * KB;
    const support = (function () {
        const hasFile     = !!window.File;
        const hasReader   = !!window.FileReader;
        const hasFormData = !!window.FormData;
        const hasUint8    = !!window.Uint8Array;
        const hasBlob     = !!window.Blob;
        const html5       = hasFile && (hasReader && hasUint8 || hasFormData);
        const chunked     = html5 && hasBlob && !!(
            Blob.prototype.slice ||
            Blob.prototype.mozSlice ||
            Blob.prototype.webkitSlice
        );
        const cors = html5 && ('withCredentials' in new XMLHttpRequest());
        return { html5, chunked, cors };
    })();
    function each(collection, iterator) {
        if (!collection) return;
        if (Array.isArray(collection)) {
            collection.forEach(iterator);
        } else {
            Object.keys(collection).forEach(key => iterator(collection[key], key, collection));
        }
    }
    let _uidCounter = 0;
    function uid() {
        return 'fu_' + Date.now() + '_' + (++_uidCounter);
    }
    function createXHR() {
        if (window.XMLHttpRequest) return new XMLHttpRequest();
        if (window.ActiveXObject) {
            try { return new ActiveXObject('MSXML2.XMLHttp.3.0'); } catch (e) {}
        }
        return null;
    }
    function getBlobSliceFn(blob) {
        return blob.slice || blob.mozSlice || blob.webkitSlice;
    }
    function generateGUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
        });
    }
    function resolveData(rawData, file) {
        if (!rawData) return {};
        const resolved = {};
        Object.keys(rawData).forEach(key => {
            const val = rawData[key];
            resolved[key] = typeof val === 'function' ? val(file) : val;
        });
        return resolved;
    }
    function tryParseJSON(xhr) {
        try {
            return JSON.parse(xhr.responseText);
        } catch (e) {
            return null;
        }
    }
    function parseServerError(xhr) {
        const httpStatus = xhr.status;
        const body       = tryParseJSON(xhr);
        if (httpStatus && httpStatus !== 200 && httpStatus !== 201) {
            let message = `HTTP ${httpStatus}`;
            let code    = String(httpStatus);
            if (body) {
                if (typeof body.error === 'string') {
                    message = body.error;
                }
                else if (typeof (body.message || body.Message) === 'string') {
                    message = body.message || body.Message;
                    code    = body.code || body.errorCode || code;
                }
            }
            return { message, code, httpStatus, raw: body || xhr.responseText };
        }
        if (body && body.success === false) {
            const errorInfo     = body.errorInfo || body.responseStatus || {};
            const message       = errorInfo.message  || errorInfo.Message  || 'Неизвестная ошибка сервера';
            const code          = errorInfo.errorCode || errorInfo.ErrorCode || 'SERVER_ERROR';
            return { message, code, httpStatus, raw: body };
        }
        return null;
    }
    class EventEmitter {
        constructor() {
            this._handlers = {};
        }
        on(event, handler) {
            if (!this._handlers[event]) this._handlers[event] = [];
            this._handlers[event].push(handler);
            return this;
        }
        off(event, handler) {
            if (!this._handlers[event]) return this;
            this._handlers[event] = this._handlers[event].filter(h => h !== handler);
            return this;
        }
        emit(event, ...args) {
            (this._handlers[event] || []).forEach(h => h(...args));
        }
    }
    class UploadTask extends EventEmitter {
        constructor() {
            super();
            this._aborted     = false;
            this._currentXHR  = null;
            this._queue       = [];
            this._totalSize   = 0;
            this._totalLoaded = 0;
        }
        abort() {
            this._aborted = true;
            if (this._currentXHR) this._currentXHR.abort();
        }
        append(files) {
            const arr = Array.isArray(files) ? files : [files];
            arr.forEach(f => {
                this._queue.push(f);
                this._totalSize += f.size || 0;
            });
        }
    }
    class Form {
        constructor() {
            this.items = [];
        }
        append(name, blob, filename, type) {
            this.items.push({
                name,
                blob : (blob && blob.blob) || blob,
                file : filename || (blob && blob.name),
                type : type    || (blob && blob.type),
            });
        }
        toData(callback, options) {
            const fileItems = this.items.filter(i => i.file);
            const isChunked = support.chunked
                && options.chunkSize > 0
                && fileItems.length === 1;
            isChunked
                ? this._toPlainData(callback)
                : this._toFormData(callback);
        }
        _toPlainData(callback) {
            const result = { params: [] };
            this.items.forEach(item => {
                if (item.file) {
                    result.name  = item.name;
                    result.file  = item.blob;
                    result.size  = item.blob.size;
                    result.type  = item.type || item.blob.type;
                    result.start = -1;
                    result.end   = -1;
                    result.retry = 0;
                } else if (item.blob !== null && item.blob !== undefined) {
                    result.params.push(
                        encodeURIComponent(item.name) + '=' + encodeURIComponent(item.blob)
                    );
                }
            });
            callback(result);
        }
        _toFormData(callback) {
            const fd      = new FormData();
            const pending = [];
            this.items.forEach(item => {
                if (item.blob && typeof item.blob.toBlob === 'function') {
                    pending.push(new Promise(resolve => {
                        item.blob.toBlob(blob => {
                            fd.append(item.name, blob, item.file);
                            resolve();
                        }, 'image/png');
                    }));
                } else if (item.file) {
                    fd.append(item.name, item.blob, item.file);
                } else if (item.blob !== null && item.blob !== undefined) {
                    fd.append(item.name, item.blob);
                }
            });
            pending.length
                ? Promise.all(pending).then(() => callback(fd))
                : callback(fd);
        }
    }
    class XHRSender {
        constructor(options) {
            this.options = options;
            this.xhr     = null;
            this.aborted = false;
        }
        abort() {
            this.aborted = true;
            if (this.xhr) this.xhr.abort();
        }
        send(form, callback) {
            form.toData(data => this._sendData(data, callback), this.options);
        }
        _sendData(data, callback) {
            if (this.aborted) return;
            const opts = this.options;
            const xhr  = createXHR();
            this.xhr   = xhr;
            let url = opts.url + (~opts.url.indexOf('?') ? '&' : '?') + uid();
            const isChunked = data && data.file && data.size !== undefined && opts.chunkSize > 0;
            if (isChunked) {
                if (data.params && data.params.length) {
                    url += '&' + data.params.join('&');
                }
                data.start = data.end + 1;
                data.end   = Math.min(data.start + opts.chunkSize, data.size) - 1;
                const sliceFn = getBlobSliceFn(data.file);
                const chunk   = sliceFn.call(data.file, data.start, data.end + 1);
                xhr.open('POST', url, true);
                xhr.withCredentials = 'true';
                xhr.setRequestHeader('Content-Range',
                    `bytes ${data.start}-${data.end}/${data.size}`);
                xhr.setRequestHeader('Content-Disposition', `attachment;`);
                xhr.setRequestHeader('Content-Type',
                    data.type || 'application/octet-stream');
                xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                each(opts.headers, (val, key) => xhr.setRequestHeader(key, val));
                if (xhr.upload) {
                    xhr.upload.addEventListener('progress', (e) => {
                        if (!data.retry) {
                            callback('progress', { total: data.size, loaded: data.start + e.loaded });
                        }
                    }, false);
                }
                xhr.onreadystatechange = () => {
                    if (xhr.readyState !== 4) return;
                    const serverError = parseServerError(xhr);
                    if (serverError) {
                        const isRetryable = !xhr.status || xhr.status === 500 || xhr.status === 416;
                        const maxRetry    = opts.chunkUploadRetry || 0;
                        const canRetry    = isRetryable && ++data.retry <= maxRetry;
                        if (canRetry && !this.aborted) {
                            const delay     = xhr.status ? 0 : (opts.chunkNetworkDownRetryTimeout || 2000);
                            const lastKnown = xhr.getResponseHeader('X-Last-Known-Byte');
                            data.end = lastKnown ? parseInt(lastKnown) : data.start - 1;
                            setTimeout(() => this._sendData(data, callback), delay);
                        } else {
                            callback('error', serverError, xhr);
                        }
                        return;
                    }
                    data.retry = 0;
                    data.end >= data.size - 1
                        ? callback('complete', xhr)
                        : this._sendData(data, callback);
                };
                xhr.send(chunk);
            } else {
                xhr.open('POST', url, true);
                xhr.withCredentials = 'true';
                xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                each(opts.headers, (val, key) => xhr.setRequestHeader(key, val));
                if (xhr.upload) {
                    xhr.upload.addEventListener('progress', (e) => {
                        if (e.lengthComputable) {
                            callback('progress', { total: e.total, loaded: e.loaded });
                        }
                    }, false);
                }
                xhr.onreadystatechange = () => {
                    if (xhr.readyState !== 4) return;
                    const serverError = parseServerError(xhr);
                    serverError
                        ? callback('error', serverError, xhr)
                        : callback('complete', xhr);
                };
                xhr.send(data);
            }
        }
    }
    function runUploadQueue(task, options) {
        const files     = task._queue;
        const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
        let fileIndex    = 0;
        let totalLoaded  = 0;
        let prevLoaded   = 0;
        let lastError    = null;
        function processNext() {
            if (task._aborted) {
                task.emit('complete', { message: 'Загрузка отменена', code: 'ABORT', httpStatus: 0, raw: null }, null);
                return;
            }
            if (fileIndex >= files.length) {
                task.emit('complete', lastError, null);
                return;
            }
            const file      = files[fileIndex++];
            const fileSize  = file.size || 0;
            const fileRatio = totalSize > 0 ? fileSize / totalSize : 1;
            let resolvedData = resolveData(options.data, file);
            if (typeof options.prepare === 'function') {
                resolvedData = options.prepare(file, resolvedData) || resolvedData;
            }
            task.emit('filestart', file, resolvedData);
            const form      = new Form();
            const fieldName = options.fieldName || 'file';
            form.append(fieldName, file, file.name, file.type);
            each(resolvedData, (value, key) => {
                if (value !== null && value !== undefined) {
                    if (typeof value === 'object') {
                        each(value, (v, k) => form.append(`${key}[${k}]`, v));
                    } else {
                        form.append(key, value);
                    }
                }
            });
            const sender = new XHRSender(options);
            task._currentXHR = sender;
            prevLoaded = 0;
            sender.send(form, (event, payload, xhr) => {
                if (task._aborted) return;
                if (event === 'progress') {
                    const { loaded, total } = payload;
                    const fileLoaded   = Math.min(loaded, total);
                    const chunkContrib = Math.round(totalSize * fileRatio * (loaded / total));
                    const delta = chunkContrib - prevLoaded;
                    if (delta > 0) { totalLoaded += delta; prevLoaded = chunkContrib; }
                    task.emit('progress', {
                        loaded     : totalLoaded,
                        total      : totalSize,
                        percent    : totalSize > 0 ? Math.min(100, Math.round(totalLoaded / totalSize * 100)) : 0,
                        fileName   : file.name,
                        fileLoaded : fileLoaded,
                        fileTotal  : total,
                        filePercent: total > 0 ? Math.min(100, Math.round(fileLoaded / total * 100)) : 0,
                        fileIndex  : fileIndex - 1,
                        filesTotal : files.length,
                    });
                } else if (event === 'complete') {
                    totalLoaded += fileSize - prevLoaded;
                    prevLoaded   = 0;
                    task.emit('progress', {
                        loaded     : totalLoaded,
                        total      : totalSize,
                        percent    : totalSize > 0 ? Math.min(100, Math.round(totalLoaded / totalSize * 100)) : 100,
                        fileName   : file.name,
                        fileLoaded : fileSize,
                        fileTotal  : fileSize,
                        filePercent: 100,
                        fileIndex  : fileIndex - 1,
                        filesTotal : files.length,
                    });
                    processNext();
                } else if (event === 'error') {
                    lastError = payload;
                    task.emit('error', payload, xhr);
                    processNext();
                }
            });
        }
        processNext();
    }
    function openPicker(opts = {}) {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type  = 'file';
            input.className = 'mc-file-input-hidden';
            if (opts.multiple) input.multiple = true;
            if (opts.camera) {
                input.accept  = opts.accept || 'image/*,video/*';
                input.capture = opts.cameraFacing || 'environment';
            } else {
                if (opts.accept) input.accept = opts.accept;
            }
            const cleanup = () => {
                input.removeEventListener('change', onChange);
                window.removeEventListener('focus', onWindowFocus);
                if (input.parentNode) input.parentNode.removeChild(input);
            };
            const onChange = () => {
                cleanup();
                const files = Array.from(input.files || []);
                files.length
                    ? resolve(files)
                    : reject(new Error('Файлы не выбраны'));
            };
            const onWindowFocus = () => {
                window.removeEventListener('focus', onWindowFocus);
                setTimeout(() => {
                    if (!input.files || !input.files.length) {
                        cleanup();
                        reject(new Error('Диалог закрыт без выбора файла'));
                    }
                }, 300);
            };
            input.addEventListener('change', onChange);
            window.addEventListener('focus', onWindowFocus);
            document.body.appendChild(input);
            input.click();
        });
    }
    const FileUploader = {
        KB,
        MB,
        GB,
        support,
        generateGUID,
        /** Same picker as chat attach (file input / capture). Resolves with File[]. */
        pickFiles: openPicker,
        upload(options) {
            if (!options || !options.url) {
                throw new Error('FileUploader.upload: параметр url обязателен');
            }
            const task = new UploadTask();
            const startUpload = (files) => {
                if (!files || files.length === 0) {
                    task.emit('complete', { message: 'Файлы не переданы', code: 'NO_FILES', httpStatus: 0, raw: null }, null);
                    return;
                }
                files.forEach(f => {
                    task._queue.push(f);
                    task._totalSize += f.size || 0;
                });
                runUploadQueue(task, options);
            };
            if (options.openCamera || options.openFilePicker) {
                openPicker({
                    camera       : !!options.openCamera,
                    cameraFacing : options.cameraFacing || 'environment',
                    accept       : options.accept,
                    multiple     : !!options.multiple,
                }).then(files => {
                    task.emit('selected', files);
                    startUpload(files);
                }).catch(err => {
                    const error = { message: err.message, code: 'PICKER_CLOSED', httpStatus: 0, raw: null };
                    task.emit('error', error, null);
                    task.emit('complete', error, null);
                });
            } else {
                const raw   = options.file || options.files;
                const files = Array.isArray(raw) ? raw : (raw ? [raw] : []);
                if (files.length === 0) {
                    throw new Error(
                        'FileUploader.upload: укажите file/files или используйте openFilePicker/openCamera'
                    );
                }
                setTimeout(() => startUpload(files), 0);
            }
            return task;
        },
    };
    if (typeof define === 'function' && define.amd) {
        define([], () => FileUploader);
    } else if (typeof module !== 'undefined' && module.exports) {
        module.exports = FileUploader;
    } else {
        window.FileUploader = FileUploader;
    }
})(typeof window !== 'undefined' ? window : this);
