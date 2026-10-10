// NAME: Stay Closed
// VERSION: 1.1.0
// DESCRIPTION: Stops the Now Playing view from popping open on its own. It still opens when you open it yourself.

(function stayClosed() {
	// Menu items are built with React, which Spicetify exposes a little after Menu
	if (!document.body || !window.Spicetify?.Menu || !Spicetify.React || !Spicetify.ReactJSX) {
		setTimeout(stayClosed, 300);
		return;
	}

	const STORAGE_KEY = "stayClosed:enabled";
	const NPV = '.NowPlayingView, [data-testid="NPV_Panel_OpenDiv"]';
	// Buttons that toggle the view from the bottom bar
	const TOGGLES = '[data-testid="cover-art-button"], [data-testid="control-button-npv"]';
	// Buttons inside the panel that close it
	const CLOSERS = '[data-testid="PanelHeader_CloseButton"] button, button.Pyr3JzOfPUuqlskJNPRV';
	const INTENT_WINDOW_MS = 1000;
	const MAX_CLOSE_ATTEMPTS = 3;

	let enabled = localStorage.getItem(STORAGE_KEY) !== "false";
	let allowed = false; // true while the open view is one the user asked for
	let lastIntent = 0;
	let wasOpen = false;
	let attempts = 0;
	let forgetTimer = null;

	// Newer Spotify versions keep the view in the page as a thin collapsed strip, so "open" means it has real width
	const MIN_OPEN_WIDTH = 150;
	const isOpen = () => [...document.querySelectorAll(NPV)].some((el) => el.getBoundingClientRect().width >= MIN_OPEN_WIDTH);

	// True for clicks in the right-hand sidebar area (its expand arrow, another panel's close button and so on)
	function inRightSidebar(event) {
		const main = document.querySelector("#main-view") ?? document.querySelector("main");
		const bar = document.querySelector('[data-testid="now-playing-bar"]');
		if (!main) return false;
		const right = main.getBoundingClientRect().right;
		const bottom = bar ? bar.getBoundingClientRect().top : window.innerHeight;
		return event.clientX >= right && event.clientY >= main.getBoundingClientRect().top && event.clientY < bottom;
	}

	function closeView() {
		const panel = document.querySelector(NPV)?.closest("aside, [class*='sidebar' i]") ?? document;
		const button = panel.querySelector(CLOSERS) ?? document.querySelector(CLOSERS) ?? document.querySelector(TOGGLES);
		button?.click();
	}

	function check() {
		const open = isOpen();
		if (open === wasOpen && (!open || allowed || !enabled)) return;

		if (!open) {
			wasOpen = false;
			attempts = 0;
			// The view can remount briefly between tracks, so don't forget the user's choice right away
			clearTimeout(forgetTimer);
			forgetTimer = setTimeout(() => {
				if (!isOpen()) allowed = false;
			}, INTENT_WINDOW_MS);
			return;
		}

		wasOpen = true;
		clearTimeout(forgetTimer);
		if (!enabled || allowed) return;

		if (Date.now() - lastIntent < INTENT_WINDOW_MS) {
			allowed = true;
			return;
		}
		if (attempts++ < MAX_CLOSE_ATTEMPTS) closeView();
	}

	// Only real clicks count, so the click() in closeView is ignored here
	document.addEventListener(
		"click",
		(event) => {
			if (!event.isTrusted || !(event.target instanceof Element)) return;
			const onToggle = event.target.closest(TOGGLES);
			const onCloser = event.target.closest(CLOSERS);
			if (isOpen()) {
				if (onToggle || onCloser) allowed = false;
				// Closing the queue or another panel can hand the sidebar back to the view
				else if (inRightSidebar(event)) lastIntent = Date.now();
			} else if (onToggle || inRightSidebar(event)) {
				lastIntent = Date.now();
			}
		},
		true
	);

	new MutationObserver(check).observe(document.body, { childList: true, subtree: true });
	// The strip can widen into the view without adding or removing elements, which the observer would miss
	setInterval(check, 500);
	check();

	// Spotify has its own setting for this: Settings > "Show the now-playing panel on click of play".
	// Switching it off stops the pop-up at the source, so do that while Stay Closed is on and put the
	// user's own choice back when it is turned off. The watcher above stays as a second line of defence.
	const SPOTIFY_SETTING = "toggleNowPlayingView";
	const ORIGINAL_KEY = "stayClosed:originalSpotifySetting";
	function syncSpotifySetting(triesLeft = 20) {
		const store = Spicetify.Platform?.LocalStorageAPI;
		if (!store?.getItem || !store?.setItem) {
			if (triesLeft > 0) setTimeout(() => syncSpotifySetting(triesLeft - 1), 500);
			return;
		}
		try {
			if (enabled) {
				if (localStorage.getItem(ORIGINAL_KEY) === null) {
					localStorage.setItem(ORIGINAL_KEY, store.getItem(SPOTIFY_SETTING) === false ? "false" : "true");
				}
				if (store.getItem(SPOTIFY_SETTING) !== false) store.setItem(SPOTIFY_SETTING, false);
			} else if (localStorage.getItem(ORIGINAL_KEY) !== null) {
				store.setItem(SPOTIFY_SETTING, localStorage.getItem(ORIGINAL_KEY) !== "false");
				localStorage.removeItem(ORIGINAL_KEY);
			}
		} catch (error) {
			console.warn("[Stay Closed] could not change Spotify's now-playing setting", error);
		}
	}
	syncSpotifySetting();

	new Spicetify.Menu.Item("Stay Closed", enabled, (item) => {
		enabled = !enabled;
		localStorage.setItem(STORAGE_KEY, String(enabled));
		item.setState(enabled);
		syncSpotifySetting();
		check();
	}).register();
})();
