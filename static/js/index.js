(() => {
  "use strict";

  const taskLabels = {
    "close-drawer": "Close drawer",
    "lower-toilet-lid": "Lower toilet lid",
    "turn-on-lamp": "Turn on lamp"
  };

  const methodLabels = {
    tonav: "TONAV",
    dp: "DP",
    act: "ACT",
    internnav: "InternNav",
    streamvln: "StreamVLN"
  };

  const videoRoot = "static/videos/experiments";
  const experimentAssetVersion = "20260821-3";

  function setupWorksMenu() {
    const trigger = document.querySelector(".works-trigger");
    const menu = document.querySelector(".works-menu");

    if (!trigger || !menu) {
      return;
    }

    const closeMenu = () => {
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    };

    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const willOpen = menu.hidden;
      menu.hidden = !willOpen;
      trigger.setAttribute("aria-expanded", String(willOpen));
    });

    document.addEventListener("click", (event) => {
      if (!menu.hidden && !menu.contains(event.target)) {
        closeMenu();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeMenu();
        trigger.focus();
      }
    });
  }

  function setupExperimentBrowser() {
    const browser = document.querySelector("[data-experiment-browser]");

    if (!browser) {
      return;
    }

    const modeButtons = [...browser.querySelectorAll("[data-mode]")];
    const taskButtons = [...browser.querySelectorAll("[data-task]")];
    const panels = [...browser.querySelectorAll("[data-panel]")];
    const comparisonMethodButtons = [...browser.querySelectorAll("[data-method]")];
    const teledataMethodButtons = [...browser.querySelectorAll("[data-teledata-method]")];
    const ablationVideos = [...browser.querySelectorAll("[data-ablation-video]")];
    const comparisonVideos = [...browser.querySelectorAll("[data-comparison-video]")];
    const endtoendVideo = browser.querySelector("[data-endtoend-video]");
    const teledataVideo = browser.querySelector("[data-teledata-video]");
    const syncButton = browser.querySelector("[data-sync-toggle]");
    const syncRange = browser.querySelector("[data-sync-range]");
    const syncTime = browser.querySelector("[data-sync-time]");

    let activeMode = "comparison";
    let activeTask = "close-drawer";
    let activeMethod = "tonav";
    let activeTeledataMethod = "tonav";
    let seeking = false;

    function pauseAllVideos() {
      browser.querySelectorAll("video").forEach((video) => video.pause());
      updateSyncButton(false);
    }

    function setVideoSource(video, sourcePath) {
      if (!video) {
        return;
      }

      const source = video.querySelector("source");
      const versionedSourcePath = `${sourcePath}?v=${experimentAssetVersion}`;
      const absolutePath = new URL(versionedSourcePath, document.baseURI).href;
      video.poster = `${sourcePath.replace(/\.mp4$/i, ".jpg")}?v=${experimentAssetVersion}`;

      if (source && source.src === absolutePath) {
        return;
      }

      video.pause();
      video.removeAttribute("src");
      if (source) {
        source.src = versionedSourcePath;
      }
      video.load();
    }

    function setActiveButtons(buttons, attribute, value) {
      buttons.forEach((button) => {
        const active = button.dataset[attribute] === value;
        button.classList.toggle("is-active", active);
        if (button.hasAttribute("role") && button.getAttribute("role") === "tab") {
          button.setAttribute("aria-selected", String(active));
        }
      });
    }

    function updateMode() {
      setActiveButtons(modeButtons, "mode", activeMode);
      panels.forEach((panel) => {
        const active = panel.dataset.panel === activeMode;
        panel.hidden = !active;
        panel.classList.toggle("is-active", active);
      });
      pauseAllVideos();
    }

    function updateEndtoend() {
      const label = taskLabels[activeTask];
      setVideoSource(endtoendVideo, `${videoRoot}/endtoend/${activeTask}.mp4`);
      browser.querySelector("[data-endtoend-title]").textContent = label;
      browser.querySelector("[data-endtoend-caption]").textContent = label;
    }

    function updateComparison() {
      const taskLabel = taskLabels[activeTask];
      const methodLabel = methodLabels[activeMethod];
      browser.querySelector("[data-comparison-title]").textContent = taskLabel;

      comparisonVideos.forEach((video) => {
        const condition = video.dataset.comparisonVideo;
        const sourcePath = `${videoRoot}/comparison/${activeTask}/${activeMethod}-${condition}.mp4`;
        setVideoSource(video, sourcePath);
        const caption = browser.querySelector(`[data-comparison-caption="${condition}"]`);
        if (caption) {
          caption.textContent = `${methodLabel} · ${taskLabel}`;
        }
      });

      if (syncRange) {
        syncRange.value = "0";
      }
      if (syncTime) {
        syncTime.textContent = "00:00";
      }
      updateSyncButton(false);
    }

    function updateTeledata() {
      const taskLabel = taskLabels[activeTask];
      const methodLabel = methodLabels[activeTeledataMethod];
      setVideoSource(
        teledataVideo,
        `${videoRoot}/teledata/${activeTask}/${activeTeledataMethod}.mp4`
      );
      browser.querySelector("[data-teledata-title]").textContent = taskLabel;
      browser.querySelector("[data-teledata-caption]").textContent = `${methodLabel} · ${taskLabel}`;
    }

    function updateAblation() {
      const taskLabel = taskLabels[activeTask];
      const title = browser.querySelector("[data-ablation-title]");

      if (title) {
        title.textContent = taskLabel;
      }

      ablationVideos.forEach((video) => {
        const method = video.dataset.ablationVideo;
        setVideoSource(
          video,
          `${videoRoot}/teledata/navigation-ablation/${activeTask}/${method}/run-1.mp4`
        );
      });
    }

    function updateTask() {
      setActiveButtons(taskButtons, "task", activeTask);
      updateEndtoend();
      updateComparison();
      updateTeledata();
      updateAblation();
    }

    function updateSyncButton(playing) {
      if (!syncButton) {
        return;
      }

      const symbol = syncButton.querySelector("[data-sync-symbol]");
      const label = syncButton.querySelector("[data-sync-label]");
      if (symbol) {
        symbol.textContent = playing ? "Ⅱ" : "▶";
      }
      if (label) {
        label.textContent = playing ? "Pause both" : "Play both";
      }
    }

    function formatTime(seconds) {
      if (!Number.isFinite(seconds) || seconds < 0) {
        return "00:00";
      }
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
    }

    function updateSyncProgress() {
      if (seeking || !syncRange || !syncTime || comparisonVideos.length === 0) {
        return;
      }

      const reference = comparisonVideos[0];
      const duration = reference.duration;
      const ratio = Number.isFinite(duration) && duration > 0 ? reference.currentTime / duration : 0;
      syncRange.value = String(Math.round(Math.max(0, Math.min(1, ratio)) * 1000));
      syncTime.textContent = formatTime(reference.currentTime);
    }

    modeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        activeMode = button.dataset.mode;
        updateMode();
      });
    });

    taskButtons.forEach((button) => {
      button.addEventListener("click", () => {
        activeTask = button.dataset.task;
        updateTask();
      });
    });

    comparisonMethodButtons.forEach((button) => {
      button.addEventListener("click", () => {
        activeMethod = button.dataset.method;
        setActiveButtons(comparisonMethodButtons, "method", activeMethod);
        updateComparison();
      });
    });

    teledataMethodButtons.forEach((button) => {
      button.addEventListener("click", () => {
        activeTeledataMethod = button.dataset.teledataMethod;
        setActiveButtons(teledataMethodButtons, "teledataMethod", activeTeledataMethod);
        updateTeledata();
      });
    });

    if (syncButton) {
      syncButton.addEventListener("click", async () => {
        const anyPlaying = comparisonVideos.some((video) => !video.paused && !video.ended);

        if (anyPlaying) {
          comparisonVideos.forEach((video) => video.pause());
          updateSyncButton(false);
          return;
        }

        const reference = comparisonVideos[0];
        comparisonVideos.slice(1).forEach((video) => {
          if (Number.isFinite(reference.currentTime)) {
            video.currentTime = Math.min(reference.currentTime, video.duration || reference.currentTime);
          }
        });
        await Promise.allSettled(comparisonVideos.map((video) => video.play()));
        updateSyncButton(comparisonVideos.some((video) => !video.paused));
      });
    }

    if (syncRange) {
      syncRange.addEventListener("input", () => {
        seeking = true;
        const ratio = Number(syncRange.value) / 1000;
        comparisonVideos.forEach((video) => {
          if (Number.isFinite(video.duration) && video.duration > 0) {
            video.currentTime = ratio * video.duration;
          }
        });
        const reference = comparisonVideos[0];
        syncTime.textContent = formatTime(reference.currentTime);
      });

      syncRange.addEventListener("change", () => {
        seeking = false;
        updateSyncProgress();
      });
    }

    comparisonVideos.forEach((video) => {
      video.addEventListener("timeupdate", updateSyncProgress);
      video.addEventListener("play", () => updateSyncButton(true));
      video.addEventListener("pause", () => {
        if (comparisonVideos.every((item) => item.paused)) {
          updateSyncButton(false);
        }
      });
      video.addEventListener("ended", () => {
        if (comparisonVideos.every((item) => item.ended || item.paused)) {
          updateSyncButton(false);
        }
      });
    });

    setActiveButtons(comparisonMethodButtons, "method", activeMethod);
    setActiveButtons(teledataMethodButtons, "teledataMethod", activeTeledataMethod);
    updateTask();
    updateMode();
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupWorksMenu();
    setupExperimentBrowser();
  });
})();
