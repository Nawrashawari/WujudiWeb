const canvas = document.getElementById("cosmos");
const context = canvas.getContext("2d");
const panels = Array.from(document.querySelectorAll(".panel"));
const thinkButton = document.querySelector(".think-button");
const originDot = document.querySelector(".origin-dot");
const hero = document.querySelector(".hero");
const heroCopy = document.querySelector(".hero-copy");
const periodAnchor = document.querySelector(".period-anchor");

let width = 0;
let height = 0;
let deviceScale = 1;
let scrollProgress = 0;
let targetScrollProgress = 0;
let time = 0;
let points = [];
let settledIndex = 0;
let settledAt = 0;
let isScrollSettled = true;
let scrollSettleTimer;
let introStarted = false;
let introStartedAt = 0;
let introProgress = 0;
let lastScrollY = 0;
let isThinkAdvance = false;

const colors = ["#78d5d7", "#e0bd62", "#d9869f", "#8ccf8a", "#f6f1e8"];
const cellOffsets = [
    [-210, -160],
    [-78, -210],
    [180, -145],
    [-185, -38],
    [24, -70],
    [230, -18],
    [-220, 150],
    [-92, 220],
    [92, 184],
    [210, 140],
    [-42, 74],
    [64, 48]
];

function resize() {
    deviceScale = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = Math.floor(width * deviceScale);
    canvas.height = Math.floor(height * deviceScale);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);

    createPoints();
    updateScroll();
}

function createPoints() {
    const count = Math.round(Math.min(170, Math.max(90, width / 8)));

    points = Array.from({ length: count }, (_, index) => {
        const turn = index * 0.34;
        const radius = 18 + index * (Math.min(width, height) / count) * 0.88;

        return {
            turn,
            radius,
            size: 1 + Math.random() * 2.1,
            speed: 0.06 + Math.random() * 0.18,
            color: colors[index % colors.length],
            phase: Math.random() * Math.PI * 2
        };
    });
}

function updateScroll() {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    targetScrollProgress = window.scrollY / maxScroll;

    if (!introStarted && window.scrollY !== lastScrollY) {
        startIntro();
    }

    lastScrollY = window.scrollY;
    isScrollSettled = false;
    window.clearTimeout(scrollSettleTimer);
    scrollSettleTimer = window.setTimeout(markSettled, 260);
}

function markSettled() {
    const nextSettledIndex = getCurrentPanelIndex();

    if (nextSettledIndex !== settledIndex || !isScrollSettled) {
        settledIndex = nextSettledIndex;
        settledAt = isThinkAdvance ? performance.now() : performance.now() - 2200;
    }

    isScrollSettled = true;
    isThinkAdvance = false;
}

function updateScenes() {
    const currentIndex = getCurrentPanelIndex();
    const settledElapsed = isScrollSettled ? Math.max(0, time - settledAt - 180) : 0;
    const settledProgress = smoothStep(clamp(settledElapsed / 2200, 0, 1));
    const isReturnMorphing = isScrollSettled && panels[currentIndex].classList.contains("final-panel");
    thinkButton.classList.toggle("is-at-return", isReturnMorphing);
    updateIntro();
    updateReturnButton(currentIndex, isReturnMorphing ? settledProgress : 0);

    panels.forEach((panel, index) => {
        const rect = panel.getBoundingClientRect();
        const distance = clamp(rect.top / height, -1, 1);
        const active = 1 - Math.min(1, Math.abs(distance));
        const easedActive = smoothStep(active);
        const scrollDrivenProgress = smoothStep(active);
        const autoProgress = isScrollSettled
            ? (index === settledIndex ? settledProgress : 0)
            : (isThinkAdvance ? 0 : scrollDrivenProgress);
        const transition = autoProgress;
        const isFinal = panel.classList.contains("final-panel");
        const visual = panel.dataset.visual || "";

        if (isFinal) {
            panel.style.setProperty("--panel-opacity", "1");
            panel.style.setProperty("--panel-x", "0px");
            panel.style.setProperty("--panel-y", "0px");
            panel.style.setProperty("--panel-rotate", "0deg");
            panel.style.setProperty("--panel-scale", "1");
        } else {
            const angle = distance * Math.PI * 0.92 + index * 0.36;
            const radius = Math.abs(distance) * Math.min(width, height) * 0.22;
            const x = Math.sin(angle) * radius;
            const y = distance * height * 0.08 + Math.cos(angle) * radius * 0.32;
            const rotate = distance * -34;
            const scale = 0.78 + easedActive * 0.22;
            const opacity = 0.14 + easedActive * 0.86;

            panel.style.setProperty("--panel-opacity", opacity.toFixed(3));
            panel.style.setProperty("--panel-x", `${x.toFixed(2)}px`);
            panel.style.setProperty("--panel-y", `${y.toFixed(2)}px`);
            panel.style.setProperty("--panel-rotate", `${rotate.toFixed(2)}deg`);
            panel.style.setProperty("--panel-scale", scale.toFixed(3));
        }

        panel.style.setProperty("--visual-rotate", `${(transition * 220 + index * 12).toFixed(2)}deg`);
        panel.style.setProperty("--visual-scale", (0.86 + transition * 0.18).toFixed(3));
        panel.style.setProperty("--visual-opacity", (0.45 + transition * 0.55).toFixed(3));
        panel.style.setProperty("--wave-scale", (0.34 + transition * 0.9).toFixed(3));
        panel.style.setProperty("--wave-opacity", (0.18 + transition * 0.82).toFixed(3));
        panel.style.setProperty("--branch-grow", (0.08 + transition * 0.92).toFixed(3));
        panel.style.setProperty("--network-grow", (0.12 + transition * 0.88).toFixed(3));
        const dualDistance = 42 + (1 - transition) * 128;
        const orbitRadius = 92 + transition * 96;
        const orbitAngle = transition * 330 + time * 0.018;

        panel.style.setProperty("--dual-distance", `${dualDistance.toFixed(2)}px`);
        panel.style.setProperty("--dual-distance-negative", `${(-dualDistance).toFixed(2)}px`);
        panel.style.setProperty("--replace-a", (0.28 + Math.abs(Math.sin(transition * Math.PI)) * 0.72).toFixed(3));
        panel.style.setProperty("--replace-b", (1 - Math.abs(Math.sin(transition * Math.PI)) * 0.62).toFixed(3));
        panel.style.setProperty("--orbit-angle", `${orbitAngle.toFixed(2)}deg`);
        panel.style.setProperty("--orbit-angle-b", `${(-orbitAngle + 160).toFixed(2)}deg`);
        panel.style.setProperty("--orbit-radius", `${orbitRadius.toFixed(2)}px`);
        panel.style.setProperty("--orbit-radius-b", `${(orbitRadius * 0.72).toFixed(2)}px`);
        panel.style.setProperty("--orbit-scale", (0.74 + transition * 0.28).toFixed(3));
        panel.style.setProperty("--orbit-tilt", `${(transition * 64 - 18).toFixed(2)}deg`);
        const mirrorDistance = 34 + (1 - transition) * 156;
        panel.style.setProperty("--mirror-distance", `${mirrorDistance.toFixed(2)}px`);
        panel.style.setProperty("--mirror-distance-negative", `${(-mirrorDistance).toFixed(2)}px`);
        panel.style.setProperty("--mirror-return", `${(12 + transition * 58).toFixed(2)}deg`);
        panel.style.setProperty("--auto-progress", transition.toFixed(3));
        panel.style.setProperty("--orbit-glow", `${(18 + transition * 46).toFixed(2)}px`);
        panel.style.setProperty("--dual-glow", `${(48 + transition * 56).toFixed(2)}px`);
        panel.style.setProperty("--orbit-core-scale", (0.7 + transition * 0.65).toFixed(3));
        panel.style.setProperty("--dual-core-scale", (0.82 + transition * 0.24).toFixed(3));
        panel.style.setProperty("--cell-ring-scale", (0.7 + transition * 0.4).toFixed(3));
        panel.style.setProperty("--mirror-ring-opacity", (transition * 0.8).toFixed(3));
        panel.style.setProperty("--mirror-ring-scale", (0.45 + transition * 0.82).toFixed(3));

        if (visual === "gather") {
            panel.style.setProperty("--visual-rotate", `${(index * 12 + transition * 64).toFixed(2)}deg`);
            panel.style.setProperty("--visual-scale", (0.82 + transition * 0.3).toFixed(3));
            panel.style.setProperty("--self-opacity", Math.max(0, (transition - 0.58) / 0.42).toFixed(3));
            panel.style.setProperty("--self-scale", (0.42 + transition * 0.78).toFixed(3));
            const scatter = 1 - transition;
            const cells = panel.querySelectorAll(".cell-visual span");

            cells.forEach((cell, cellIndex) => {
                const [offsetX, offsetY] = cellOffsets[cellIndex] || [0, 0];
                cell.style.setProperty("--cell-x", `${(offsetX * scatter).toFixed(2)}px`);
                cell.style.setProperty("--cell-y", `${(offsetY * scatter).toFixed(2)}px`);
                cell.style.setProperty("--cell-scale", (0.68 + transition * 1.18).toFixed(3));
            });
        }

        if (visual === "replace") {
            panel.style.setProperty("--visual-rotate", `${(transition * 12).toFixed(2)}deg`);
            panel.style.setProperty("--visual-scale", "1");
        }

        if (visual === "dual") {
            panel.style.setProperty("--visual-rotate", `${(transition * 18).toFixed(2)}deg`);
        }

        if (visual === "orbit") {
            panel.style.setProperty("--visual-rotate", `${(transition * 42).toFixed(2)}deg`);
            panel.style.setProperty("--visual-scale", (0.78 + transition * 0.28).toFixed(3));
        }

        if (visual === "mirror") {
            panel.style.setProperty("--visual-rotate", `${(transition * -18).toFixed(2)}deg`);
            panel.style.setProperty("--visual-scale", (0.82 + transition * 0.2).toFixed(3));
        }
    });
}

function updateReturnButton(currentIndex, progress) {
    const finalPanel = panels[panels.length - 1];
    const isAtReturn = finalPanel && currentIndex === panels.length - 1;
    const finalTitle = finalPanel ? finalPanel.querySelector("h2") : null;

    if (!isAtReturn || !finalTitle) {
        thinkButton.style.setProperty("--return-button-x", "0px");
        thinkButton.style.setProperty("--return-button-y", "0px");
        thinkButton.style.setProperty("--think-font-size", "");
        finalPanel?.style.setProperty("--return-h2-opacity", "0");
        finalPanel?.style.setProperty("--return-detail-opacity", "0");
        finalPanel?.style.setProperty("--return-detail-y", "18px");
        return;
    }

    const titleRect = finalTitle.getBoundingClientRect();
    const buttonStyle = window.getComputedStyle(thinkButton);
    const buttonBottom = parseFloat(buttonStyle.bottom) || 24;
    const buttonBaseY = height - buttonBottom - thinkButton.offsetHeight / 2;
    const targetX = titleRect.left + titleRect.width / 2 - width / 2;
    const targetY = titleRect.top + titleRect.height / 2 - buttonBaseY;
    const titleFontSize = parseFloat(window.getComputedStyle(finalTitle).fontSize);
    const baseFontSize = 13.76;
    const labelProgress = smoothStep(clamp(progress / 0.72, 0, 1));
    const detailProgress = smoothStep(clamp((progress - 0.62) / 0.38, 0, 1));
    const fontSize = baseFontSize + (titleFontSize - baseFontSize) * labelProgress;

    thinkButton.style.setProperty("--return-button-x", `${(targetX * labelProgress).toFixed(2)}px`);
    thinkButton.style.setProperty("--return-button-y", `${(targetY * labelProgress).toFixed(2)}px`);
    thinkButton.style.setProperty("--think-font-size", `${fontSize.toFixed(2)}px`);
    finalPanel.style.setProperty("--return-h2-opacity", "0");
    finalPanel.style.setProperty("--return-detail-opacity", detailProgress.toFixed(3));
    finalPanel.style.setProperty("--return-detail-y", `${((1 - detailProgress) * 18).toFixed(2)}px`);
}

function startIntro() {
    if (introStarted) return;

    introStarted = true;
    introStartedAt = performance.now();
}

function updateIntro() {
    if (introStarted) {
        introProgress = smoothStep(clamp((time - introStartedAt) / 1700, 0, 1));
    }

    const dotTarget = getOriginDotTarget();
    const centerX = width / 2;
    const centerY = height / 2;
    const targetSize = dotTarget.size;
    const startSize = Math.min(Math.max(width * 0.18, 150), 260);
    const currentX = centerX + (dotTarget.x - centerX) * introProgress;
    const currentY = centerY + (dotTarget.y - centerY) * introProgress;
    const currentSize = startSize + (targetSize - startSize) * introProgress;
    const copyProgress = smoothStep(clamp((introProgress - 0.34) / 0.66, 0, 1));

    originDot.style.setProperty("--origin-x", `${currentX.toFixed(2)}px`);
    originDot.style.setProperty("--origin-y", `${currentY.toFixed(2)}px`);
    originDot.style.setProperty("--origin-size", `${currentSize.toFixed(2)}px`);
    originDot.style.setProperty("--origin-scale", (1 - introProgress * 0.08).toFixed(3));
    originDot.style.setProperty("--origin-opacity", hero.getBoundingClientRect().bottom > 0 ? "1" : "0");
    heroCopy.style.setProperty("--intro-copy-opacity", copyProgress.toFixed(3));
    heroCopy.style.setProperty("--intro-copy-y", `${((1 - copyProgress) * 18).toFixed(2)}px`);
}

function getOriginDotTarget() {
    if (!periodAnchor) {
        return { x: width / 2, y: height / 2, size: 16 };
    }

    const rect = periodAnchor.getBoundingClientRect();
    const fontSize = parseFloat(window.getComputedStyle(periodAnchor).fontSize) || 96;
    const size = Math.max(12, fontSize * 0.18);

    return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        size
    };
}

function getCurrentPanelIndex() {
    let closestIndex = 0;
    let closestDistance = Infinity;

    panels.forEach((panel, index) => {
        const distance = Math.abs(panel.getBoundingClientRect().top);

        if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
        }
    });

    return closestIndex;
}

function advanceThought() {
    if (!introStarted) {
        startIntro();
        return;
    }

    const currentIndex = getCurrentPanelIndex();
    const nextIndex = currentIndex >= panels.length - 1 ? 0 : currentIndex + 1;

    isThinkAdvance = true;
    panels[nextIndex].scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

function drawBackground() {
    context.clearRect(0, 0, width, height);

    const centerX = width * 0.5;
    const centerY = height * 0.5;
    const scrollTurn = scrollProgress * Math.PI * 11;
    const pulse = Math.sin(time * 0.00075) * 0.5 + 0.5;

    const gradient = context.createRadialGradient(centerX, centerY, 20, centerX, centerY, Math.max(width, height) * 0.78);
    gradient.addColorStop(0, `rgba(120, 213, 215, ${0.09 + pulse * 0.035})`);
    gradient.addColorStop(0.35, "rgba(224, 189, 98, 0.055)");
    gradient.addColorStop(0.7, "rgba(217, 134, 159, 0.04)");
    gradient.addColorStop(1, "rgba(9, 10, 13, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    context.save();
    context.translate(centerX, centerY);
    context.rotate(scrollTurn * 0.14);

    drawSpiral(scrollTurn);
    drawOrbitingPoints(scrollTurn);

    context.restore();
}

function drawSpiral(scrollTurn) {
    context.lineWidth = 1.12;

    for (let arm = 0; arm < 3; arm += 1) {
        context.beginPath();
        const armOffset = (Math.PI * 2 * arm) / 3;

        for (let index = 0; index < 460; index += 1) {
            const t = index / 27;
            const radius = 8 + t * Math.min(width, height) * 0.018;
            const angle = t * 0.72 + armOffset + scrollTurn * 0.3;
            const wobble = Math.sin(t * 0.55 + time * 0.0005) * 5.4;
            const x = Math.cos(angle) * (radius + wobble);
            const y = Math.sin(angle) * (radius + wobble) * 0.72;

            if (index === 0) {
                context.moveTo(x, y);
            } else {
                context.lineTo(x, y);
            }
        }

        context.strokeStyle = arm === 0
            ? "rgba(120, 213, 215, 0.25)"
            : arm === 1
                ? "rgba(224, 189, 98, 0.2)"
                : "rgba(217, 134, 159, 0.18)";
        context.stroke();
    }
}

function drawOrbitingPoints(scrollTurn) {
    points.forEach((point, index) => {
        const drift = Math.sin(time * 0.00042 * point.speed + point.phase) * 12;
        const angle = point.turn + scrollTurn + time * 0.00006 * point.speed;
        const radius = point.radius + drift;
        const perspective = 0.58 + Math.sin(angle + scrollProgress * Math.PI * 2) * 0.2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius * perspective;
        const distanceFade = 1 - Math.min(1, radius / (Math.max(width, height) * 0.72));
        const alpha = Math.max(0, distanceFade) * (0.22 + Math.sin(time * 0.00075 + index) * 0.09);

        if (alpha <= 0) return;

        context.beginPath();
        context.fillStyle = hexToRgba(point.color, alpha);
        context.arc(x, y, point.size, 0, Math.PI * 2);
        context.fill();
    });
}

function hexToRgba(hex, alpha) {
    const clean = hex.replace("#", "");
    const value = parseInt(clean, 16);
    const red = (value >> 16) & 255;
    const green = (value >> 8) & 255;
    const blue = value & 255;
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
}

function smoothStep(value) {
    return value * value * (3 - 2 * value);
}

function animate(now) {
    time = now;
    scrollProgress += (targetScrollProgress - scrollProgress) * 0.12;
    updateScenes();
    drawBackground();
    requestAnimationFrame(animate);
}

window.addEventListener("resize", resize);
window.addEventListener("scroll", updateScroll, { passive: true });
thinkButton.addEventListener("click", advanceThought);

resize();
markSettled();
requestAnimationFrame(animate);
