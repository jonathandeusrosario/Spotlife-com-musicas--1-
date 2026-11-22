const tracks = JSON.parse(document.getElementById("track-data").textContent);
const byId = new Map(tracks.map((track) => [track.id, track]));
const audio = document.getElementById("music-audio");
const player = document.querySelector(".music-app");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const audioDirectory = new URL(".", audio.src);
const search = document.getElementById("track-search");
const progress = document.getElementById("progress");
const volume = document.getElementById("volume");
const playButton = document.getElementById("toggle-play");
const queue = document.getElementById("queue-tracks");
const queueTemplate = document.getElementById("queue-item");
const panel = document.getElementById("now-panel");
const queueButton = document.querySelector(".queue-open");
const main = document.querySelector(".main-panel");
const status = document.getElementById("player-status");
const shuffle = document.getElementById("shuffle");
const repeat = document.getElementById("repeat");
const mute = document.getElementById("mute");
const favorites = new Set();

let current = tracks[0].id;
let playbackOrder = tracks.map((track) => track.id);
let view = "Tudo";

function formatTime(seconds) {
    const time = Number.isFinite(seconds) ? Math.floor(seconds) : 0;
    return `${Math.floor(time / 60)}:${String(time % 60).padStart(2, "0")}`;
}

function updateTimeline() {
    const ready = Number.isFinite(audio.duration) && audio.duration > 0;
    progress.disabled = !ready;
    progress.max = ready ? audio.duration : 1;
    progress.value = ready ? audio.currentTime : 0;
    document.getElementById("elapsed").textContent = formatTime(audio.currentTime);
    document.getElementById("duration").textContent = formatTime(audio.duration);
}

function updatePlayButton() {
    playButton.querySelector("[data-icon-play]").hidden = !audio.paused;
    playButton.querySelector("[data-icon-pause]").hidden = audio.paused;
    playButton.setAttribute("aria-label", audio.paused ? "Reproduzir" : "Pausar");
}

function setPlaybackMotion(playing) {
    player.classList.toggle("is-playing", playing);
}

function updateFavorites() {
    const liked = favorites.has(current);
    document.querySelectorAll("[data-favorite]").forEach((button) => {
        button.setAttribute("aria-pressed", String(liked));
        button.setAttribute("aria-label", liked ? "Remover curtida" : "Curtir faixa");
    });
}

function updateQueue() {
    const nextTracks = playbackOrder.slice(playbackOrder.indexOf(current) + 1, playbackOrder.indexOf(current) + 4);
    const items = nextTracks.map((id) => {
        const track = byId.get(id);
        const button = queueTemplate.content.firstElementChild.cloneNode(true);
        button.dataset.play = id;
        button.querySelector(".cover").classList.add(`cover--${track.art}`);
        button.querySelector("strong").textContent = track.title;
        button.querySelector("small").textContent = track.artist;
        return button;
    });
    if (!items.length) {
        const message = document.createElement("p");
        message.className = "queue-empty";
        message.textContent = "Você chegou ao fim da fila.";
        items.push(message);
    }
    queue.replaceChildren(...items);
}

function updateCurrent() {
    const track = byId.get(current);
    panel.dataset.coverTheme = track.art;
    document.querySelectorAll("[data-current-title]").forEach((node) => { node.textContent = track.title; });
    document.querySelectorAll("[data-current-artist]").forEach((node) => { node.textContent = track.artist; });
    document.querySelectorAll("[data-current-cover] .cover").forEach((node) => {
        const coverClass = `cover--${track.art}`;
        if (node.classList.contains(coverClass)) return;
        node.className = `cover ${coverClass}`;
        if (!reducedMotion.matches) {
            node.getAnimations().forEach((animation) => animation.cancel());
            node.animate([{ opacity: .55 }, { opacity: 1 }], { duration: 240, easing: "ease-out" });
        }
    });
    document.querySelectorAll("[data-track-card]").forEach((node) => {
        node.classList.toggle("is-current", node.dataset.trackCard === current);
    });
    document.querySelectorAll(".rail-cover").forEach((button) => {
        if (button.dataset.play === current) button.setAttribute("aria-current", "true");
        else button.removeAttribute("aria-current");
    });
    updateFavorites();
    updateQueue();
}

function showError() {
    status.textContent = "Não foi possível reproduzir esta faixa.";
    status.hidden = false;
}

async function play() {
    status.hidden = true;
    try {
        await audio.play();
    } catch (error) {
        if (error.name !== "AbortError") showError();
    }
}

function selectTrack(id) {
    if (id !== current) {
        setPlaybackMotion(false);
        current = id;
        audio.src = new URL(`${id}.wav`, audioDirectory).href;
        updateCurrent();
        updateTimeline();
    }
    void play();
}

function step(direction, wrap = true) {
    const index = playbackOrder.indexOf(current) + direction;
    if (index >= 0 && index < playbackOrder.length) {
        selectTrack(playbackOrder[index]);
    } else if (wrap) {
        selectTrack(playbackOrder[(index + playbackOrder.length) % playbackOrder.length]);
    }
}

function normalize(text) {
    return text.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function updateCatalog() {
    const query = normalize(search.value.trim());
    const isHome = view === "Tudo" && !query;
    const title = document.getElementById("catalog-heading");
    const empty = document.getElementById("catalog-empty");
    let count = 0;

    document.getElementById("home-content").hidden = !isHome;
    if (query) title.textContent = "Resultados da busca";
    else if (isHome) title.textContent = "Feito para o seu momento";
    else title.textContent = view === "favorites" ? "Músicas curtidas" : view;

    document.querySelectorAll("[data-track-card]").forEach((card) => {
        const track = byId.get(card.dataset.trackCard);
        const matchesView = view === "Tudo" || (view === "favorites" ? favorites.has(track.id) : view === track.group);
        const matchesQuery = normalize(`${track.title} ${track.artist}`).includes(query);
        card.hidden = !matchesView || !matchesQuery;
        if (!card.hidden) count += 1;
    });

    empty.hidden = count > 0;
    empty.textContent = view === "favorites" && !query
        ? "Toque no coração de uma faixa para encontrá-la aqui."
        : "Nenhuma faixa encontrada.";
}

function changeView(nextView, scroll = true) {
    view = nextView;
    search.value = "";
    document.querySelectorAll("[data-view]").forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.view === view));
    });
    updateCatalog();
    if (scroll) main.scrollTop = 0;
}

function closeQueue() {
    panel.classList.remove("is-open");
    queueButton.setAttribute("aria-expanded", "false");
    queueButton.focus();
}

queueButton.addEventListener("click", () => {
    if (panel.classList.contains("is-open")) {
        closeQueue();
    } else {
        panel.classList.add("is-open");
        queueButton.setAttribute("aria-expanded", "true");
        panel.querySelector(".queue-close").focus();
    }
});

document.querySelector(".queue-close").addEventListener("click", closeQueue);
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && panel.classList.contains("is-open")) closeQueue();
});

document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.play) selectTrack(button.dataset.play);
    if (button.dataset.view) changeView(button.dataset.view);
    if (button.hasAttribute("data-open-favorites")) changeView("favorites");
    if (button.hasAttribute("data-favorite")) {
        if (favorites.has(current)) favorites.delete(current);
        else favorites.add(current);
        updateFavorites();
        updateCatalog();
    }
});

document.getElementById("search-nav").addEventListener("click", () => {
    if (view !== "Tudo") changeView("Tudo");
    search.focus();
});
search.addEventListener("input", () => {
    updateCatalog();
    main.scrollTop = 0;
});
playButton.addEventListener("click", () => {
    if (audio.paused) void play();
    else audio.pause();
});
document.getElementById("previous").addEventListener("click", () => {
    if (audio.currentTime > 3) audio.currentTime = 0;
    else step(-1);
});
document.getElementById("next").addEventListener("click", () => step(1));
progress.addEventListener("input", () => { audio.currentTime = Number(progress.value); });
volume.addEventListener("input", () => {
    audio.muted = false;
    audio.volume = Number(volume.value);
});
mute.addEventListener("click", () => { audio.muted = !audio.muted; });
repeat.addEventListener("click", () => {
    audio.loop = !audio.loop;
    repeat.setAttribute("aria-pressed", String(audio.loop));
});
shuffle.addEventListener("click", () => {
    const enabled = shuffle.getAttribute("aria-pressed") === "false";
    shuffle.setAttribute("aria-pressed", String(enabled));
    playbackOrder = tracks.map((track) => track.id);
    if (enabled) {
        const remaining = playbackOrder.filter((id) => id !== current);
        for (let i = remaining.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
        }
        playbackOrder = [current, ...remaining];
    }
    updateQueue();
});

audio.addEventListener("ended", () => {
    updatePlayButton();
    step(1, false);
});
audio.addEventListener("volumechange", () => {
    mute.setAttribute("aria-pressed", String(audio.muted));
    mute.setAttribute("aria-label", audio.muted ? "Reativar som" : "Silenciar");
});
audio.addEventListener("play", updatePlayButton);
audio.addEventListener("pause", updatePlayButton);
audio.addEventListener("playing", () => setPlaybackMotion(true));
for (const event of ["pause", "waiting", "ended", "emptied", "error"]) {
    audio.addEventListener(event, () => setPlaybackMotion(false));
}
audio.addEventListener("loadedmetadata", updateTimeline);
audio.addEventListener("timeupdate", updateTimeline);
audio.addEventListener("error", showError);
audio.volume = Number(volume.value);
updateCurrent();
updateTimeline();
