window.HELP_IMPROVE_VIDEOJS = false;

// Interpolation slider: frames are INTERP_BASE/000000.jpg ... (NUM_INTERP_FRAMES - 1).
// Leave NUM_INTERP_FRAMES at 0 to disable.
var INTERP_BASE = "./static/interpolation/stacked";
var NUM_INTERP_FRAMES = 0;

var interp_images = [];

// Real-world comparison viewer. Clips of one task are start-aligned, so they
// play as a group: all start together once buffered, each holds its last
// frame, and the group restarts together after the longest clip ends.
// Result shown over each clip when it finishes (outcomes are hardcoded per
// clip with data-outcome="success|fail" in index.html).
var OUTCOME_ICONS = {
  success: '<svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"/>' +
           '<path d="M15 27l7 7 15-15"/></svg>',
  fail: '<svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"/>' +
        '<path d="M18 18l16 16M34 18L18 34"/></svg>'
};

function showOutcome(video) {
  var figure = $(video).closest('.compare-video');
  var outcome = figure.data('outcome') === 'fail' ? 'fail' : 'success';
  var label = outcome === 'success' ? 'Success' : 'Failed';
  figure.find('.outcome-overlay').remove();
  figure.find('.video-wrap').append(
    '<div class="outcome-overlay is-' + outcome + '">' + OUTCOME_ICONS[outcome] +
    '<span class="outcome-label">' + label + '</span></div>');
  figure.addClass('is-done');
}

function clearOutcomes(panel) {
  $(panel).find('.outcome-overlay').remove();
  $(panel).find('.compare-video').removeClass('is-done');
}

// Seconds all results stay visible before the group restarts.
var RESULT_HOLD_MS = 3000;

// A clip is only loaded while its task is visible; hidden tasks release their
// downloads so bandwidth (and the browser's per-host connections) go to the
// clips being watched.
function loadVideo(v) {
  var source = $(v).find('source');
  if (!source.attr('src') && source.attr('data-src')) {
    source.attr('src', source.attr('data-src'));
    v.preload = 'auto';
    v.load();
  } else if (v.preload === 'none') {
    v.preload = 'auto';
    v.load();
  }
}

function unloadVideo(v) {
  var source = $(v).find('source');
  v.pause();
  if (source.attr('src')) {
    source.attr('data-src', source.attr('src')).removeAttr('src');
    v.removeAttribute('src');
    v.load();
  }
}

// Seconds to wait for every clip before starting without the stragglers; they
// join (and are pulled into sync) as soon as they can play.
var START_TIMEOUT_MS = 8000;

function startTogether(panel) {
  var videos = $(panel).find('video').get();
  var token = {};
  var deadline = Date.now() + START_TIMEOUT_MS;
  $(panel).data('playToken', token);
  clearTimeout($(panel).data('restartTimer'));
  clearOutcomes(panel);
  videos.forEach(function(v) {
    $(v).data('retries', 0);
    loadVideo(v);
    v.pause();
    if (v.readyState > 0) { v.currentTime = 0; }
  });
  var play = function(v) {
    var promise = v.play();
    if (promise !== undefined) { promise.catch(function() {}); }
  };
  var waitUntilReady = function() {
    if ($(panel).data('playToken') !== token) { return; }
    // Paused videos only buffer the current frame, so wait for each seek to
    // finish (HAVE_CURRENT_DATA) rather than for data ahead of it.
    var ready = videos.filter(function(v) { return !v.seeking && v.readyState >= 2; });
    if (ready.length === videos.length || (Date.now() > deadline && ready.length > 0)) {
      ready.forEach(play);
      videos.filter(function(v) { return ready.indexOf(v) < 0; }).forEach(function(v) {
        $(v).one('canplay', function() {
          if ($(panel).data('playToken') === token) { play(v); }
        });
      });
    } else {
      setTimeout(waitUntilReady, 100);
    }
  };
  waitUntilReady();
}

// Retry a clip whose download failed (e.g. a dropped connection).
function retryVideo(v) {
  var panel = $(v).closest('.task-panel');
  var retries = $(v).data('retries') || 0;
  if (panel.hasClass('is-hidden') || retries >= 2) { return; }
  $(v).data('retries', retries + 1);
  setTimeout(function() {
    if (!panel.hasClass('is-hidden')) { v.load(); }
  }, 1000 * (retries + 1));
}

// Keep playing clips in step: if one falls behind (e.g. while buffering),
// move it to the time of the clip furthest along.
function correctDrift(panel) {
  var playing = $(panel).find('video').get().filter(function(v) {
    return !v.paused && !v.ended;
  });
  if (playing.length < 2) { return; }
  var lead = Math.max.apply(null, playing.map(function(v) { return v.currentTime; }));
  playing.forEach(function(v) {
    if (lead - v.currentTime > 0.3 && lead < v.duration) { v.currentTime = lead; }
  });
}

function stopPanel(panel) {
  $(panel).data('playToken', null);
  clearTimeout($(panel).data('restartTimer'));
  clearOutcomes(panel);
  $(panel).find('video').each(function() { unloadVideo(this); });
}

function showTask(task) {
  $('.task-tab').removeClass('is-active');
  $('.task-tab[data-task="' + task + '"]').addClass('is-active');
  $('.task-panel').each(function() {
    var active = $(this).data('task') === task;
    $(this).toggleClass('is-hidden', !active);
    if (active) {
      startTogether(this);
    } else {
      stopPanel(this);
    }
  });
}

function preloadInterpolationImages() {
  for (var i = 0; i < NUM_INTERP_FRAMES; i++) {
    var path = INTERP_BASE + '/' + String(i).padStart(6, '0') + '.jpg';
    interp_images[i] = new Image();
    interp_images[i].src = path;
  }
}

function setInterpolationImage(i) {
  var image = interp_images[i];
  image.ondragstart = function() { return false; };
  image.oncontextmenu = function() { return false; };
  $('#interpolation-image-wrapper').empty().append(image);
}


$(document).ready(function() {
    // Check for click events on the navbar burger icon
    $(".navbar-burger").click(function() {
      // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
      $(".navbar-burger").toggleClass("is-active");
      $(".navbar-menu").toggleClass("is-active");

    });

    $('.task-tab').click(function() {
      showTask($(this).data('task'));
    });
    $('#restart-videos').click(function() {
      startTogether($('.task-panel').not('.is-hidden'));
    });
    // With <source> children, load failures fire "error" on the source.
    $('.task-panel video source').on('error', function() {
      retryVideo($(this).closest('video').get(0));
    });
    $('.task-panel video').on('ended', function() {
      showOutcome(this);
      var panel = $(this).closest('.task-panel');
      if (panel.find('video').get().every(function(v) { return v.ended; })) {
        var token = panel.data('playToken');
        panel.data('restartTimer', setTimeout(function() {
          if (panel.data('playToken') === token && !panel.hasClass('is-hidden')) {
            startTogether(panel);
          }
        }, RESULT_HOLD_MS));
      }
    });
    setInterval(function() {
      correctDrift($('.task-panel').not('.is-hidden'));
    }, 1000);
    // Start the first task once the viewer scrolls into view.
    var firstPanel = $('.task-panel').not('.is-hidden').get(0);
    if (firstPanel && 'IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function(entries) {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          startTogether(firstPanel);
        }
      }, {threshold: 0.25});
      observer.observe(firstPanel);
    } else if (firstPanel) {
      startTogether(firstPanel);
    }

    var options = {
			slidesToScroll: 1,
			slidesToShow: 3,
			loop: true,
			infinite: true,
			autoplay: false,
			autoplaySpeed: 3000,
    }

		// Initialize all div with carousel class
    bulmaCarousel.attach('.carousel', options);

    if (NUM_INTERP_FRAMES > 0 && $('#interpolation-slider').length) {
      preloadInterpolationImages();

      $('#interpolation-slider').on('input', function(event) {
        setInterpolationImage(this.value);
      });
      setInterpolationImage(0);
      $('#interpolation-slider').prop('max', NUM_INTERP_FRAMES - 1);
    }

    bulmaSlider.attach();

})
