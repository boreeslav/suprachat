(function (g) {

	/** Базовая ширина макета в центральном положении ползунка (CSS px). */

	var BASE_REF_WIDTH = 320;

	/** Порог mobile layout — совпадает с MessengerUtils.isMobile(). */

	var MOBILE_MAX = 680;

	/** −12%, −6%, 0, +6%, +12% относительно центра. */

	var SCALE_MULTIPLIERS = [0.88, 0.94, 1, 1.06, 1.12];

	var DEFAULT_STEP_INDEX = 1;

	var STORAGE_KEY = 'sm-ui-scale-step';



	var DESKTOP_VIEWPORT =

		'width=device-width, initial-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content';



	function clampStep(step) {

		var i = step | 0;

		if (i < 0) return 0;

		if (i >= SCALE_MULTIPLIERS.length) return SCALE_MULTIPLIERS.length - 1;

		return i;

	}



	function loadStep() {

		try {

			var raw = localStorage.getItem(STORAGE_KEY);

			if (raw !== null && raw !== '') return clampStep(parseInt(raw, 10));

		} catch (_) { /* ignore */ }

		return DEFAULT_STEP_INDEX;

	}



	var currentStep = loadStep();



	function viewportMeta() {

		return document.querySelector('meta[name="viewport"]');

	}



	function isMobileViewportTarget() {

		try {

			var sw = screen.width | 0;

			var sh = screen.height | 0;

			if (Math.min(sw, sh) > 0 && Math.min(sw, sh) <= MOBILE_MAX) return true;

		} catch (_) { /* ignore */ }

		return false;

	}



	function deviceLayoutWidth() {

		var w = screen.width | 0;

		return w > 0 ? w : BASE_REF_WIDTH;

	}



	function getScaleMultiplier(step) {

		return SCALE_MULTIPLIERS[clampStep(step == null ? currentStep : step)];

	}



	function getEffectiveRefWidth(step) {

		return BASE_REF_WIDTH / getScaleMultiplier(step);

	}



	function getScalePercentOffset(step) {

		var m = getScaleMultiplier(step);

		return Math.round((m - 1) * 100);

	}



	function mobileViewportContent() {

		var refW = getEffectiveRefWidth();

		var scale = deviceLayoutWidth() / refW;

		var s = scale.toFixed(4);

		return [

			'width=' + Math.round(refW),

			'initial-scale=' + s,

			'maximum-scale=' + s,

			'minimum-scale=' + s,

			'user-scalable=no',

			'viewport-fit=cover',

			'interactive-widget=resizes-content',

		].join(', ');

	}



	function apply() {

		var meta = viewportMeta();

		if (!meta) return;

		var mobile = isMobileViewportTarget();

		var next = mobile ? mobileViewportContent() : DESKTOP_VIEWPORT;

		if (meta.getAttribute('content') !== next) meta.setAttribute('content', next);

		document.documentElement.classList.toggle('sm-mobile-viewport', mobile);

		document.documentElement.style.setProperty(

			'--sm-mobile-ref-width',

			mobile ? Math.round(getEffectiveRefWidth()) + 'px' : '',

		);

		document.documentElement.style.setProperty(

			'--sm-mobile-scale',

			mobile ? String(getScaleMultiplier()) : '',

		);

		document.documentElement.dataset.smUiScaleStep = String(currentStep);

	}



	function setScaleStep(step) {

		currentStep = clampStep(step);

		try { localStorage.setItem(STORAGE_KEY, String(currentStep)); } catch (_) { /* ignore */ }

		apply();

	}



	function getScaleStep() {

		return currentStep;

	}



	g.SmMobileViewport = {

		apply: apply,

		setScaleStep: setScaleStep,

		getScaleStep: getScaleStep,

		getScaleMultiplier: getScaleMultiplier,

		getScalePercentOffset: getScalePercentOffset,

		getEffectiveRefWidth: getEffectiveRefWidth,

		BASE_REF_WIDTH: BASE_REF_WIDTH,

		MOBILE_MAX: MOBILE_MAX,

		SCALE_STEP_COUNT: SCALE_MULTIPLIERS.length,

		DEFAULT_STEP_INDEX: DEFAULT_STEP_INDEX,

		SCALE_MULTIPLIERS: SCALE_MULTIPLIERS.slice(),

	};



	apply();

	g.addEventListener('orientationchange', function () {

		setTimeout(apply, 150);

	});

	g.addEventListener('resize', function () {

		if (!document.documentElement.classList.contains('sm-mobile-viewport')) return;

		apply();

	});

})(window);


